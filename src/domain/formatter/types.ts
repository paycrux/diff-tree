// src/domain/formatter/types.ts
import { DiffAnalysis, FileDetails } from '../../types/index.js';

export enum FormatType {
  PLAIN = 'plain',
  TREE = 'tree',
  JSON = 'json',
}

export interface FormatterOptions {
  format: FormatType;
  colorize?: boolean;
  maxDepth?: number;
}

export interface IFormatter {
  format(analysis: DiffAnalysis): string;
  formatDetails(details: FileDetails): string;
  updateOptions(newOptions: Partial<FormatterOptions>): void;
}

export interface DirectoryNode {
  path: string;
  type: 'dir' | 'file';
  insertions: number;
  deletions: number;
  children?: DirectoryNode[];
  fileType?: 'added' | 'modified' | 'deleted' | 'renamed';
}
