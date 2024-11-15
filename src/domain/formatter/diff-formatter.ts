// src/domain/formatter/diff-formatter.ts
import chalk from 'chalk';
import { table } from 'table';
import { FormatType, FormatterOptions, DirectoryNode, IFormatter } from './types.js';
import { FormatterUtils, colorMap } from './utils.js';
import { DiffAnalysis, FileDetails } from '../../types/index.js';

export class DiffFormatter implements IFormatter {
  constructor(
    private options: FormatterOptions = {
      format: FormatType.TREE,
    }
  ) {}

  updateOptions(newOptions: Partial<FormatterOptions>) {
    this.options = { ...this.options, ...newOptions };
  }

  format(analysis: DiffAnalysis) {
    switch (this.options.format) {
      case FormatType.TREE:
        return this.formatTree(analysis);
      case FormatType.JSON:
        return this.formatJson(analysis);
      default:
        return this.formatPlain(analysis);
    }
  }

  formatDetails(details: FileDetails) {
    let output = '';

    // Header
    output += chalk.bold(FormatterUtils.getChangeIcon('file'));
    output += chalk.gray(`Comparing ${details.fromRef} → ${details.toRef}\n\n`);

    // Diff Content
    const lines = details.diff.split('\n');
    lines.forEach((line) => {
      if (line.startsWith('+')) {
        output += chalk.green(line) + '\n';
      } else if (line.startsWith('-')) {
        output += chalk.red(line) + '\n';
      } else if (line.startsWith('@@')) {
        output += chalk.cyan(line) + '\n';
      } else {
        output += line + '\n';
      }
    });

    return output;
  }

  private formatTree(analysis: DiffAnalysis): string {
    const tree = FormatterUtils.buildDirectoryTree(analysis.changes);
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
    const icon = FormatterUtils.getChangeIcon(node.type);
    const displayPath = node.path.split('/').pop() || node.path;
    const colorType = node.type === 'dir' ? 'dir' : node.fileType || 'default';

    return `${indent}${icon} ${this.colorize(colorType, displayPath)}`;
  }

  private formatType(node: DirectoryNode): string {
    if (node.type === 'dir') return '';

    const prefixIcon = FormatterUtils.getChangeIcon(node?.fileType || 'default');
    return `${prefixIcon} ${this.colorize(node.fileType || 'default', node.fileType || '')}`;
  }

  private formatChanges(node: DirectoryNode): string {
    const WARNING_THRESHOLD = 500;
    const changes = this.colorizeChanges(node.insertions, node.deletions);
    const warning =
      node.type === 'file' && (node.insertions > WARNING_THRESHOLD || node.deletions > WARNING_THRESHOLD)
        ? FormatterUtils.getChangeIcon('warning')
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
    const colorFn = colorMap[type as keyof typeof colorMap] ?? colorMap.default;
    return colorFn(text);
  }

  private formatJson(analysis: DiffAnalysis): string {
    return JSON.stringify(analysis, null, 2);
  }

  private formatPlain(analysis: DiffAnalysis): string {
    let output = '';

    // Overall Statistics
    output += this.colorize('default', '\nOverall Statistics:\n');
    output += `Files Changed: ${analysis.stats.filesChanged}\n`;
    output += `Insertions: ${this.colorize('added', analysis.stats.insertions.toString())}\n`;
    output += `Deletions: ${this.colorize('deleted', analysis.stats.deletions.toString())}\n`;

    // By File Type
    output += this.colorize('default', '\nBy File Type:\n');
    const typeData = Object.entries(analysis.byFileType).map(([ext, stats]) => [
      ext,
      stats.count,
      this.colorize('added', stats.insertions.toString()),
      this.colorize('deleted', stats.deletions.toString()),
    ]);

    output += table([['Extension', 'Count', 'Insertions', 'Deletions'], ...typeData]);

    // Changed Files
    output += this.colorize('default', '\nChanged Files:\n');
    const fileData = analysis.changes.map((change) => [
      change.path,
      this.colorize(change.type, change.type),
      `${this.colorize('added', `+${change.insertions.toString()}`)}/${this.colorize(
        'deleted',
        `-${change.deletions.toString()}`
      )}`,
    ]);

    output += table([['Path', 'Type', 'Changes'], ...fileData]);

    return output;
  }
}
