// src/domain/formatter/types.ts
import { DiffAnalysis } from '../../types/index.js';

export enum FormatType {
  PLAIN = 'plain',
  TREE = 'tree',
  JSON = 'json',
}

export interface FormatterOptions {
  format: FormatType;
  colorize?: boolean;
  showIcons?: boolean;
  maxDepth?: number;
}

export interface IFormatter {
  format(analysis: DiffAnalysis): string;
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
