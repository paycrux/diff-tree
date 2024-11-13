// src/services/types.ts
import { DiffAnalysis, CompareOptions } from '../types/index.js';
import { FormatType } from '../domain/formatter/types.js';

export interface DiffServiceOptions extends CompareOptions {
  formatOptions?: {
    type: FormatType;
    colorize?: boolean;
    showIcons?: boolean;
  };
}

export interface DiffResult {
  analysis: DiffAnalysis;
  formatted: string;
}

export interface SyncServiceOptions {
  fromRef: string;
  toRef: string;
  targetPath: string;
  workspacePath?: string;
}
