import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import path from 'path';
import { SyncError, SyncErrorTypes, SyncResult } from './types.js';
import chalk from 'chalk';

const execAsync = promisify(exec);

export class FileMerger {
  constructor(private workspacePath: string) {}

  /**
   * ref에서 실제 브랜치/태그와 파일 경로를 분리
   */
  private parseRef(ref: string): { gitRef: string; filePath: string } {
    const [gitRef, ...pathParts] = ref.split(':');
    return {
      gitRef,
      filePath: pathParts.join(':'), // 경로에 콜론이 포함될 수 있으므로 다시 결합
    };
  }

  /**
   * fromRef의 파일 내용을 가져옵니다
   */
  private async getFileContent(ref: string, originalPath: string): Promise<string> {
    const { gitRef, filePath } = this.parseRef(ref);
    const targetPath = path.join(filePath, originalPath);

    try {
      const { stdout } = await execAsync(`git show "${gitRef}:${targetPath}"`, {
        cwd: this.workspacePath,
      });
      return stdout;
    } catch (error: any) {
      throw new SyncError(`Failed to get file content: ${error.message}`, SyncErrorTypes.SYNC_FAILED, {
        ref,
        path: targetPath,
      });
    }
  }

  /**
   * 파일 동기화를 수행합니다
   */
  async syncFile(filePath: string, fromRef: string, toRef: string, modifiedContent?: string): Promise<SyncResult> {
    const { gitRef: toGitRef, filePath: toFilePath } = this.parseRef(toRef);
    console.log(
      chalk.cyanBright(`toGitRef: ${toGitRef} toFilePath: ${toFilePath}  filePath: ${filePath}  fromRef: ${fromRef}`),
    );
    const fullTargetPath = path.join(toFilePath, filePath);
    const fullPath = path.join(this.workspacePath, fullTargetPath);
    const backupPath = `${fullPath}.backup`;

    try {
      // 1. 백업 생성
      try {
        await fs.copyFile(fullPath, backupPath);
      } catch {
        // 파일이 없을 수 있음 - 무시
      }

      // 2. 새 내용 쓰기
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      if (modifiedContent !== undefined) {
        await fs.writeFile(fullPath, modifiedContent);
      } else {
        const content = await this.getFileContent(fromRef, filePath);
        await fs.writeFile(fullPath, content);
      }

      // 3. 변경사항 확인
      const { stdout: diffStatus } = await execAsync(`git diff --name-only "${fullTargetPath}"`, {
        cwd: this.workspacePath,
      });

      if (!diffStatus.trim()) {
        return { success: true, noChanges: true };
      }

      // 4. 변경사항을 스테이징
      await execAsync(`git add "${fullTargetPath}"`, {
        cwd: this.workspacePath,
      });

      // 5. 자동 커밋 생성
      const commitMessage = `sync: Update ${filePath} from ${fromRef} to ${toRef}`;
      await execAsync(`git commit -m "${commitMessage}"`, {
        cwd: this.workspacePath,
      });

      return { success: true };
    } catch (error: any) {
      // 8. 에러 발생 시 롤백
      try {
        if (await this.fileExists(backupPath)) {
          await fs.copyFile(backupPath, fullPath);
          await execAsync(`git reset HEAD "${fullTargetPath}"`, {
            cwd: this.workspacePath,
          });
        }
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }

      if (error.message.includes('does not exist')) {
        return {
          success: false,
          error: new SyncError(`File not found in reference: ${fullTargetPath}`, SyncErrorTypes.SYNC_FAILED, {
            filePath: fullTargetPath,
          }),
        };
      }

      throw new SyncError(`Failed to sync file: ${error.message}`, SyncErrorTypes.SYNC_FAILED, {
        originalError: error,
        filePath: fullTargetPath,
      });
    } finally {
      // 9. 백업 파일 정리
      try {
        await fs.unlink(backupPath).catch(() => {});
      } catch {
        // 정리 실패는 무시
      }
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
