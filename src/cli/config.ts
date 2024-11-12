export const PROMPT_CONFIG = {
  defaults: {
    baseBranch: 'master',
  },
} as const;

export const validators = {
  nonEmpty: (input: string): boolean | string => input.trim().length > 0 || 'Input cannot be empty',
};
