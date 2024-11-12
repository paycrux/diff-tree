import inquirer, { Answers } from 'inquirer';
import { PROMPT_CONFIG, validators } from './config.js';
import { FormatType } from '../formatters/types.js';
import { FileChange } from '../types/index.js';
import chalk from 'chalk';

// 기본 타입 정의
type CompareMode = 'directories' | 'commits';

// Prompt 결과 타입들을 명시적으로 정의
interface ModeSelectionResult extends Answers {
  compareMode: CompareMode;
}

interface FormatSelectionResult extends Answers {
  format: FormatType;
}

interface CompareCommitResult extends Answers {
  fromRef: string;
  toRef: string;
}

interface CompareDirectoryResult extends Answers {
  baseBranch: string;
  fromDir: string;
  toDir: string;
}

interface PatternFilterResult extends Answers {
  usePattern: boolean;
  pattern?: string;
}

interface ChoiceChangedFileResult extends Answers {
  action: { type: 'file'; path: string } | { type: 'back' } | { type: 'exit' };
}

interface SyncActionResult extends Answers {
  action: 'confirm' | 'skip' | 'next' | 'prev' | 'list';
}

// Prompt 함수들의 반환 타입을 명시적으로 정의
type PromptFunctions = {
  modeSelection: () => Promise<ModeSelectionResult>;
  formatSelection: () => Promise<FormatSelectionResult>;
  compareCommit: () => Promise<CompareCommitResult>;
  compareDirectory: () => Promise<CompareDirectoryResult>;
  usePatternFilter: () => Promise<PatternFilterResult>;
  choiceChangedFile: (files: FileChange[]) => Promise<ChoiceChangedFileResult>;
  syncActionPrompt: (filePath: string) => Promise<SyncActionResult>;
  getDirectoryCompareAnswers: () => Promise<CompareDirectoryResult & { fromRef: string; toRef: string }>;
};

export const createPrompt = (): PromptFunctions => {
  const modeSelection = () =>
    inquirer.prompt<ModeSelectionResult>([
      {
        type: 'list',
        name: 'compareMode',
        message: 'Select comparison mode:',
        choices: [
          {
            name: 'Compare directories',
            value: 'directories',
            short: 'Directories',
          },
          {
            name: 'Compare commits/branches',
            value: 'commits',
            short: 'Commits/branches',
          },
        ],
      },
    ]);

  const formatSelection = () =>
    inquirer.prompt<FormatSelectionResult>([
      {
        type: 'list',
        name: 'format',
        message: 'Select output format:',
        choices: [
          { name: 'Tree view', value: 'tree' as const, short: 'Tree' },
          { name: 'Plain text', value: 'plain' as const, short: 'Plain' },
          { name: 'JSON', value: 'json' as const, short: 'JSON' },
        ],
      },
    ]);

  const compareCommit = () =>
    inquirer.prompt<CompareCommitResult>([
      {
        type: 'input',
        name: 'fromRef',
        message: 'Enter the starting reference (fromRef):',
        validate: validators.nonEmpty,
      },
      {
        type: 'input',
        name: 'toRef',
        message: 'Enter the ending reference (toRef):',
        validate: validators.nonEmpty,
      },
    ]);

  const compareDirectory = () =>
    inquirer.prompt<CompareDirectoryResult>([
      {
        type: 'input',
        name: 'baseBranch',
        message: 'Enter the base branch:',
        default: PROMPT_CONFIG.defaults.baseBranch,
        validate: validators.nonEmpty,
      },
      {
        type: 'input',
        name: 'fromDir',
        message: 'Enter the first directory path:',
        validate: validators.nonEmpty,
      },
      {
        type: 'input',
        name: 'toDir',
        message: 'Enter the second directory path:',
        validate: validators.nonEmpty,
      },
    ]);

  const usePatternFilter = () =>
    inquirer.prompt<PatternFilterResult>([
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

  const choiceChangedFile = (files: FileChange[]) =>
    inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        loop: false,
        message: 'Select a file to view details or choose an action:',
        choices: [
          ...files.map((file) => ({
            name: `${file.path} (${chalk.green('+' + file.insertions)} / ${chalk.red('-' + file.deletions)})`,
            value: { type: 'file', path: file.path },
          })),
          { name: 'Back to main menu', value: { type: 'back' } },
          { name: 'Exit', value: { type: 'exit' } },
        ],
      },
    ]);

  const syncActionPrompt = (filePath: string) =>
    inquirer.prompt<SyncActionResult>([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold(`\nCurrent file: ${filePath}\nStatus: Reviewing in VSCode\n\nChoose action:`),
        choices: [
          { name: 'Confirm sync [Enter]', value: 'confirm' },
          { name: 'Skip file [Esc]', value: 'skip' },
          { name: 'View next diff [→]', value: 'next' },
          { name: 'View previous diff [←]', value: 'prev' },
          { name: 'Go to file list', value: 'list' },
        ],
        pageSize: 5,
        loop: false,
      },
    ]);

  const getDirectoryCompareAnswers = async () => {
    const dirAnswers = await compareDirectory();
    return {
      ...dirAnswers,
      fromRef: `${dirAnswers.baseBranch}:${dirAnswers.fromDir}`,
      toRef: `${dirAnswers.baseBranch}:${dirAnswers.toDir}`,
    };
  };

  return {
    modeSelection,
    formatSelection,
    compareCommit,
    compareDirectory,
    usePatternFilter,
    choiceChangedFile,
    syncActionPrompt,
    getDirectoryCompareAnswers,
  };
};

export const PROMPT = createPrompt();
