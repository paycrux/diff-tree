// src/utils/validation.ts
import { CustomError } from './error.js';
import { ErrorTypes } from '../types/index.js';

export class ValidationUtils {
  /**
   * 문자열이 비어있지 않은지 확인합니다.
   */
  static validateNonEmpty(value: string, fieldName: string): void {
    if (!value || value.trim().length === 0) {
      throw new CustomError(`${fieldName} cannot be empty`, ErrorTypes.VALIDATION_ERROR, { field: fieldName, value });
    }
  }

  /**
   * 정규식 패턴이 유효한지 확인합니다.
   */
  static validateRegexPattern(pattern: string): void {
    try {
      new RegExp(pattern);
    } catch (error) {
      throw new CustomError('Invalid regex pattern', ErrorTypes.INVALID_FILTER_PATTERN, {
        pattern,
        originalError: error,
      });
    }
  }
}
