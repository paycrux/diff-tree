// src/services/vscode.service.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { CustomError, ErrorTypes } from '../types/index.js';
import { VSCodeDiffOptions } from './types.js';
import chalk from 'chalk';
import { FileUtils } from '../utils/file.js';

const execAsync = promisify(exec);

export class VSCodeService {
  async openDiff(options: VSCodeDiffOptions): Promise<void> {
    const { fromRef, toRef, filePath, workspacePath } = options;

    this.debug(
      'Getting file contents:',
      `From ref       : ${fromRef}`,
      `To ref         : ${toRef}`,
      `File path      : ${filePath}`,
      `Workspace path : ${workspacePath}`
    );

    try {
      const fromPath = FileUtils.getFullPath({ filePath, workspacePath, ref: fromRef });
      const toPath = FileUtils.getFullPath({ filePath, workspacePath, ref: toRef });

      this.debug('Resolved paths:', `From: ${fromPath}`, `To: ${toPath}`);

      const command = `code --folder-uri "file://${workspacePath}" --new-window --diff "${fromPath}" "${toPath}"`;

      await execAsync(command, { cwd: workspacePath });
    } catch (error) {
      throw new CustomError('Failed to open VSCode diff view', ErrorTypes.FILE_SYSTEM_ERROR, { options, error });
    }
  }

  private debug(message: string, ...args: any[]) {
    console.log(chalk.blue('\nDebug - ' + message));

    args.forEach((arg) => {
      if (typeof arg === 'string') console.log(arg);
      else console.log(JSON.stringify(arg, null, 2));
    });
  }
}
