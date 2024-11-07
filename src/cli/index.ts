// src/cli/index.ts
import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { GitAnalyzer } from "../analyzer/git.js";
import { table } from "table";
import { GitDiffError } from "../types/index.js";
import {
  getCommitCompareAnswers,
  getDirectoryCompareAnswers,
  getFormatSelection,
  getModeSelection,
  getPatternAnswers,
} from "./prompt.js";
import { DiffFormatter } from "../formatters/index.js";

export class CLI {
  private program: Command;
  private analyzer: GitAnalyzer;
  private formatter: DiffFormatter;

  private setupCommands(): void {
    this.program
      .name("git-diff-analyzer")
      .description("A tool for analyzing git differences between references")
      .version("1.0.0");

    this.program
      .command("compare")
      .description("Analyze differences between git references")
      .option("-i, --interactive", "Run in interactive mode")
      .option("-f, --from <ref>", "Starting reference (tag/commit/branch)")
      .option("-t, --to <ref>", "Ending reference (tag/commit/branch)")
      .option(
        "-p, --pattern <pattern>",
        'File pattern to filter (e.g., "*.ts")'
      )
      .option("--format <type>", "Output format (plain|tree|json)", "plain")
      .option("--no-colors", "Disable colored output")
      .option("--no-icons", "Disable icons in tree view")
      .action(async (options) => {
        try {
          if (options.interactive || (!options.from && !options.to))
            await this.runInteractiveMode();
          else await this.runDirectMode(options);
        } catch (error: any) {
          this.handleError(error);
        }
      });
  }

  constructor() {
    this.program = new Command();
    this.analyzer = new GitAnalyzer();
    this.formatter = new DiffFormatter();
    this.setupCommands();
  }

  private async runInteractiveMode() {
    const modeAnswer = await getModeSelection();
    const formatAnswer = await getFormatSelection();

    this.formatter.updateOptions({ format: formatAnswer.format });

    let answers;

    if (modeAnswer.compareMode === "commits") {
      answers = await getCommitCompareAnswers();
    } else {
      answers = await getDirectoryCompareAnswers();
    }

    const patternAnswers = await getPatternAnswers();

    const spinner = ora("Analyzing differences...").start();

    try {
      const analysis = await this.analyzer.analyzeDiff({
        fromRef: answers.fromRef,
        toRef: answers.toRef,
        filterPattern: patternAnswers.pattern,
      });

      spinner.succeed("Analysis complete");
      this.displayResults(analysis);
    } catch (error) {
      spinner.fail("Analysis failed");
      throw error;
    }
  }

  private async runDirectMode(options: any): Promise<void> {
    if (!options.from || !options.to) {
      throw new Error(
        "Both --from and --to references are required in direct mode"
      );
    }

    const spinner = ora("Analyzing differences...").start();

    try {
      const analysis = await this.analyzer.analyzeDiff({
        fromRef: options.from,
        toRef: options.to,
        filterPattern: options.pattern,
      });

      spinner.succeed("Analysis complete");
      this.displayResults(analysis);
    } catch (error) {
      spinner.fail("Analysis failed");
      throw error;
    }
  }

  private displayResults(analysis: any): void {
    const output = this.formatter.format(analysis);
    console.log(output);
  }

  private async handleError(error: GitDiffError | Error): Promise<void> {
    if (error instanceof GitDiffError) {
      console.error(chalk.red(`\nError (${error.type}):`), error.message);
      if (error.details) {
        console.error(
          chalk.yellow("Details:"),
          JSON.stringify(error.details, null, 2)
        );
      }
    } else {
      console.error(chalk.red("\nUnexpected Error:"), error.message);
    }
    process.exit(1);
  }

  public async run(): Promise<void> {
    await this.program.parseAsync(process.argv);
  }
}
