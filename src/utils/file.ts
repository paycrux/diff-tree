// src/utils/file.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { CustomError } from './error.js';
import { ErrorTypes } from '../types/index.js';

export class FileUtils {
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
}
