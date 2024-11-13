// src/sync/types.ts
// 동기화 관련 타입 정의

export interface VSCodeOptions {
  fromRef: string;
  toRef: string;
  filePath: string;
  workspacePath: string;
}

export type SyncStatus = 'NOT_STARTED' | 'IN_REVIEW' | 'CONFIRMED' | 'SKIPPED' | 'COMPLETED' | 'FAILED';

export interface SyncFileStatus {
  path: string;
  status: SyncStatus;
  error?: Error;
}

export interface SyncState {
  currentFile: string | null;
  vscodePid: number | null;
  status: 'IDLE' | 'REVIEWING' | 'SYNCING' | 'COMMITTING' | 'DONE';
  confirmedFiles: SyncFileStatus[];
  skippedFiles: string[];
  error: Error | null;
}

export interface VSCodeProcessResult {
  pid: number;
  success: boolean;
  error?: Error;
}

// Error types
export const SyncErrorTypes = {
  VSCODE_LAUNCH_FAILED: 'VSCODE_LAUNCH_FAILED',
  SYNC_FAILED: 'SYNC_FAILED',
  COMMIT_FAILED: 'COMMIT_FAILED',
  INVALID_FILE_STATUS: 'INVALID_FILE_STATUS',
  MERGE_CONFLICT: 'MERGE_CONFLICT',
} as const;

export class SyncError extends Error {
  constructor(message: string, public type: keyof typeof SyncErrorTypes, public details?: any) {
    super(message);
    this.name = 'SyncError';
  }
}
