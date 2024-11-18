// src/domain/analyzer/git-analyzer.ts
import path from 'path';
import { GitUtils } from '../../utils/git.js';
import { ValidationUtils } from '../../utils/validation.js';
import { DiffAnalysis, FileChange, CompareOptions, ErrorTypes, CustomError } from '../../types/index.js';
import { IGitAnalyzer } from './types.js';

export class GitAnalyzer implements IGitAnalyzer {
  constructor(private repoPath: string = process.cwd()) {}

  /**
   * Git diff 분석을 수행합니다.
   */
  public async analyzeDiff(options: CompareOptions): Promise<DiffAnalysis> {
    const { fromRef, toRef, filterPattern, includeMergeCommits } = options;

    // 레퍼런스 유효성 검사
    const [isFromValid, isToValid] = await Promise.all([
      GitUtils.isValidRef(fromRef, this.repoPath),
      GitUtils.isValidRef(toRef, this.repoPath),
    ]);

    if (!isFromValid || !isToValid) {
      throw new CustomError('Invalid git reference provided', ErrorTypes.INVALID_REFERENCE, { fromRef, toRef });
    }

    // diff 명령어 구성
    let diffCommand = `git diff --numstat ${fromRef} ${toRef}`;
    if (!includeMergeCommits) {
      diffCommand += ' --no-merges';
    }

    // diff 실행 및 결과 파싱
    const numstatOutput = await GitUtils.executeCommand(diffCommand, {
      cwd: this.repoPath,
    });
    let changes = this.parseNumstat(numstatOutput);

    // 필터 패턴 적용
    if (filterPattern) {
      try {
        ValidationUtils.validateRegexPattern(filterPattern);
        const regex = new RegExp(filterPattern);
        changes = changes.filter((change) => regex.test(change.path));
      } catch (error) {
        if (error instanceof CustomError) throw error;
        throw new CustomError('Invalid filter pattern', ErrorTypes.INVALID_FILTER_PATTERN, { pattern: filterPattern });
      }
    }

    return this.generateAnalysis(changes);
  }

  /**
   * 태그 간 diff 분석을 수행합니다.
   */
  public async analyzeTagRange(fromTag: string, toTag: string): Promise<DiffAnalysis> {
    return this.analyzeDiff({ fromRef: fromTag, toRef: toTag });
  }

  /**
   * Git diff --numstat 결과를 파싱하여 FileChange 객체로 변환합니다.
   */
  private parseNumstat(numstatOutput: string): FileChange[] {
    return numstatOutput
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const [insertions, deletions, filePath] = line.split('\t');

        let type: FileChange['type'] = 'modified';
        if (insertions === '0' && deletions !== '0') type = 'deleted';
        else if (insertions !== '0' && deletions === '0') type = 'added';

        return {
          path: filePath,
          type,
          insertions: parseInt(insertions) || 0,
          deletions: parseInt(deletions) || 0,
          extension: path.extname(filePath).toLowerCase(),
        };
      });
  }

  /**
   * 파일 변경사항 목록으로부터 통계를 생성합니다.
   */
  private generateAnalysis(changes: FileChange[]): DiffAnalysis {
    // 기본 통계 계산
    const stats = changes.reduce(
      (acc, change) => ({
        filesChanged: changes.length,
        insertions: acc.insertions + change.insertions,
        deletions: acc.deletions + change.deletions,
      }),
      { filesChanged: 0, insertions: 0, deletions: 0 }
    );

    // 파일 타입별 통계 계산
    const byFileType = changes.reduce<DiffAnalysis['byFileType']>((acc, change) => {
      const ext = change.extension || 'no-extension';

      return {
        ...acc,
        [ext]: {
          count: (acc[ext]?.count || 0) + 1,
          insertions: (acc[ext]?.insertions || 0) + change.insertions,
          deletions: (acc[ext]?.deletions || 0) + change.deletions,
        },
      };
    }, {});

    return { stats, byFileType, changes };
  }
}
