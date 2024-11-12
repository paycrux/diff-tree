// src/cli/commands/compareCommand.ts
import ora from 'ora';
import { CompareOptions, GitCommand } from '../../types/index.js';
import { CommandContext } from '../context/index.js';
import { actionCreators } from '../../state/store.js';

export class DirectCompareCommand implements GitCommand {
  constructor(
    private context: CommandContext,
    private options: CompareOptions,
  ) {}

  async execute(): Promise<void> {
    const { dispatch } = this.context;

    dispatch(actionCreators.startAnalysis());

    try {
      dispatch(
        actionCreators.updateRefs({
          fromRef: this.options.fromRef,
          toRef: this.options.toRef,
        }),
      );

      const analysis = await this.context.analyzer.analyzeDiff(this.options);

      dispatch(actionCreators.completeAnalysis(analysis));

      const output = this.context.formatter.format(analysis);
      console.log(output);
    } catch (error) {
      dispatch({ type: 'ANALYSIS_ERROR', payload: error });
      return;
    }
  }
}
