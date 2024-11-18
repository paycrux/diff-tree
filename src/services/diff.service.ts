// src/services/diff.service.ts
import { ValidationUtils } from '../utils/validation.js';
import { DiffServiceOptions, DiffResult } from './types.js';
import { CustomError, ErrorTypes, GitRefs } from '../types/index.js';
import { IGitAnalyzer } from '../domain/analyzer/types.js';
import { IFormatter } from '../domain/formatter/types.js';
import { GitUtils } from '../utils/git.js';

export class DiffService {
  constructor(private analyzer: IGitAnalyzer, private formatter: IFormatter) {}

  /**
   * 두 레퍼런스 간의 차이를 분석하고 포맷팅합니다.
   */
  async compare(options: DiffServiceOptions): Promise<DiffResult> {
    try {
      // 입력값 검증
      this.validateOptions(options);

      // 포매터 옵션 업데이트
      if (options.formatOptions) {
        this.formatter.updateOptions({
          format: options.formatOptions.type,
        });
      }

      // 분석 수행
      const analysis = await this.analyzer.analyzeDiff({
        fromRef: options.fromRef,
        toRef: options.toRef,
        filterPattern: options.filterPattern,
        includeMergeCommits: options.includeMergeCommits,
      });

      // 결과 포맷팅
      const formatted = this.formatter.format(analysis);

      return { analysis, formatted };
    } catch (error) {
      if (error instanceof CustomError) throw error;

      throw new CustomError('Failed to compare references', ErrorTypes.COMPARISON_FAILED, {
        options,
        originalError: error,
      });
    }
  }

  async viewFileDetails(filePath: string, refs: GitRefs) {
    const details = await GitUtils.getFileDetails(filePath, refs);
    return this.formatter.formatDetails({
      fromRef: refs.fromRef,
      toRef: refs.toRef,
      path: details.path,
      diff: details.diff,
    });
  }

  private validateOptions(options: DiffServiceOptions): void {
    ValidationUtils.validateNonEmpty(options.fromRef, 'fromRef');
    ValidationUtils.validateNonEmpty(options.toRef, 'toRef');

    if (options.filterPattern) {
      ValidationUtils.validateRegexPattern(options.filterPattern);
    }
  }
}
