// src/domain/formatter/utils.ts
import chalk from 'chalk';
import { DirectoryNode } from './types.js';
import { FileChange } from '../../types/index.js';

export const colorMap = {
  added: chalk.green,
  deleted: chalk.red,
  modified: chalk.yellow,
  renamed: chalk.blue,
  default: chalk.white,
  dir: chalk.dim,
} as const;

export class FormatterUtils {
  static getChangeIcon(type: string): string {
    const icons = {
      dir: '📁',
      file: '📄',
      modified: '📝',
      deleted: '❌',
      renamed: '🔄',
      added: '✨',
      warning: '🚨',
      default: '',
    };
    return icons[type as keyof typeof icons] || '';
  }

  static buildDirectoryTree(changes: FileChange[]): DirectoryNode {
    const root: DirectoryNode = {
      path: '',
      type: 'dir',
      insertions: 0,
      deletions: 0,
      children: [],
    };

    changes.forEach((change) => {
      const pathParts = change.path.split('/');
      let currentNode = root;
      let currentPath = '';

      pathParts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isFile = index === pathParts.length - 1;

        let node = currentNode.children?.find((n) => n.path === currentPath);

        if (!node) {
          node = {
            path: currentPath,
            type: isFile ? 'file' : 'dir',
            insertions: isFile ? change.insertions : 0,
            deletions: isFile ? change.deletions : 0,
            ...(isFile ? { fileType: change.type } : { children: [] }),
          };
          currentNode.children?.push(node);
        }

        if (!isFile) {
          node.insertions += change.insertions;
          node.deletions += change.deletions;
        }

        currentNode = node;
      });
    });

    return root.children && root.children.length === 1 && root.children[0].type === 'dir' ? root.children[0] : root;
  }

  static formatChangeCount(insertions: number, deletions: number): string {
    const parts: string[] = [];
    if (insertions > 0) parts.push(`+${insertions}`);
    if (deletions > 0) parts.push(`-${deletions}`);
    return parts.join('/') || '0';
  }

  static LINE_FORMATTERS = [
    {
      type: 'addition',
      matcher: (line: string) => line.startsWith('+'),
      format: (line: string) => chalk.green(line),
    },
    {
      type: 'deletion',
      matcher: (line: string) => line.startsWith('-'),
      format: (line: string) => chalk.red(line),
    },
    {
      type: 'chunk',
      matcher: (line: string) => line.startsWith('@@'),
      format: (line: string) => chalk.cyan(line),
    },
  ];
}
