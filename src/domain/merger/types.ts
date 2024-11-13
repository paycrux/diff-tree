export interface SyncResult {
  success: boolean;
  error?: Error;
  conflictFiles?: string[];
  noChanges?: boolean;
}

export interface CommitOptions {
  filePath: string;
  fromRef: string;
  toRef: string;
  message?: string;
}
