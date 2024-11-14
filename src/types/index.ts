// src/types/index.ts

export interface GitRefs {
  fromRef: string;
  toRef: string;
}

/**
 * Git diff 분석을 위한 옵션 인터페이스
 * @interface CompareOptions
 */
export interface CompareOptions extends GitRefs {
  /** 파일 경로 필터링을 위한 정규식 패턴 (예: "*.ts", "src/*") */
  filterPattern?: string;
  /** merge 커밋 포함 여부 */
  includeMergeCommits?: boolean;
}

/**
 * 개별 파일의 변경사항을 나타내는 인터페이스
 * @interface FileChange
 */
export interface FileChange {
  /** 파일 경로 */
  path: string;
  /** 변경 유형 */
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  /** 추가된 라인 수 */
  insertions: number;
  /** 삭제된 라인 수 */
  deletions: number;
  /** 파일 확장자 (예: .ts, .js) */
  extension: string;
}

/**
 * diff 분석 전체 통계 정보
 * @interface DiffStats
 */
interface DiffStats {
  /** 변경된 총 파일 수 */
  filesChanged: number;
  /** 전체 추가된 라인 수 */
  insertions: number;
  /** 전체 삭제된 라인 수 */
  deletions: number;
}

/**
 * 파일 타입별 통계 정보
 * @interface TypeStats
 */
interface TypeStats {
  /** 해당 타입의 파일 수 */
  count: number;
  /** 해당 타입의 총 추가 라인 수 */
  insertions: number;
  /** 해당 타입의 총 삭제 라인 수 */
  deletions: number;
}

/**
 * Git diff 분석 결과를 포함하는 인터페이스
 * @interface DiffAnalysis
 * @example
 * {
 *   stats: { filesChanged: 10, insertions: 100, deletions: 50 },
 *   changes: [{ path: 'src/index.ts', type: 'modified', ... }],
 *   byFileType: { '.ts': { count: 5, insertions: 80, deletions: 30 } }
 * }
 */
export interface DiffAnalysis {
  /** 전체 통계 정보 */
  stats: DiffStats;
  /** 개별 파일 변경사항 목록 */
  changes: FileChange[];
  /** 파일 타입별 통계 정보 */
  byFileType: Record<string, TypeStats>;
}

export interface FileDetails extends GitRefs {
  path: string;
  diff: string;
}

/**
 * 에러 타입 정의
 */
export const ErrorTypes = {
  /** Git 명령어 실행 실패 */
  GIT_COMMAND_FAILED: 'GIT_COMMAND_FAILED',
  /** 유효하지 않은 레퍼런스 */
  INVALID_REFERENCE: 'INVALID_REFERENCE',
  /** 저장소 접근 실패 */
  REPOSITORY_ACCESS_FAILED: 'REPOSITORY_ACCESS_FAILED',
  /** 파일 필터링 패턴 오류 */
  INVALID_FILTER_PATTERN: 'INVALID_FILTER_PATTERN',
  /** CLI option 오류 **/
  INVALID_CLI_OPTIONS: 'INVALID_CLI_OPTIONS',
  /** 분석 결과 없음 */
  NO_ANALYSIS_AVAILABLE: 'NO_ANALYSIS_AVAILABLE',
  /** 유효성 검사 오류 */
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  /** 파일 시스템 오류 */
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  /** 비교 실패 */
  COMPARISON_FAILED: 'COMPARISON_FAILED',
  /** 유효하지 않은 파라미터 */
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
  /** FILE SYNC 실패 */
  SYNC_FAILED: 'SYNC_FAILED',
  /** 옵션 설정 오류 */
  CONFIG_ERROR: 'CLI OPTION CONFIG_ERROR',
} as const;

export { CustomError } from '../utils/error.js';
