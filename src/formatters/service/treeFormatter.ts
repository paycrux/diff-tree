import { table } from 'table';
import { DiffAnalysis } from '../../types/index.js';
import { FormatterOptions } from '../types.js';
import { buildDirectoryTree, colorMap, DirectoryNode, getChangeIcon } from '../utils.js';

export class TreeFormatter {
  constructor(private readonly options: FormatterOptions) {}

  formatTree(analysis: DiffAnalysis): string {
    const tree = buildDirectoryTree(analysis.changes);
    const treeData = this.convertTreeToTableData(tree);
    return table(treeData);
  }

  private convertTreeToTableData(root: DirectoryNode): string[][] {
    const header = [
      this.colorize('default', 'Path'),
      this.colorize('default', 'Type'),
      this.colorize('default', 'Changes'),
    ];

    const rows = this.flattenTree(root).map((node) => [
      this.formatPath(node),
      this.formatType(node),
      this.formatChanges(node),
    ]);

    return [header, ...rows];
  }

  private flattenTree(node: DirectoryNode, depth = 0): Array<DirectoryNode & { depth: number }> {
    const result: Array<DirectoryNode & { depth: number }> = [{ ...node, depth }];

    if (node.children) {
      node.children
        .sort((a, b) => a.path.localeCompare(b.path))
        .forEach((child) => {
          result.push(...this.flattenTree(child, depth + 1));
        });
    }

    return result;
  }

  private formatPath(node: DirectoryNode & { depth: number }): string {
    const indent = ' '.repeat(node.depth * 2);
    const icon = this.options.showIcons ? getChangeIcon(node.type) : '';
    const displayPath = node.path.split('/').pop() || node.path;

    // 파일 타입에 따른 색상 선택
    const colorType = node.type === 'dir' ? 'dir' : node.fileType || 'default';

    return `${indent}${icon} ${this.colorize(colorType, displayPath)}`;
  }

  private formatType(node: DirectoryNode): string {
    if (node.type === 'dir') return '';

    const prefixIcon = this.options.showIcons ? getChangeIcon(node?.fileType || 'default') : '';
    return `${prefixIcon} ${this.colorize(node.fileType || 'default', node.fileType || '')}`;
  }

  private formatChanges(node: DirectoryNode): string {
    const WARNING_THRESHOLD = 500;
    const changes = this.colorizeChanges(node.insertions, node.deletions);
    const warning =
      node.type === 'file' && (node.insertions > WARNING_THRESHOLD || node.deletions > WARNING_THRESHOLD)
        ? getChangeIcon('warning')
        : '';
    return `${warning} ${changes}`.trim();
  }

  private colorizeChanges(insertions: number, deletions: number): string {
    const parts: string[] = [];

    if (insertions > 0) {
      parts.push(this.colorize('added', `+${insertions}`));
    }

    if (deletions > 0) {
      parts.push(this.colorize('deleted', `-${deletions}`));
    }

    return parts.length > 0 ? parts.join(this.colorize('default', '/')) : this.colorize('default', '0');
  }

  private colorize(type: string, text: string): string {
    if (!this.options.colorize) return text;
    const colorFn = colorMap[type as keyof typeof colorMap] ?? colorMap.default;
    return colorFn(text);
  }
}
