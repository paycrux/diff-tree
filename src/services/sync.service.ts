// src/services/sync.service.ts
import { FileMerger } from '../domain/merger/file-merger.js';
import { SyncServiceOptions } from './types.js';
import { CustomError, ErrorTypes } from '../types/index.js';
import { ValidationUtils } from '../utils/validation.js';
import path from 'path';

export class SyncService {
  private merger: FileMerger;

  constructor(workspacePath: string = process.cwd()) {
    this.merger = new FileMerger(workspacePath);
  }

  /**
   * 파일 동기화를 수행합니다.
   */
  async syncFile(options: SyncServiceOptions) {
    try {
      this.validateSyncOptions(options);

      const result = await this.merger.syncFile(options.targetPath, options.fromRef, options.toRef);

      return result;
    } catch (error) {
      if (error instanceof CustomError) throw error;

      throw new CustomError('Failed to sync file', ErrorTypes.SYNC_FAILED, { options, originalError: error });
    }
  }

  private validateSyncOptions(options: SyncServiceOptions): void {
    ValidationUtils.validateNonEmpty(options.fromRef, 'fromRef');
    ValidationUtils.validateNonEmpty(options.toRef, 'toRef');
    ValidationUtils.validateNonEmpty(options.targetPath, 'targetPath');
  }
}
