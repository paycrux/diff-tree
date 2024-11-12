// src/formatters/index.ts
import chalk from 'chalk';
import { table } from 'table';
import { DiffAnalysis } from '../types/index.js';
import { FormatType, type FormatterOptions } from './types.js';
import { colorMap } from './utils.js';
import { TreeFormatter } from './service/treeFormatter.js';

export class DiffFormatter {
  private readonly treeFormatter: TreeFormatter;

  constructor(
    private options: FormatterOptions = {
      format: FormatType.TREE,
      colorize: true,
      showIcons: true,
    },
  ) {
    this.treeFormatter = new TreeFormatter(options);
  }

  public updateOptions(newOptions: Partial<FormatterOptions>) {
    this.options = { ...this.options, ...newOptions };
  }

  format(analysis: DiffAnalysis): string {
    switch (this.options.format) {
      case 'tree':
        return this.treeFormatter.formatTree(analysis);
      case 'json':
        return this.formatJson(analysis);
      default:
        return this.formatPlain(analysis);
    }
  }

  private formatPlain(analysis: DiffAnalysis): string {
    let output = '';

    // Overall Statistics
    output += chalk.bold('\nOverall Statistics:\n');
    output += chalk.blue(`Files Changed: ${analysis.stats.filesChanged}\n`);
    output += chalk.green(`Insertions: ${analysis.stats.insertions}\n`);
    output += chalk.red(`Deletions: ${analysis.stats.deletions}\n`);

    // By File Type
    output += chalk.bold('\nBy File Type:\n');
    const typeData = Object.entries(analysis.byFileType).map(([ext, stats]) => [
      ext,
      stats.count,
      this.colorize('added', stats.insertions.toString()),
      this.colorize('deleted', stats.deletions.toString()),
    ]);

    output += table([['Extension', 'Count', 'Insertions', 'Deletions'], ...typeData]);

    // Changed Files
    output += chalk.bold('\nChanged Files:\n');
    const fileData = analysis.changes.map((change) => [
      change.path,
      this.colorize(change.type, change.type),
      this.colorize('added', change.insertions.toString()),
      this.colorize('deleted', change.deletions.toString()),
    ]);

    output += table([['Path', 'Type', 'Insertions', 'Deletions'], ...fileData]);

    return output;
  }

  private formatJson(analysis: DiffAnalysis) {
    return JSON.stringify(analysis, null, 2);
  }

  private colorize(type: string, text: string) {
    if (!this.options.colorize) return text;
    const colorFn = colorMap[type as keyof typeof colorMap] ?? colorMap.default;
    return colorFn(text);
  }
}
