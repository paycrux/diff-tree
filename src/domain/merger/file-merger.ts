// src/domain/merger/file-merger.ts
import path from 'path';
import { GitUtils } from '../../utils/git.js';
import { ErrorTypes, CustomError } from '../../types/index.js';
import { SyncResult } from './types.js';
import { FileUtils } from '../../utils/file.js';

export class FileMerger {
  constructor(private workspacePath: string = process.cwd()) {}

  /**
   * Git ref에서 브랜치/태그와 파일 경로를 분리합니다.
   */
  private parseRef(ref: string): { gitRef: string; filePath: string } {
    const [gitRef, ...pathParts] = ref.split(':');
    return {
      gitRef,
      filePath: pathParts.join(':') || '',
    };
  }

  /**
   * 주어진 ref의 파일 내용을 가져옵니다.
   */
  private async getFileContent(ref: string, originalPath: string): Promise<string> {
    const { gitRef, filePath } = this.parseRef(ref);
    const targetPath = path.join(filePath, originalPath);

    try {
      return await GitUtils.executeCommand(`git show "${gitRef}:${targetPath}"`, { cwd: this.workspacePath });
    } catch (error) {
      throw new CustomError(`Failed to get file content`, ErrorTypes.FILE_SYSTEM_ERROR, {
        ref,
        path: targetPath,
        originalError: error,
      });
    }
  }

  /**
   * 파일 동기화를 수행합니다.
   */
  async syncFile(filePath: string, fromRef: string, toRef: string, modifiedContent?: string): Promise<SyncResult> {
    const { gitRef: toGitRef, filePath: toFilePath } = this.parseRef(toRef);
    const fullTargetPath = path.join(toFilePath, filePath);
    const fullPath = path.join(this.workspacePath, fullTargetPath);
    const backupPath = `${fullPath}.backup`;

    try {
      // 1. 백업 생성
      await this.createBackup(fullPath, backupPath);

      // 2. 새 내용 쓰기
      await this.writeNewContent(fullPath, filePath, fromRef, modifiedContent);

      // 3. Git 작업 수행
      const hasChanges = await this.handleGitOperations(fullTargetPath);
      if (!hasChanges) {
        return { success: true, noChanges: true };
      }

      return { success: true };
    } catch (error: any) {
      // 에러 발생 시 롤백
      await this.handleRollback(fullPath, backupPath, fullTargetPath);
      throw error;
    } finally {
      // 백업 파일 정리
      await FileUtils.removeFile(backupPath).catch(() => {});
    }
  }

  private async createBackup(fullPath: string, backupPath: string): Promise<void> {
    if (await FileUtils.exists(fullPath)) {
      await FileUtils.copyFile(fullPath, backupPath);
    }
  }

  private async writeNewContent(
    fullPath: string,
    filePath: string,
    fromRef: string,
    modifiedContent?: string
  ): Promise<void> {
    await FileUtils.ensureDir(path.dirname(fullPath));

    const content = modifiedContent ?? (await this.getFileContent(fromRef, filePath));
    await FileUtils.writeFile(fullPath, content);
  }

  private async handleGitOperations(fullTargetPath: string): Promise<boolean> {
    // 변경사항 확인
    const diffStatus = await GitUtils.executeCommand(`git diff --name-only "${fullTargetPath}"`, {
      cwd: this.workspacePath,
    });

    if (!diffStatus.trim()) {
      return false;
    }

    // 변경사항을 스테이징
    await GitUtils.executeCommand(`git add "${fullTargetPath}"`, {
      cwd: this.workspacePath,
    });

    return true;
  }

  private async handleRollback(fullPath: string, backupPath: string, fullTargetPath: string): Promise<void> {
    try {
      if (await FileUtils.exists(backupPath)) {
        await FileUtils.copyFile(backupPath, fullPath);
        await GitUtils.executeCommand(`git reset HEAD "${fullTargetPath}"`, {
          cwd: this.workspacePath,
        });
      }
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
  }
}
