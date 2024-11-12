import inquirer from 'inquirer';
import { ErrorTypes, FileChange, GitDiffError } from '../../types/index.js';
import { CommandContext } from '../context/index.js';
import ora from 'ora';
import { formatDetails, getFileDetails } from '../utils/details.js';
import { PROMPT } from '../prompt.js';

export class RouteManager {
  constructor(private context: CommandContext) {}

  async showFileSelectionRoute(files: FileChange[]) {
    const state = this.context.store.getState();
    const analysis = state.analysis.currentAnalysis;

    if (!analysis) throw new GitDiffError('No analysis available', ErrorTypes.NO_ANALYSIS_AVAILABLE);

    console.clear(); // 먼저 화면 지우기
    const tableOutput = this.context.formatter.format({
      ...analysis,
      changes: files,
    });
    console.log(tableOutput);

    const answers = await PROMPT.choiceChangedFile(files);

    switch (answers.action.type) {
      case 'file':
        await this.showFileDetails(answers.action.path);
        break;
      case 'back':
        this.context.dispatch({ type: 'NAVIGATION_CHANGE', payload: 'main' });
        break;
      case 'exit':
        process.exit(0);
    }
  }

  private async showFileDetails(filePath: string): Promise<void> {
    const state = this.context.store.getState();
    const { fromRef, toRef } = state.analysis.refs;

    const spinner = ora('Fetching file details...').start();

    try {
      if (!fromRef || !toRef) return;
      const details = await getFileDetails(filePath, { fromRef, toRef });

      spinner.succeed('Details retrieved');

      console.clear();
      console.log(formatDetails(details));

      await this.showDetailActionMenu(filePath);
    } catch (error) {
      spinner.fail('Failed to fetch details');
      throw error;
    }
  }

  private async showDetailActionMenu(currentFilePath: string) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Back to file list', value: 'list' },
          { name: 'Back to main menu', value: 'main' },
          { name: 'Exit', value: 'exit' },
        ],
      },
    ]);

    switch (answers.action) {
      case 'list': {
        const state = this.context.getState();
        if (state.analysis.currentAnalysis) {
          await this.showFileSelectionRoute(state.analysis.currentAnalysis.changes);
        }
        break;
      }
      case 'main':
        this.context.dispatch({ type: 'NAVIGATION_CHANGE', payload: 'main' });
        break;
      case 'exit':
        process.exit(0);
    }
  }
}
