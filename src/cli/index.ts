// src/cli/index.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { GitAnalyzer } from '../analyzer/git.js';
import { GitDiffError } from '../types/index.js';
import { DiffFormatter } from '../formatters/index.js';
import { CommandContext } from './context/index.js';
import { InteractiveCompareCommand } from './commands/interactiveCommand.js';
import { DirectCompareCommand } from './commands/compareCommand.js';

export class CLI {
  private program: Command;
  private context: CommandContext;

  constructor() {
    this.program = new Command();
    this.context = new CommandContext(new GitAnalyzer(), new DiffFormatter());
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('git-diff-tree')
      .description('A tool for analyzing git differences between references')
      .version('1.0.0');

    this.program
      .command('compare')
      .description('Analyze differences between git references')
      .option('-i, --interactive', 'Run in interactive mode')
      .option('-s, --sync', 'Enable file synchronization (only works with -i)')
      .option('-f, --from <ref>', 'Starting reference (tag/commit/branch)')
      .option('-t, --to <ref>', 'Ending reference (tag/commit/branch)')
      .option('-p, --pattern <pattern>', 'File pattern to filter (e.g., "*.ts")')
      .option('--format <type>', 'Output format (plain|tree|json)', 'plain')
      .option('--no-colors', 'Disable colored output')
      .option('--no-icons', 'Disable icons in tree view')
      .action(async (options) => {
        try {
          if (options.sync && !options.interactive) {
            console.warn(
              chalk.yellow('\nWarning: Sync option only works with interactive mode (-i). Ignoring sync option.'),
            );
            options.sync = false;
          }

          const command = this.createCommand(options);
          await command.execute();
        } catch (error: any) {
          await this.handleError(error);
        }
      });
  }

  private createCommand(options: any) {
    if (options.interactive) {
      return new InteractiveCompareCommand(this.context, {
        sync: options.sync,
      });
    }

    return new DirectCompareCommand(this.context, {
      toRef: options.to,
      fromRef: options.from,
      filterPattern: options.pattern,
      includeMergeCommits: options.includeMergeCommits,
    });
  }

  private async handleError(error: GitDiffError | Error): Promise<void> {
    if (error instanceof GitDiffError) {
      console.error(chalk.red(`\nError (${error.type}):`), error.message);
      if (error.details) {
        console.error(chalk.yellow('Details:'), JSON.stringify(error.details, null, 2));
      }
    } else {
      console.error(chalk.red('\nUnexpected Error:'), error.message);
    }
    process.exit(1);
  }

  public async run(): Promise<void> {
    await this.program.parseAsync(process.argv);
  }
}
