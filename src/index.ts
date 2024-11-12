#!/usr/bin/env node

// src/index.ts
import { CLI } from './cli/index.js';
import chalk from 'chalk';

async function main() {
  const cli = new CLI();
  await cli.run();
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
