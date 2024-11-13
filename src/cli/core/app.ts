import { Command } from 'commander';
import { DiffService, SyncService } from '../../services/index.js';
import { CompareCommand } from './commands/compare.command.js';
import { InteractiveCommand } from './commands/interactive.command.js';
import { ErrorHandler } from './error-handler.js';

export class CLIApplication {
  private program: Command;
  private errorHandler: ErrorHandler;

  constructor() {
    this.program = new Command();
    this.errorHandler = new ErrorHandler();

    this.setupProgram();
    this.registerCommands();
  }

  public async run(): Promise<void> {
    try {
      await this.program.parseAsync(process.argv);
    } catch (error) {
      this.errorHandler.handle(error);
      process.exit(1);
    }
  }

  private setupProgram(): void {
    this.program
      .name('git-diff-tree')
      .description('A tool for analyzing git differences between references')
      .version('1.0.0')
      .option('--no-color', 'Disable colored output')
      .option('--debug', 'Enable debug mode')
      .hook('preAction', (thisCommand) => {
        // 글로벌 옵션 처리
        const opts = thisCommand.opts();
        if (opts.debug) {
          process.env.DEBUG = 'true';
        }
        if (opts.noColor) {
          process.env.NO_COLOR = 'true';
        }
      });
  }

  private registerCommands(): void {
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
      .option('--no-icons', 'Disable icons in tree view')
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
    const diffService = new DiffService();
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
        showIcons: options.icons,
        colorize: !process.env.NO_COLOR,
      },
    });
  }
}
