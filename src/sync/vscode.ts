import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { promises as fs } from 'fs';
import { VSCodeOptions, SyncError, SyncErrorTypes } from './types.js';
import chalk from 'chalk';

const execAsync = promisify(exec);

export class VSCodeIntegration {
  /**
   * ref에서 실제 브랜치/태그와 파일 경로를 분리
   */
  private static parseRef(ref: string): { gitRef: string; filePath: string } {
    const [gitRef, ...pathParts] = ref.split(':');
    return {
      gitRef,
      filePath: pathParts.join(':') || '', // 콜론이 포함된 경로를 다시 결합
    };
  }

  private static async getFileContent(ref: string, originalPath: string, workspacePath: string): Promise<string> {
    try {
      const { gitRef, filePath } = this.parseRef(ref);
      const targetPath = path.join(filePath, originalPath);

      const { stdout } = await execAsync(`git show "${gitRef}:${targetPath}"`, {
        cwd: workspacePath,
      });
      return stdout;
    } catch (error: any) {
      throw new SyncError(`Failed to get file content: ${error.message}`, SyncErrorTypes.VSCODE_LAUNCH_FAILED, {
        ref,
        path: originalPath,
      });
    }
  }

  static async openDiffView(options: VSCodeOptions): Promise<{ targetPath: string }> {
    const { fromRef, toRef, filePath, workspacePath } = options;

    try {
      console.log(chalk.blue('\nDebug - Getting file contents:'));
      console.log(`From ref: ${fromRef}`);
      console.log(`To ref: ${toRef}`);
      console.log(`File path: ${filePath}`);
      console.log(`Workspace path: ${workspacePath}`);

      // 1. from 파일 내용 가져오기
      const fromContent = await this.getFileContent(fromRef, filePath, workspacePath);

      // 2. 대상 경로 계산
      const { filePath: fromFilePath } = this.parseRef(fromRef);
      const { filePath: toFilePath } = this.parseRef(toRef);
      const fromPath = path.join(fromFilePath, filePath);
      const targetPath = path.join(toFilePath, filePath);

      // 3. 대상 디렉토리 생성
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      // 4. 파일 생성 & 자동 업데이트
      // await fs.writeFile(targetPath, fromContent);

      // 5. VSCode로 diff view 열기
      // fromRef의 파일과 현재 작업 중인 파일을 비교
      const vscodeCommand = `code --diff "${fromPath}" "${targetPath}"`;
      console.log(chalk.blue('\nDebug - VSCode command:'));
      const { stderr } = await execAsync(vscodeCommand, {
        cwd: workspacePath,
      });

      if (stderr && !stderr.includes('warning:')) throw new Error(stderr);

      return { targetPath };
    } catch (error: any) {
      // 상세한 에러 정보 포함
      throw new SyncError(`Failed to open VSCode diff view: ${error.message}`, SyncErrorTypes.VSCODE_LAUNCH_FAILED, {
        originalError: error,
        command: 'code --wait --diff',
        fromRef,
        toRef,
        filePath,
      });
    }
  }

  static async getModifiedContent(targetPath: string): Promise<string> {
    try {
      return await fs.readFile(targetPath, 'utf8');
    } catch (error: any) {
      throw new SyncError(`Failed to read modified content: ${error.message}`, SyncErrorTypes.VSCODE_LAUNCH_FAILED, {
        file: targetPath,
      });
    }
  }

  static async cleanup(): Promise<void> {
    try {
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }
}
