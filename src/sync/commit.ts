import { exec } from 'child_process';
import { promisify } from 'util';
import { CommitOptions, SyncError, SyncErrorTypes } from './types.js';

const execAsync = promisify(exec);

export class CommitManager {
  constructor(private workspacePath: string) {}

  async createSyncCommit(options: CommitOptions): Promise<void> {
    const { filePath, fromRef, toRef, message } = options;

    const commitMessage = message || this.generateCommitMessage(filePath, fromRef, toRef);

    try {
      // git status 확인
      const { stdout: status } = await execAsync('git status --porcelain', {
        cwd: this.workspacePath,
      });

      if (!status) {
        console.log('No changes to commit');
        return;
      }

      // 변경사항이 stage되었는지 확인
      if (!status.split('\n').some((line) => line.startsWith('A') || line.startsWith('M'))) {
        // 필요한 경우 자동으로 add
        // FIXME: 📍 Pin point
        await execAsync(`git add "${filePath}"`, {
          cwd: this.workspacePath,
        });
      }

      // 커밋 생성
      const { stdout, stderr } = await execAsync(`git commit -m "${commitMessage}"`, {
        cwd: this.workspacePath,
      });

      if (stderr && !stderr.includes('warning:')) {
        throw new Error(stderr);
      }

      return;
    } catch (error: any) {
      if (error.message.includes('nothing to commit')) {
        console.log('No changes to commit');
        return;
      }

      // 더 자세한 에러 정보 포함
      throw new SyncError(`Failed to create commit: ${error.message}`, SyncErrorTypes.COMMIT_FAILED, {
        originalError: error,
        filePath,
        fromRef,
        toRef,
        commitMessage,
      });
    }
  }

  private generateCommitMessage(filePath: string, fromRef: string, toRef: string): string {
    const scope = this.getScope(filePath);
    return `sync(${scope}): Synchronize ${filePath} from ${fromRef} to ${toRef}\n\n- Changed file: ${filePath}\n\n[automated commit by diff-tree]`;
  }

  private getScope(filePath: string): string {
    const parts = filePath.split('/');
    return parts.length > 1 ? parts[0] : 'root';
  }
}
