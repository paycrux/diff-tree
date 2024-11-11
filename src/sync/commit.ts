import { exec } from "child_process";
import { promisify } from "util";
import { CommitOptions, SyncError, SyncErrorTypes } from "./types.js";

const execAsync = promisify(exec);

export class CommitManager {
  constructor(private workspacePath: string) {}

  async createSyncCommit(options: CommitOptions): Promise<void> {
    const { filePath, fromRef, toRef, message } = options;

    const commitMessage =
      message || this.generateCommitMessage(filePath, fromRef, toRef);

    try {
      // 커밋 생성
      await execAsync(`git commit -m "${commitMessage}"`, {
        cwd: this.workspacePath,
      });
    } catch (error: any) {
      if (error.message.includes("nothing to commit")) {
        return; // 커밋할 변경사항이 없는 경우
      }

      throw new SyncError(
        `Failed to create commit: ${error.message}`,
        SyncErrorTypes.COMMIT_FAILED,
        { originalError: error }
      );
    }
  }

  private generateCommitMessage(
    filePath: string,
    fromRef: string,
    toRef: string
  ): string {
    return `sync(${this.getScope(
      filePath
    )}): Synchronize ${filePath} from ${fromRef} to ${toRef}

- Changed file: ${filePath}

[automated commit by diff-tree]`;
  }

  private getScope(filePath: string): string {
    const parts = filePath.split("/");
    return parts.length > 1 ? parts[0] : "root";
  }
}
