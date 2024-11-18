import inquirer from 'inquirer';
import { FormatType } from '../../domain/formatter/types.js';
import { FileChange, GitRefs } from '../../types/index.js';
import chalk from 'chalk';
import { ValidationUtils } from '../../utils/validation.js';

export class PromptService {
  async getCompareOptions() {
    const modeAnswer = await inquirer.prompt<{ compareMode: 'commits' | 'directories' }>([
      {
        type: 'list',
        name: 'compareMode',
        message: 'Select comparison mode:',
        choices: [
          { name: 'Compare directories', value: 'directories' },
          { name: 'Compare commits/branches', value: 'commits' },
        ],
      },
    ]);

    if (modeAnswer.compareMode === 'commits') {
      return this.getCommitCompareOptions();
    }
    return this.getDirectoryCompareOptions();
  }

  private async getCommitCompareOptions() {
    return inquirer.prompt<GitRefs & { usePattern: boolean; pattern?: string }>([
      {
        type: 'input',
        name: 'fromRef',
        message: 'Enter the starting reference (fromRef):',
        validate: this.validateNonEmpty('Starting reference'),
      },
      {
        type: 'input',
        name: 'toRef',
        message: 'Enter the ending reference (toRef):',
        validate: this.validateNonEmpty('Ending reference'),
      },
      {
        type: 'confirm',
        name: 'usePattern',
        message: 'Do you want to filter files by pattern?',
        default: false,
      },
      {
        type: 'input',
        name: 'pattern',
        message: 'Enter file pattern (e.g., "*.ts"):',
        when: (answers) => answers.usePattern,
      },
    ]);
  }

  private async getDirectoryCompareOptions() {
    const answers = await inquirer.prompt<{
      baseBranch: string;
      fromDir: string;
      toDir: string;
      pattern?: string;
    }>([
      {
        type: 'input',
        name: 'baseBranch',
        message: 'Enter the base branch:',
        // TODO: Get the default branch from current branch
        default: 'master',
        validate: this.validateNonEmpty('Base branch'),
      },
      {
        type: 'input',
        name: 'fromDir',
        message: 'Enter the first directory path:',
        validate: this.validateNonEmpty('Directory path'),
      },
      {
        type: 'input',
        name: 'toDir',
        message: 'Enter the second directory path:',
        validate: this.validateNonEmpty('Directory path'),
      },
    ]);

    return {
      fromRef: `${answers.baseBranch}:${answers.fromDir}`,
      toRef: `${answers.baseBranch}:${answers.toDir}`,
      pattern: answers.pattern,
    };
  }

  async getFormatOptions() {
    return inquirer.prompt<{ type: FormatType }>([
      {
        type: 'list',
        name: 'type',
        message: 'Select output format:',
        choices: [
          { name: 'Tree view', value: FormatType.TREE },
          { name: 'Plain text', value: FormatType.PLAIN },
          { name: 'JSON', value: FormatType.JSON },
        ],
      },
    ]);
  }

  async getShowDetailsPrompt(files: FileChange[], lastSelectedPath?: string) {
    const fileChoices = files.map((file) => ({
      name: `${file.path} (${chalk.green('+' + file.insertions)} / ${chalk.red('-' + file.deletions)})`,
      value: { type: 'file' as const, path: file.path },
    }));

    const { action } = await inquirer.prompt<{
      action: { type: 'file' | 'back' | 'exit'; path?: string };
    }>([
      {
        type: 'list',
        name: 'action',
        message: 'Select File to view details:',
        choices: [
          new inquirer.Separator(chalk.dim('─'.repeat(50))),

          ...fileChoices,

          new inquirer.Separator(chalk.dim('─'.repeat(50))),

          { name: 'Back to list view', value: { type: 'back' as const } },
          { name: 'Exit', value: { type: 'exit' as const } },
        ],
        default: fileChoices.find((f) => f.value.path === lastSelectedPath)?.value,
        loop: false,
        pageSize: 20,
      },
    ]);

    return action;
  }

  async getSyncActionPrompt(filePath: string) {
    return inquirer.prompt<{ action: 'confirm' | 'skip' | 'next' | 'prev' | 'list' }>([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold(`\nCurrent file: ${filePath}\nStatus: Reviewing changes\n\nChoose action:`),
        choices: [
          // TODO: short key bindings ['Enter', 'Esc', '→', '←', 'l']
          { name: 'Confirm sync', value: 'confirm' },
          { name: 'Skip file', value: 'skip' },
          { name: 'View next diff', value: 'next' },
          { name: 'View previous diff', value: 'prev' },
          { name: 'Go to file list', value: 'list' },
        ],
        loop: false,
        pageSize: 5,
      },
    ]);
  }

  async getContinuePrompt() {
    return inquirer.prompt<{ shouldContinue: boolean }>([
      {
        type: 'confirm',
        name: 'shouldContinue',
        message: 'Do you want to continue with next file?',
        default: true,
      },
    ]);
  }

  private validateNonEmpty(fieldName: string) {
    return (value: string) => {
      try {
        ValidationUtils.validateNonEmpty(value, fieldName);
        return true;
      } catch (error) {
        return (error as Error).message;
      }
    };
  }
}
