// src/cli/core/config.service.ts
import { cosmiconfig } from 'cosmiconfig';
import { ValidationUtils } from '../../utils/validation.js';
import { CustomError, ErrorTypes } from '../../types/index.js';

interface ConfigOptions {
  defaultBranch?: string;
  colorOutput?: boolean;
  showIcons?: boolean;
  defaultFormat?: string;
}

export class ConfigService {
  private config: ConfigOptions = {};

  async load(): Promise<void> {
    try {
      const explorer = cosmiconfig('diff-tree');
      const result = await explorer.search();

      if (result && !result.isEmpty) {
        this.validateConfig(result.config);
        this.config = result.config;
      }
    } catch (error) {
      throw new CustomError('Failed to load configuration', ErrorTypes.CONFIG_ERROR, { originalError: error });
    }
  }

  get<K extends keyof ConfigOptions>(key: K): ConfigOptions[K] | undefined {
    return this.config[key];
  }

  private validateConfig(config: unknown): void {
    // 설정 유효성 검사 로직
    if (typeof config !== 'object' || config === null) {
      throw new CustomError('Invalid configuration format', ErrorTypes.CONFIG_ERROR);
    }
  }
}
