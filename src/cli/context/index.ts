// src/cli/context/index.ts
import ora, { Ora } from 'ora';
import { GitAnalyzer } from '../../analyzer/git.js';
import { DiffFormatter } from '../../formatters/index.js';
import { initialState, Store } from '../../state/store.js';
import { Action } from '../../state/types.js';
import { GitDiffError } from '../../types/index.js';
import chalk from 'chalk';

export class CommandContext {
  public readonly store: Store;
  private spinner: Ora | null = null;

  constructor(
    public readonly analyzer: GitAnalyzer,
    public readonly formatter: DiffFormatter,
  ) {
    this.store = new Store(initialState);

    this.setupAnalysisHandlers();
  }

  private setupAnalysisHandlers() {
    this.store.subscribe((state) => {
      if (state.analysis.isAnalyzing) {
        if (this.spinner) this.spinner.stop();

        this.spinner = ora('Analyzing differences...').start();
      } else {
        // 분석 완료시 스피너 처리
        if (this.spinner) {
          if (state.analysis.error) {
            this.spinner.fail('Analysis failed');
          } else if (state.analysis.currentAnalysis) {
            this.spinner.succeed('Analysis complete');
          }
          this.spinner = null;
        }
      }
    });

    // 에러 상태 감지 및 처리
    this.store.subscribe((state) => {
      if (state.analysis.error) {
        console.error(chalk.red(`\nError:`), state.analysis.error.message);
      }
    });
  }

  // 상태 관리 메서드들
  getState() {
    return this.store.getState();
  }

  dispatch(action: Action) {
    return this.store.dispatch(action);
  }
}
