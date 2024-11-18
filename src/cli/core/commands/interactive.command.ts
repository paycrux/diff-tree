// src/cli/core/commands/interactive.command.ts
import ora from 'ora';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { PromptService } from '../prompt.service.js';
import { DiffService, SyncService } from '../../../services/index.js';
import { FileChange, GitRefs } from '../../../types/index.js';
import { FormatType } from '../../../domain/formatter/types.js';
import { VSCodeService } from '../../../services/vscode.service.js';

const execAsync = promisify(exec);

export interface InteractiveCommandOptions {
  sync?: boolean;
}

export class InteractiveCommand {
  private promptService: PromptService;
  private readonly vscodeService: VSCodeService;
  private lastFormatOption: { type: FormatType };

  constructor(
    private readonly diffService: DiffService,
    private readonly syncService: SyncService,
    private readonly options: InteractiveCommandOptions
  ) {
    this.promptService = new PromptService();
    this.vscodeService = new VSCodeService();
    this.lastFormatOption = { type: FormatType.TREE };
  }

  async execute(): Promise<void> {
    // 사용자 입력 받기
    const { fromRef, toRef, pattern } = await this.promptService.getCompareOptions();
    this.lastFormatOption = await this.promptService.getFormatOptions(); // 저장

    await this.handleMainFlow({ fromRef, toRef, pattern, formatOptions: this.lastFormatOption });
  }

  private async handleMainFlow(options: {
    fromRef: string;
    toRef: string;
    pattern?: string;
    formatOptions: { type: FormatType };
  }): Promise<void> {
    const { fromRef, toRef, pattern, formatOptions } = options;

    // 분석 수행
    const result = await this.diffService.compare({
      fromRef,
      toRef,
      filterPattern: pattern,
      formatOptions,
    });

    // 결과 출력
    console.clear();
    console.log(result.formatted);

    if (this.options.sync) await this.handleSyncWorkflow(result.analysis.changes, { fromRef, toRef });
    else await this.handleDetailsFlow(result.analysis.changes, { fromRef, toRef });
  }

  private async handleDetailsFlow(files: FileChange[], refs: GitRefs, currentPath?: string): Promise<void> {
    while (true) {
      if (currentPath) {
        // 파일 상세 내용 표시
        console.clear();
        const output = await this.diffService.viewFileDetails(currentPath, refs);
        console.log(output);
      }

      // 다음 액션 선택
      const action = await this.promptService.getShowDetailsPrompt(files, currentPath);

      switch (action.type) {
        case 'file':
          currentPath = action.path;
          break;

        case 'back':
          console.clear();
          await this.handleMainFlow({
            fromRef: refs.fromRef,
            toRef: refs.toRef,
            formatOptions: { type: this.lastFormatOption.type },
          });
          return;

        case 'exit':
          return;
      }
    }
  }

  private async handleSyncWorkflow(changes: FileChange[], refs: GitRefs): Promise<void> {
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
        await this.vscodeService.openDiff({
          fromRef: refs.fromRef,
          toRef: refs.toRef,
          filePath: currentFile.path,
          workspacePath: process.cwd(),
        });
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

        const { shouldContinue } = await this.promptService.getContinuePrompt();

        if (!shouldContinue) return;
        currentIndex++;
      }
    }

    console.log(chalk.green('\nSync workflow completed!'));
  }
}
