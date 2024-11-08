import inquirer from "inquirer";
import { ErrorTypes, FileChange, GitDiffError } from "../../types/index.js";
import { CommandContext } from "../context/index.js";
import ora from "ora";
import { formatDetails, getFileDetails } from "../utils/details.js";

export class RouteManager {
  constructor(private context: CommandContext) {}

  async showFileSelectionRoute(files: FileChange[]) {
    const { events, store, formatter } = this.context;
    const state = store.getState();
    const analysis = state.analysis.currentAnalysis;

    if (!analysis)
      throw new GitDiffError(
        "No analysis available",
        ErrorTypes.NO_ANALYSIS_AVAILABLE
      );

    console.clear(); // 먼저 화면 지우기
    const tableOutput = formatter.format({ ...analysis, changes: files });
    console.log(tableOutput);

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "Select a file to view details or choose an action:",
        choices: [
          ...files.map((file) => ({
            name: `${file.path} (${file.insertions} insertions, ${file.deletions} deletions)`,
            value: { type: "file", path: file.path },
          })),
          { name: "Back to main menu", value: { type: "back" } },
          { name: "Exit", value: { type: "exit" } },
        ],
      },
    ]);

    switch (answers.action.type) {
      case "file":
        await this.showFileDetails(answers.action.path);
        break;
      case "back":
        events.emit("navigation:main", null);
        break;
      case "exit":
        process.exit(0);
    }
  }

  private async showFileDetails(filePath: string): Promise<void> {
    const { events, store } = this.context;
    const state = store.getState();
    const { fromRef, toRef } = state.analysis.refs;

    const spinner = ora("Fetching file details...").start();

    try {
      if (!fromRef || !toRef) return;
      const details = await getFileDetails(filePath, { fromRef, toRef });

      spinner.succeed("Details retrieved");

      console.clear();
      console.log(formatDetails(details));

      await this.showDetailActionMenu(filePath);
    } catch (error) {
      spinner.fail("Failed to fetch details");
      throw error;
    }
  }

  private async showDetailActionMenu(currentFilePath: string): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { name: "Back to file list", value: "list" },
          { name: "Back to main menu", value: "main" },
          { name: "Exit", value: "exit" },
        ],
      },
    ]);

    switch (answers.action) {
      case "list":
        const state = this.context.store.getState();
        await this.showFileSelectionRoute(
          state.analysis.currentAnalysis!.changes
        );
        break;
      case "main":
        this.context.events.emit("navigation:main", null);
        break;
      case "exit":
        process.exit(0);
    }
  }
}
