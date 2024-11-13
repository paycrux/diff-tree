import { DiffAnalysis } from '../types/index.js';

/**
 * @deprecated
 */
export enum FormatType {
  PLAIN = 'plain',
  TREE = 'tree',
  JSON = 'json',
}

/**
 * @deprecated
 */
export type FormatterOptions = {
  format: FormatType;
  colorize?: boolean;
  showIcons?: boolean;
  maxDepth?: number;
};

/**
 * @deprecated
 */
export interface IFormatter {
  format(analysis: DiffAnalysis, options: FormatterOptions): string;
}
