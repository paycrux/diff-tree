// src/cli/utils/details.ts
import { execSync } from 'child_process';
import chalk from 'chalk';

interface FileDetails {
  path: string;
  fromRef: string;
  toRef: string;
  content: string;
  diff: string;
}

export async function getFileDetails(
  filePath: string,
  { fromRef, toRef }: { fromRef: string; toRef: string },
): Promise<FileDetails> {
  try {
    const diff = execSync(`git diff ${fromRef}..${toRef} -- "${filePath}"`, {
      encoding: 'utf-8',
    });

    return {
      path: filePath,
      fromRef,
      toRef,
      diff,
      content: diff,
    };
  } catch (error) {
    throw new Error(`Failed to get file details`);
  }
}

export function formatDetails(details: FileDetails): string {
  let output = '';

  // Header
  output += chalk.bold(`\nFile: ${details.path}\n`);
  output += chalk.gray(`Comparing ${details.fromRef} → ${details.toRef}\n\n`);

  // Diff content
  const lines = details.diff.split('\n');
  lines.forEach((line) => {
    if (line.startsWith('+')) {
      output += chalk.green(line) + '\n';
    } else if (line.startsWith('-')) {
      output += chalk.red(line) + '\n';
    } else if (line.startsWith('@@ ')) {
      output += chalk.cyan(line) + '\n';
    } else {
      output += line + '\n';
    }
  });

  return output;
}
