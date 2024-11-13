import inquirer from 'inquirer';
import { FormatType } from '../../domain/formatter/types.js';
import { FileChange } from '../../types/index.js';
import chalk from 'chalk';

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
    return inquirer.prompt<{ fromRef: string; toRef: string; usePattern: boolean; pattern?: string }>([
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
        default: 'main',
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
    return inquirer.prompt<{
      type: FormatType;
      showIcons: boolean;
    }>([
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
      {
        type: 'confirm',
        name: 'showIcons',
        message: 'Show icons in output?',
        default: true,
      },
    ]);
  }

  async showFileSelectionPrompt(files: FileChange[]) {
    const { action } = await inquirer.prompt<{
      action: { type: 'file' | 'back' | 'exit'; path?: string };
    }>([
      {
        type: 'list',
        name: 'action',
        message: 'Select a file to view details or choose an action:',
        choices: [
          ...files.map((file) => ({
            name: `${file.path} (${chalk.green('+' + file.insertions)} / ${chalk.red('-' + file.deletions)})`,
            value: { type: 'file' as const, path: file.path },
          })),
          { name: 'Back to main menu', value: { type: 'back' as const } },
          { name: 'Exit', value: { type: 'exit' as const } },
        ],
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
          { name: 'Confirm sync [Enter]', value: 'confirm' },
          { name: 'Skip file [Esc]', value: 'skip' },
          { name: 'View next diff [→]', value: 'next' },
          { name: 'View previous diff [←]', value: 'prev' },
          { name: 'Go to file list', value: 'list' },
        ],
      },
    ]);
  }

  private validateNonEmpty(fieldName: string) {
    return (value: string) => {
      if (!value || value.trim().length === 0) {
        return `${fieldName} cannot be empty`;
      }
      return true;
    };
  }
}