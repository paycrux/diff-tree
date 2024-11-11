// src/sync/vscode.ts
// VSCode 실행 및 제어
import { exec } from "child_process";
import { promisify } from "util";
import {
  VSCodeOptions,
  VSCodeProcessResult,
  SyncError,
  SyncErrorTypes,
} from "./types.js";

const execAsync = promisify(exec);

export class VSCodeIntegration {
  /**
   * VSCode를 실행하고 diff 뷰를 엽니다.
   */
  static async openDiffView(
    options: VSCodeOptions
  ): Promise<VSCodeProcessResult> {
    const { fromRef, toRef, filePath, workspacePath } = options;

    try {
      // Git show 명령을 사용하여 각 ref의 파일 내용을 임시 파일로 저장
      const tempFromPath = `${filePath}.${fromRef}`;
      const tempToPath = `${filePath}.${toRef}`;

      // 각 ref의 파일 내용 추출
      await execAsync(`git show ${fromRef}:${filePath} > ${tempFromPath}`, {
        cwd: workspacePath,
      });
      await execAsync(`git show ${toRef}:${filePath} > ${tempToPath}`, {
        cwd: workspacePath,
      });

      // VSCode로 diff 뷰 열기
      const { stdout, stderr } = await execAsync(
        `code --wait --diff ${tempFromPath} ${tempToPath}`,
        { cwd: workspacePath }
      );

      // 임시 파일 정리
      await Promise.all([
        execAsync(`rm ${tempFromPath}`),
        execAsync(`rm ${tempToPath}`),
      ]);

      if (stderr && !stderr.includes("warning:")) {
        throw new Error(stderr);
      }

      // VSCode 프로세스 ID 추출 (실제 구현에서는 더 정교한 방법 필요)
      const pid = parseInt(stdout.trim(), 10);

      return {
        success: true,
        pid: pid || -1,
      };
    } catch (error: any) {
      throw new SyncError(
        `Failed to open VSCode diff view: ${error.message}`,
        SyncErrorTypes.VSCODE_LAUNCH_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * VSCode 프로세스가 실행 중인지 확인합니다.
   */
  static async isProcessRunning(pid: number): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        process.platform === "win32"
          ? `tasklist /FI "PID eq ${pid}"`
          : `ps -p ${pid}`
      );
      return stdout.includes(pid.toString());
    } catch {
      return false;
    }
  }

  /**
   * VSCode 프로세스를 종료합니다.
   */
  static async killProcess(pid: number): Promise<void> {
    try {
      await execAsync(
        process.platform === "win32" ? `taskkill /PID ${pid}` : `kill ${pid}`
      );
    } catch (error) {
      console.error(`Failed to kill VSCode process: ${error}`);
    }
  }
}
