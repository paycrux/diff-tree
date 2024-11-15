// src/utils/file.ts
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { CustomError } from './error.js';
import { ErrorTypes } from '../types/index.js';

export class FileUtils {
  /**
   * 현재 운영체제가 Windows인지 확인
   */
  static isWindows(): boolean {
    return os.platform() === 'win32';
  }

  /**
   * 경로를 플랫폼에 맞게 정규화
   * Windows에서는 백슬래시를 슬래시로 변환
   */
  static normalizePath(pathStr: string): string {
    // Git은 항상 forward slash를 사용하므로, Windows에서도 forward slash로 통일
    return pathStr.split(path.sep).join('/');
  }

  /**
   * 파일 존재 여부를 확인합니다.
   */
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 디렉토리를 재귀적으로 생성합니다.
   */
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      throw new CustomError(`Failed to create directory: ${error.message}`, ErrorTypes.FILE_SYSTEM_ERROR, {
        path: dirPath,
        originalError: error,
      });
    }
  }

  /**
   * 파일을 읽고 내용을 반환합니다.
   */
  static async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    try {
      return await fs.readFile(filePath, { encoding });
    } catch (error: any) {
      throw new CustomError(`Failed to read file: ${error.message}`, ErrorTypes.FILE_SYSTEM_ERROR, {
        path: filePath,
        originalError: error,
      });
    }
  }

  /**
   * 파일에 내용을 씁니다.
   */
  static async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await this.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error: any) {
      throw new CustomError(`Failed to write file: ${error.message}`, ErrorTypes.FILE_SYSTEM_ERROR, {
        path: filePath,
        originalError: error,
      });
    }
  }

  /**
   * 파일을 복사합니다.
   * @param sourcePath 원본 파일 경로
   * @param targetPath 대상 파일 경로
   */
  static async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    try {
      // 대상 디렉토리가 존재하는지 확인하고 없으면 생성
      await this.ensureDir(path.dirname(targetPath));

      // 파일 복사 수행
      await fs.copyFile(sourcePath, targetPath);
    } catch (error: any) {
      throw new CustomError(`Failed to copy file: ${error.message}`, ErrorTypes.FILE_SYSTEM_ERROR, {
        sourcePath,
        targetPath,
        originalError: error,
      });
    }
  }

  /**
   * 파일을 삭제합니다.
   * 파일이 존재하지 않는 경우 에러를 발생시키지 않습니다.
   * @param filePath 삭제할 파일 경로
   */
  static async removeFile(filePath: string): Promise<void> {
    try {
      // 파일이 존재하는 경우에만 삭제 시도
      if (await this.exists(filePath)) {
        await fs.unlink(filePath);
      }
    } catch (error: any) {
      throw new CustomError(`Failed to remove file: ${error.message}`, ErrorTypes.FILE_SYSTEM_ERROR, {
        path: filePath,
        originalError: error,
      });
    }
  }

  /**
   *
   * @example
   * getFullPath('master:packages/app', 'src/index.ts', '/home/project')
   * => '/home/project/packages/app/src/index.ts'
   */
  static getFullPath({
    filePath,
    workspacePath,
    ref,
  }: {
    filePath: string;
    workspacePath: string;
    ref: string;
  }): string {
    // ref가 dir경로를 포함하는 경우 (예: master:packages/@monorepo/some/dir)
    const [branch, ...pathParts] = ref.split(':');
    const refPath = pathParts.join(':');

    return path.normalize(path.join(workspacePath, refPath || '', filePath));
  }
}
