import { DiffAnalysis } from '../types/index.js';

export enum FormatType {
  PLAIN = 'plain',
  TREE = 'tree',
  JSON = 'json',
}

export type FormatterOptions = {
  format: FormatType;
  colorize?: boolean;
  showIcons?: boolean;
  maxDepth?: number;
};

export interface IFormatter {
  format(analysis: DiffAnalysis, options: FormatterOptions): string;
}
