import { CompareOptions, DiffAnalysis } from '../../types/index.js';

export interface IGitAnalyzer {
  analyzeDiff(options: CompareOptions): Promise<DiffAnalysis>;
}
