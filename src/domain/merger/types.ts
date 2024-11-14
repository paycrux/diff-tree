import { GitRefs } from '../../types/index.js';

export interface SyncResult {
  success: boolean;
  error?: Error;
  conflictFiles?: string[];
  noChanges?: boolean;
}

export interface CommitOptions extends GitRefs {
  filePath: string;
  message?: string;
}
