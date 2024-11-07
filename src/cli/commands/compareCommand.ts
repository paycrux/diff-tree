// src/cli/commands/compareCommand.ts
import ora from "ora";
import { CompareOptions, GitCommand } from "../../types/index.js";
import { CommandContext } from "../context/index.js";

export class DirectCompareCommand implements GitCommand {
  constructor(
    private context: CommandContext,
    private options: CompareOptions
  ) {}

  async execute(): Promise<void> {
    const spinner = ora("Analyzing differences...").start();

    try {
      const analysis = await this.context.analyzer.analyzeDiff({
        fromRef: this.options.fromRef,
        toRef: this.options.toRef,
        filterPattern: this.options.filterPattern,
      });

      spinner.succeed("Analysis complete");
      const output = this.context.formatter.format(analysis);
      console.log(output);
    } catch (error) {
      spinner.fail("Analysis failed");
      throw error;
    }
  }
}
