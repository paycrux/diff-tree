#!/usr/bin/env node

// src/index.ts
import { CLIApplication } from './cli/core/app.js';
import chalk from 'chalk';

async function main() {
  const cli = new CLIApplication();
  await cli.run();
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
