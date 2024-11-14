// src/services/types.ts
import { DiffAnalysis, CompareOptions, GitRefs } from '../types/index.js';
import { FormatType } from '../domain/formatter/types.js';

export interface DiffServiceOptions extends CompareOptions {
  formatOptions?: {
    type: FormatType;
    colorize?: boolean;
  };
}

export interface DiffResult {
  analysis: DiffAnalysis;
  formatted: string;
}

export interface SyncServiceOptions extends GitRefs {
  targetPath: string;
  workspacePath?: string;
}
