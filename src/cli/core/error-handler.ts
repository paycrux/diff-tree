// src/cli/core/error-handler.ts
import chalk from 'chalk';
import { CustomError } from '../../types/index.js';

export class ErrorHandler {
  handle(error: unknown): void {
    if (error instanceof CustomError) {
      this.handleCustomError(error);
    } else {
      this.handleUnknownError(error);
    }
  }

  private handleCustomError(error: CustomError): void {
    console.error(chalk.red(`\nError (${error.type}):`), error.message);

    if (error.details && process.env.DEBUG) {
      console.error(chalk.yellow('\nDetails:'), JSON.stringify(error.details, null, 2));
    }
  }

  private handleUnknownError(error: unknown): void {
    console.error(
      chalk.red('\nUnexpected Error:'),
      error instanceof Error ? error.message : 'An unknown error occurred'
    );

    if (process.env.DEBUG) {
      console.error('\nStack trace:', error);
    }
  }
}
