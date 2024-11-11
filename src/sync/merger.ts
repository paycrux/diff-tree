import { exec } from "child_process";
import { promisify } from "util";
import { SyncError, SyncErrorTypes, SyncResult } from "./types.js";

const execAsync = promisify(exec);

export class FileMerger {
  constructor(private workspacePath: string) {}

  /**
   * fromRef의 파일 내용을 toRef로 동기화합니다.
   */
  async syncFile(
    filePath: string,
    fromRef: string,
    toRef: string
  ): Promise<SyncResult> {
    try {
      // 1. fromRef의 파일 내용 가져오기
      const { stdout: fileContent } = await execAsync(
        `git show ${fromRef}:${filePath}`,
        { cwd: this.workspacePath }
      );

      // 2. 임시 브랜치 생성 (toRef 기준)
      const tempBranch = `temp-sync-${Date.now()}`;
      await execAsync(`git checkout -b ${tempBranch} ${toRef}`, {
        cwd: this.workspacePath,
      });

      try {
        // 3. 파일 내용 업데이트
        await this.writeFile(filePath, fileContent);

        // 4. 변경사항이 있는지 확인
        const { stdout: status } = await execAsync(
          `git status --porcelain ${filePath}`,
          { cwd: this.workspacePath }
        );

        if (!status) {
          // 변경사항이 없으면 임시 브랜치 삭제 후 종료
          await this.cleanup(tempBranch);
          return { success: true };
        }

        // 5. 변경사항을 스테이징
        await execAsync(`git add ${filePath}`, { cwd: this.workspacePath });

        // 6. toRef로 체크아웃
        await execAsync(`git checkout ${toRef}`, { cwd: this.workspacePath });

        // 7. 임시 브랜치의 변경사항을 toRef에 머지
        await execAsync(`git merge ${tempBranch}`, { cwd: this.workspacePath });

        // 8. 정리
        await this.cleanup(tempBranch);

        return { success: true };
      } catch (error) {
        // 에러 발생 시 정리 후 에러 전파
        await this.cleanup(tempBranch);
        throw error;
      }
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
   * 파일의 변경사항을 롤백합니다.
   */
  async rollback(filePath: string): Promise<void> {
    try {
      // 스테이징된 변경사항이 있으면 언스테이징
      await execAsync(`git reset HEAD ${filePath}`, {
        cwd: this.workspacePath,
      });

      // 작업 디렉토리의 변경사항 되돌리기
      await execAsync(`git checkout -- ${filePath}`, {
        cwd: this.workspacePath,
      });
    } catch (error: any) {
      throw new SyncError(
        `Failed to rollback changes: ${error.message}`,
        SyncErrorTypes.SYNC_FAILED,
        { filePath }
      );
    }
  }

  private async cleanup(tempBranch: string): Promise<void> {
    try {
      // 임시 브랜치가 있으면 삭제
      await execAsync(`git branch -D ${tempBranch}`, {
        cwd: this.workspacePath,
      }).catch(() => {}); // 브랜치가 없어도 무시
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    const { promises: fs } = require("fs");

    try {
      await fs.writeFile(filePath, content);
    } catch (error: any) {
      throw new SyncError(
        `Failed to write file: ${error.message}`,
        SyncErrorTypes.SYNC_FAILED,
        { filePath }
      );
    }
  }
}
