import * as readline from "readline";
import ora from "ora";
import { FileChange, GitCommand } from "../../types/index.js";
import { CommandContext } from "../context/index.js";
import { PROMPT } from "../prompt.js";
import { RouteManager } from "../routes/router.js";
import { actionCreators } from "../../state/store.js";
import { FileMerger } from "../../sync/merger.js";
import { CommitManager } from "../../sync/commit.js";
import inquirer from "inquirer";
import { VSCodeIntegration } from "../../sync/vscode.js";
import chalk from "chalk";

export interface InteractiveCommandOptions {
  sync?: boolean;
}

export class InteractiveCompareCommand implements GitCommand {
  private routeManager: RouteManager;
  private merger: FileMerger;
  private commitManager: CommitManager;

  constructor(
    private context: CommandContext,
    private options: InteractiveCommandOptions
  ) {
    this.routeManager = new RouteManager(context);
    this.merger = new FileMerger(process.cwd());
    this.commitManager = new CommitManager(process.cwd());
  }

  async execute(): Promise<void> {
    console.clear();

    const answers = await PROMPT.modeSelection()
      .then((answers) => {
        if (answers.compareMode === "commits") return PROMPT.compareCommit();
        return PROMPT.getDirectoryCompareAnswers();
      })
      .then(({ fromRef, toRef, ...rest }) => {
        this.context.dispatch(actionCreators.updateRefs({ fromRef, toRef }));
        return { fromRef, toRef, ...rest };
      });

    const formatAnswer = await PROMPT.formatSelection();
    this.context.formatter.updateOptions({ format: formatAnswer.format });

    const patternAnswers = await PROMPT.usePatternFilter();

    try {
      this.context.dispatch(actionCreators.startAnalysis());

      const analysis = await this.context.analyzer.analyzeDiff({
        fromRef: answers.fromRef,
        toRef: answers.toRef,
        filterPattern: patternAnswers.pattern,
      });

      this.context.dispatch(actionCreators.completeAnalysis(analysis));

      // 먼저 분석 결과를 보여줌
      console.clear();
      console.log(chalk.bold("\nAnalysis Results:"));
      console.log(this.context.formatter.format(analysis));

      if (this.options.sync) {
        const { confirmed } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmed",
            message: "Do you want to proceed with synchronization?",
            default: true,
          },
        ]);

        if (confirmed) {
          await this.handleSyncWorkflow(analysis.changes);
        } else {
          await this.routeManager.showFileSelectionRoute(analysis.changes);
        }
      } else {
        await this.routeManager.showFileSelectionRoute(analysis.changes);
      }
    } catch (error) {
      this.context.dispatch({ type: "ANALYSIS_ERROR", payload: error });
      throw error;
    }
  }

  private async handleSyncWorkflow(files: FileChange[]) {
    const spinner = ora();
    const state = this.context.getState();
    const { fromRef, toRef } = state.analysis.refs;

    if (!fromRef || !toRef) {
      throw new Error("Reference not found");
    }

    let currentIndex = 0;
    const totalFiles = files.length;

    while (currentIndex < totalFiles) {
      const currentFile = files[currentIndex];
      console.clear();

      // 현재 진행 상황 표시
      console.log(
        chalk.bold(`\nProcessing file ${currentIndex + 1}/${totalFiles}`)
      );
      console.log(chalk.cyan(`File: ${currentFile.path}`));
      console.log(chalk.dim("─".repeat(process.stdout.columns)));

      // VSCode로 diff 보기를 Promise로 실행하고 바로 다음 단계로 진행
      VSCodeIntegration.openDiffView({
        fromRef,
        toRef,
        filePath: currentFile.path,
        workspacePath: process.cwd(),
      })
        .then(() => {
          // VSCode 실행 성공
        })
        .catch((error) => {
          console.error(chalk.red("\nError opening VSCode:"), error);
        });

      // VSCode 실행 직후 잠시 대기 (UI가 안정화되도록)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 사용자 액션 프롬프트
      const { action } = await PROMPT.syncActionPrompt(currentFile.path);

      switch (action) {
        case "confirm": {
          spinner.start("Synchronizing file...");
          const syncResult = await this.merger.syncFile(
            currentFile.path,
            fromRef,
            toRef
          );

          if (!syncResult.success) {
            spinner.fail("Synchronization failed");
            const { shouldContinue } = await inquirer.prompt([
              {
                type: "confirm",
                name: "shouldContinue",
                message: "Sync failed. Do you want to continue with next file?",
                default: true,
              },
            ]);
            if (!shouldContinue) return;
            currentIndex++;
            continue;
          }

          spinner.succeed("Synchronization completed");

          spinner.start("Creating commit...");
          await this.commitManager.createSyncCommit({
            filePath: currentFile.path,
            fromRef,
            toRef,
          });
          spinner.succeed("Changes committed");

          currentIndex++;
          break;
        }

        case "skip":
          currentIndex++;
          break;

        case "next":
          if (currentIndex < totalFiles - 1) currentIndex++;
          break;

        case "prev":
          if (currentIndex > 0) currentIndex--;
          break;

        case "list":
          return;
      }
    }

    console.log(chalk.green("\nSync workflow completed!"));
  }
}
