import { PROMPT_CONFIG, validators } from "./config.js";
import inquirer from "inquirer";

export async function getModeSelection() {
  return inquirer.prompt([
    {
      type: "list",
      name: "compareMode",
      message: "Select comparison mode:",
      choices: [
        {
          name: "Compare directories",
          value: "directories" as const,
          short: "Directories",
        },
        {
          name: "Compare commits/branches",
          value: "commits" as const,
          short: "Commits/branches",
        },
      ],
    },
  ]);
}

export async function getFormatSelection() {
  return inquirer.prompt([
    {
      type: "list",
      name: "format",
      message: "Select output format:",
      choices: [
        {
          name: "Tree view",
          value: "tree" as const,
          short: "Tree",
        },
        {
          name: "Plain text",
          value: "plain" as const,
          short: "Plain",
        },
        {
          name: "JSON",
          value: "json" as const,
          short: "JSON",
        },
      ],
    },
  ]);
}

export async function getCommitCompareAnswers() {
  return inquirer.prompt([
    {
      type: "input",
      name: "fromRef",
      message: "Enter the starting reference:",
      validate: validators.nonEmpty,
    },
    {
      type: "input",
      name: "toRef",
      message: "Enter the ending reference:",
      validate: validators.nonEmpty,
    },
  ]);
}

export async function getDirectoryCompareAnswers() {
  const dirAnswers = await inquirer.prompt([
    {
      type: "input",
      name: "baseBranch",
      message: "Enter the base branch:",
      default: PROMPT_CONFIG.defaults.baseBranch,
      validate: validators.nonEmpty,
    },
    {
      type: "input",
      name: "fromDir",
      message: "Enter the first directory path:",
      validate: validators.nonEmpty,
    },
    {
      type: "input",
      name: "toDir",
      message: "Enter the second directory path:",
      validate: validators.nonEmpty,
    },
  ]);

  return {
    ...dirAnswers,
    fromRef: `${dirAnswers.baseBranch}:${dirAnswers.fromDir}`,
    toRef: `${dirAnswers.baseBranch}:${dirAnswers.toDir}`,
  };
}

export async function getPatternAnswers() {
  return inquirer.prompt([
    {
      type: "confirm",
      name: "usePattern",
      message: "Do you want to filter files by pattern?",
      default: false,
    },
    {
      type: "input",
      name: "pattern",
      message: 'Enter file pattern (e.g., "*.ts"):',
      when: (answers) => answers.usePattern,
    },
  ]);
}
