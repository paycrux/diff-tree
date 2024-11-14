// src/utils/git.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { CustomError } from './error.js';
import { ErrorTypes } from '../types/index.js';

const execAsync = promisify(exec);

export interface GitCommandOptions {
  cwd?: string;
  maxBuffer?: number;
}

export class GitUtils {
  /**
   * Git 명령어를 실행하고 결과를 반환합니다.
   */
  static async executeCommand(command: string, options: GitCommandOptions = {}) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        ...options,
        maxBuffer: options.maxBuffer || 1024 * 1024 * 10, // 10MB default
      });

      if (stderr && !stderr.includes('warning:')) {
        throw new CustomError('Git command execution failed', ErrorTypes.GIT_COMMAND_FAILED, { command, stderr });
      }

      return stdout.trim();
    } catch (error: any) {
      throw new CustomError(`Git command failed: ${error.message}`, ErrorTypes.GIT_COMMAND_FAILED, {
        command,
        originalError: error,
      });
    }
  }

  /**
   * 특정 파일의 Git Diff
   */
  static async getFileDetails(filePath: string, refs: { fromRef: string; toRef: string }) {
    try {
      const diff = await this.executeCommand(`git diff ${refs.fromRef} ${refs.toRef} -- ${filePath}`);
      return { path: filePath, diff };
    } catch (error: any) {
      throw new CustomError(`Failed to get file details: ${error.message}`, ErrorTypes.GIT_COMMAND_FAILED, {
        filePath,
        refs,
        originalError: error,
      });
    }
  }

  /**
   * Git reference가 유효한지 확인합니다.
   */
  static async isValidRef(ref: string, cwd?: string): Promise<boolean> {
    try {
      await this.executeCommand(`git rev-parse --verify ${ref}`, { cwd });
      return true;
    } catch {
      return false;
    }
  }
}
