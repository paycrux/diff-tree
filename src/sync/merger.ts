// src/sync/merger.ts
// 파일 동기화 로직 관리

import { promisify } from "util";
import { SyncError, SyncErrorTypes, SyncResult } from "./types.js";
import { exec } from "child_process";

const execAsync = promisify(exec);
export class FileMerger {
  constructor(private workspacePath: string) {}

  /**
   * fromRef에서 toRef로 파일을 동기화합니다.
   */
  async syncFile(
    filePath: string,
    fromRef: string,
    toRef: string
  ): Promise<SyncResult> {
    try {
      // 1. fromRef의 파일 내용을 가져옴
      const { stdout: fileContent } = await execAsync(
        `git show ${fromRef}:${filePath}`,
        { cwd: this.workspacePath }
      );

      // 2. 현재 작업 디렉토리의 파일을 업데이트
      await this.writeFile(filePath, fileContent);

      // 3. 변경사항이 있는지 확인
      const { stdout: status } = await execAsync(
        `git status --porcelain ${filePath}`,
        { cwd: this.workspacePath }
      );

      if (!status) {
        return { success: true }; // 변경사항 없음
      }

      // 4. 스테이징
      await execAsync(`git add ${filePath}`, { cwd: this.workspacePath });

      return { success: true };
    } catch (error: any) {
      if (error.message.includes("conflict")) {
        return {
          success: false,
          error: new SyncError(
            "Merge conflict detected",
            SyncErrorTypes.MERGE_CONFLICT,
            { filePath }
          ),
          conflictFiles: [filePath],
        };
      }

      throw new SyncError(
        `Failed to sync file: ${error.message}`,
        SyncErrorTypes.SYNC_FAILED,
        { originalError: error, filePath }
      );
    }
  }

  /**
   * 변경사항을 롤백합니다.
   */
  async rollback(filePath: string): Promise<void> {
    try {
      await execAsync(`git checkout -- ${filePath}`, {
        cwd: this.workspacePath,
      });
    } catch (error: any) {
      console.error(`Rollback failed: ${error.message}`);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    const { promisify } = require("util");
    const fs = require("fs");
    const writeFileAsync = promisify(fs.writeFile);

    try {
      await writeFileAsync(filePath, content);
    } catch (error: any) {
      throw new SyncError(
        `Failed to write file: ${error.message}`,
        SyncErrorTypes.SYNC_FAILED,
        { filePath }
      );
    }
  }
}
