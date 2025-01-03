import { Command } from 'commander';
import { DiffService, SyncService } from '../../services/index.js';
import { CompareCommand } from './commands/compare.command.js';
import { InteractiveCommand } from './commands/interactive.command.js';
import { ErrorHandler } from './error-handler.js';
import { GitAnalyzer } from '../../domain/analyzer/git-analyzer.js';
import { DiffFormatter } from '../../domain/formatter/diff-formatter.js';

export class CLIApplication {
  private program: Command;
  private errorHandler: ErrorHandler;

  constructor() {
    this.program = new Command();
    this.errorHandler = new ErrorHandler();

    this.setupProgram();
    this.registerCommands();
  }

  public async run() {
    try {
      await this.program.parseAsync(process.argv);
    } catch (error) {
      this.errorHandler.handle(error);
      process.exit(1);
    }
  }

  private setupProgram() {
    this.program
      .name('git-diff-tree')
      .description('A tool for analyzing git differences between references')
      .version('1.0.0')
      .option('--debug', 'Enable debug mode')
      .hook('preAction', (thisCommand) => {
        // 글로벌 옵션 처리
        const opts = thisCommand.opts();
        if (opts.debug) {
          process.env.DEBUG = 'true';
        }
      });
  }

  private registerCommands() {
    // 기본 비교 명령어
    this.program
      .command('compare')
      .description('Analyze differences between git references')
      .option('-i, --interactive', 'Run in interactive mode')
      .option('-s, --sync', 'Enable file synchronization (only works with -i)')
      .option('-f, --from <ref>', 'Starting reference (tag/commit/branch)')
      .option('-t, --to <ref>', 'Ending reference (tag/commit/branch)')
      .option('-p, --pattern <pattern>', 'File pattern to filter (e.g., "*.ts")')
      .option('--format <type>', 'Output format (plain|tree|json)', 'plain')
      .action(async (options) => {
        try {
          const command = this.createCompareCommand(options);
          await command.execute();
        } catch (error) {
          this.errorHandler.handle(error);
        }
      });
  }

  private createCompareCommand(options: any) {
    const analyzer = new GitAnalyzer();
    const formatter = new DiffFormatter();

    const diffService = new DiffService(analyzer, formatter);
    const syncService = new SyncService();

    if (options.interactive) {
      return new InteractiveCommand(diffService, syncService, {
        sync: options.sync,
      });
    }

    return new CompareCommand(diffService, {
      fromRef: options.from,
      toRef: options.to,
      filterPattern: options.pattern,
      formatOptions: {
        type: options.format,
      },
    });
  }
}
