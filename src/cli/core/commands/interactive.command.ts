// src/cli/core/commands/interactive.command.ts
import inquirer from 'inquirer';
import { DiffService, SyncService } from '../../../services/index.js';
import { PromptService } from '../prompt.service.js';
import chalk from 'chalk';
import { FileChange } from '../../../types/index.js';
import ora from 'ora';

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface InteractiveCommandOptions {
  sync?: boolean;
}

export class InteractiveCommand {
  private promptService: PromptService;

  constructor(
    private readonly diffService: DiffService,
    private readonly syncService: SyncService,
    private readonly options: InteractiveCommandOptions
  ) {
    this.promptService = new PromptService();
  }

  async execute(): Promise<void> {
    console.clear();

    // 사용자 입력 받기
    const { fromRef, toRef, pattern } = await this.promptService.getCompareOptions();
    const formatOptions = await this.promptService.getFormatOptions();

    // 분석 수행
    const result = await this.diffService.compare({
      fromRef,
      toRef,
      filterPattern: pattern,
      formatOptions,
    });

    // 결과 출력
    console.clear();
    console.log(chalk.bold('\nAnalysis Results:'));
    console.log(result.formatted);

    // 동기화 옵션이 활성화된 경우
    if (this.options.sync) {
      await this.handleSyncWorkflow(result.analysis.changes, { fromRef, toRef });
    } else {
      await this.promptService.showFileSelectionPrompt(result.analysis.changes);
    }
  }

  private async handleSyncWorkflow(changes: FileChange[], refs: { fromRef: string; toRef: string }): Promise<void> {
    const spinner = ora();
    let currentIndex = 0;
    const totalFiles = changes.length;

    while (currentIndex < totalFiles) {
      const currentFile = changes[currentIndex];
      console.clear();
      console.log(chalk.bold(`\nProcessing file ${currentIndex + 1}/${totalFiles}`));
      console.log(chalk.cyan(`File: ${currentFile.path}`));
      console.log(chalk.dim('─'.repeat(process.stdout.columns)));

      try {
        // VSCode로 diff 보여주기
        spinner.start('Opening diff view...');
        await this.openDiffInVSCode(currentFile);
        spinner.succeed('Diff view opened');

        // 사용자 액션 받기
        const { action } = await this.promptService.getSyncActionPrompt(currentFile.path);

        switch (action) {
          case 'confirm': {
            spinner.start('Synchronizing file...');
            await this.syncService.syncFile({
              targetPath: currentFile.path,
              fromRef: refs.fromRef,
              toRef: refs.toRef,
            });
            spinner.succeed('File synchronized');
            currentIndex++;
            break;
          }

          case 'skip':
            spinner.info('Skipped file');
            currentIndex++;
            break;

          case 'next':
            if (currentIndex < totalFiles - 1) currentIndex++;
            break;

          case 'prev':
            if (currentIndex > 0) currentIndex--;
            break;

          case 'list':
            return;
        }
      } catch (error) {
        spinner.fail('Error processing file');
        console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);

        const { shouldContinue } = await inquirer.prompt<{ shouldContinue: boolean }>([
          {
            type: 'confirm',
            name: 'shouldContinue',
            message: 'Do you want to continue with next file?',
            default: true,
          },
        ]);

        if (!shouldContinue) return;
        currentIndex++;
      }
    }

    console.log(chalk.green('\nSync workflow completed!'));
  }

  private async openDiffInVSCode(file: FileChange): Promise<void> {
    // FIXME: VSCode 통합 로직은 별도 서비스로 분리하는 것이 좋을 듯;;
    const command = `code --diff "${file.path}"`;
    await execAsync(command);
  }
}
