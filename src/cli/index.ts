// src/cli/index.ts
import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { GitAnalyzer } from "../analyzer/git.js";
import { table } from "table";
import { GitDiffError } from "../types/index.js";

export class CLI {
  private program: Command;
  private analyzer: GitAnalyzer;

  constructor() {
    this.program = new Command();
    this.analyzer = new GitAnalyzer();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name("git-diff-analyzer")
      .description("A tool for analyzing git differences between references")
      .version("1.0.0");

    this.program
      .command("analyze")
      .description("Analyze differences between git references")
      .option("-i, --interactive", "Run in interactive mode")
      .option("-f, --from <ref>", "Starting reference (tag/commit/branch)")
      .option("-t, --to <ref>", "Ending reference (tag/commit/branch)")
      .option(
        "-p, --pattern <pattern>",
        'File pattern to filter (e.g., "*.ts")'
      )
      .action(async (options) => {
        try {
          if (options.interactive || (!options.from && !options.to)) {
            await this.runInteractiveMode();
          } else {
            await this.runDirectMode(options);
          }
        } catch (error: any) {
          this.handleError(error);
        }
      });
  }

  private async runInteractiveMode(): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "mode",
        message: "Select analysis mode:",
        choices: [
          { name: "Compare tags", value: "tags" },
          { name: "Compare commits", value: "commits" },
          { name: "Compare branches", value: "branches" },
        ],
      },
      {
        type: "input",
        name: "fromRef",
        message: "Enter the starting reference:",
        validate: (input) => input.length > 0 || "Reference cannot be empty",
      },
      {
        type: "input",
        name: "toRef",
        message: "Enter the ending reference:",
        validate: (input) => input.length > 0 || "Reference cannot be empty",
      },
      {
        type: "confirm",
        name: "usePattern",
        message: "Do you want to filter files by pattern?",
        default: false,
      },
      {
        type: "input",
        name: "pattern",
        message: 'Enter file pattern (e.g., "*.ts"):',
        when: (answers) => answers.usePattern,
      },
    ]);

    const spinner = ora("Analyzing differences...").start();

    try {
      const analysis = await this.analyzer.analyzeDiff({
        fromRef: answers.fromRef,
        toRef: answers.toRef,
        filterPattern: answers.pattern,
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
    // 전체 통계
    console.log(chalk.bold("\nOverall Statistics:"));
    console.log(chalk.blue(`Files Changed: ${analysis.stats.filesChanged}`));
    console.log(chalk.green(`Insertions: ${analysis.stats.insertions}`));
    console.log(chalk.red(`Deletions: ${analysis.stats.deletions}`));

    // 파일 타입별 통계
    console.log(chalk.bold("\nBy File Type:"));
    const typeData = Object.entries(analysis.byFileType).map(
      ([ext, stats]: [string, any]) => [
        ext,
        stats.count,
        chalk.green(stats.insertions),
        chalk.red(stats.deletions),
      ]
    );

    console.log(
      table([["Extension", "Count", "Insertions", "Deletions"], ...typeData])
    );

    // 변경된 파일 목록
    console.log(chalk.bold("\nChanged Files:"));
    const fileData = analysis.changes.map((change: any) => [
      change.path,
      this.getChangeTypeColor(change.type)(change.type),
      chalk.green(change.insertions),
      chalk.red(change.deletions),
    ]);

    console.log(
      table([["Path", "Type", "Insertions", "Deletions"], ...fileData])
    );
  }

  private getChangeTypeColor(type: string): (text: string) => string {
    switch (type) {
      case "added":
        return chalk.green;
      case "deleted":
        return chalk.red;
      default:
        return chalk.yellow;
    }
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
