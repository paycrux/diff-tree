// src/utils/tree.ts
import chalk from 'chalk';
import { FileChange } from '../types/index.js';
import path from 'path';

export interface DirectoryNode {
  path: string;
  type: 'dir' | 'file';
  insertions: number;
  deletions: number;
  children?: DirectoryNode[];
  fileType?: 'added' | 'modified' | 'deleted' | 'renamed';
}

export function buildDirectoryTree(changes: FileChange[]): DirectoryNode {
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

  // root의 children이 하나만 있고 그게 디렉토리라면 해당 노드를 반환
  if (root.children && root.children.length === 1 && root.children[0].type === 'dir') {
    return root.children[0];
  }

  return root;
}

export function formatChangeCount(insertions: number, deletions: number): string {
  return `[+${insertions} -${deletions}]`;
}

export function getChangeIcon(type: string): string {
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

export const colorMap = {
  added: chalk.green,
  deleted: chalk.red,
  modified: chalk.yellow,
  renamed: chalk.blue,
  default: chalk.white,
  dir: chalk.dim,
} as const;
