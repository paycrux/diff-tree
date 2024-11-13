// src/cli/core/commands/compare.command.ts
import { DiffService, DiffServiceOptions } from '../../../services/index.js';

export class CompareCommand {
  constructor(private readonly diffService: DiffService, private readonly options: DiffServiceOptions) {}

  async execute(): Promise<void> {
    const result = await this.diffService.compare(this.options);
    console.log(result.formatted);
  }
}
