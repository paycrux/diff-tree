// src/utils/error.ts
export class CustomError extends Error {
  constructor(message: string, public readonly type: string, public readonly details?: any) {
    super(message);
    this.name = 'CustomError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      details: this.details,
    };
  }
}
