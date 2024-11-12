// src/analyzer/git.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { DiffAnalysis, ErrorTypes, FileChange, GitDiffError, CompareOptions } from '../types/index.js';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Git 명령어 실행 및 분석을 담당하는 Class
 * @class GitAnalyzer
 */
export class GitAnalyzer {
  private repoPath: string;

  /**
   * @constructor
   * @param {string} repoPath Git 저장소 경로, 기본값은 현재 디렉토리
   */
  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
  }

  /**
   * Git 명령어를 싱행하고 결과 반환
   * @private
   * @param command 실행할 Git 명령어
   * @returns Git 명령어 실행 결과
   * @throws {GitDiffError} Git 명령어 실행 실패 시
   */
  private async execGitCommand(command: string) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.repoPath,
      });

      if (stderr && !stderr.includes('warning:')) {
        throw new GitDiffError(stderr, ErrorTypes.GIT_COMMAND_FAILED, {
          command,
        });
      }

      return stdout.trim();
    } catch (e: any) {
      throw new GitDiffError(`Git command failed: ${e.message}`, ErrorTypes.GIT_COMMAND_FAILED, {
        command,
        originalError: e,
      });
    }
  }

  /**
   * Git Ref가 유효한지 확인
   * @private
   * @param ref 확인할 Git Ref
   * @returns 유효한 Ref 여부
   */
  private async isValidRef(ref: string) {
    try {
      await this.execGitCommand(`git rev-parse --verify ${ref}`);
      return true;
    } catch (e: any) {
      return false;
    }
  }

  /**
   * Git diff --numstat 결과를 파싱하여 FileChange 객체로 변환
   * @private
   * @param {string} numstatOutput - git diff --numstat 명령어의 출력
   * @returns {FileChange[]} 파일 변경사항 목록
   */
  private parseNumstat(numstatOutput: string): FileChange[] {
    return numstatOutput
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const [insertions, deletions, filePath] = line.split('\t');

        // 파일 변경 타입 감지
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
   * 파일 변경사항 목록으로부터 통계 생성
   * @private
   * @param {FileChange[]} changes - 파일 변경사항 목록
   * @returns {DiffAnalysis} 분석 결과
   */
  private generateAnalysis(changes: FileChange[]): DiffAnalysis {
    const stats = {
      filesChanged: changes.length,
      insertions: 0,
      deletions: 0,
    };

    const byFileType: DiffAnalysis['byFileType'] = {};

    for (const change of changes) {
      // 전체 통계 업데이트
      stats.insertions += change.insertions;
      stats.deletions += change.deletions;

      // 파일 타입별 통계 업데이트
      const ext = change.extension || 'no-extension';
      if (!byFileType[ext]) {
        byFileType[ext] = { count: 0, insertions: 0, deletions: 0 };
      }
      byFileType[ext].count++;
      byFileType[ext].insertions += change.insertions;
      byFileType[ext].deletions += change.deletions;
    }

    return { stats, changes, byFileType };
  }

  /**
   * Git diff 분석 수행
   * @public
   * @param {CompareOptions} options - diff 분석 옵션
   * @returns {Promise<DiffAnalysis>} 분석 결과
   * @throws {GitDiffError} 분석 실패시
   */
  public async analyzeDiff(options: CompareOptions): Promise<DiffAnalysis> {
    const { fromRef, toRef, filterPattern, includeMergeCommits } = options;

    // 레퍼런스 유효성 검사
    const [isFromValid, isToValid] = await Promise.all([this.isValidRef(fromRef), this.isValidRef(toRef)]);

    if (!isFromValid || !isToValid) {
      throw new GitDiffError('Invalid git reference provided', ErrorTypes.INVALID_REFERENCE, { fromRef, toRef });
    }

    // diff 명령어 구성
    let diffCommand = `git diff --numstat ${fromRef} ${toRef}`;
    if (!includeMergeCommits) {
      diffCommand += ' --no-merges';
    }

    // diff 실행 및 결과 파싱
    const numstatOutput = await this.execGitCommand(diffCommand);
    let changes = this.parseNumstat(numstatOutput);

    // 필터 패턴 적용
    if (filterPattern) {
      try {
        const regex = new RegExp(filterPattern);
        changes = changes.filter((change) => regex.test(change.path));
      } catch (error) {
        throw new GitDiffError('Invalid filter pattern', ErrorTypes.INVALID_FILTER_PATTERN, { pattern: filterPattern });
      }
    }

    return this.generateAnalysis(changes);
  }

  /**
   * 태그 간 diff 분석
   * @public
   * @param {string} fromTag - 시작 태그
   * @param {string} toTag - 종료 태그
   * @returns {Promise<DiffAnalysis>} 분석 결과
   */
  public async analyzeTagRange(fromTag: string, toTag: string): Promise<DiffAnalysis> {
    return this.analyzeDiff({ fromRef: fromTag, toRef: toTag });
  }

  /**
   * 여러 커밋에 대한 순차적 diff 분석
   * @public
   * @param {string[]} commits - 분석할 커밋 해시 배열
   * @returns {Promise<DiffAnalysis[]>} 각 커밋 간 분석 결과 배열
   */
  public async analyzeCommits(commits: string[]): Promise<DiffAnalysis[]> {
    const analyses: DiffAnalysis[] = [];

    for (let i = 0; i < commits.length - 1; i++) {
      const analysis = await this.analyzeDiff({
        fromRef: commits[i],
        toRef: commits[i + 1],
      });
      analyses.push(analysis);
    }

    return analyses;
  }
}
