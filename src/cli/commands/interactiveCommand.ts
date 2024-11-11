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

      if (this.options.sync) {
        await this.handleSyncWorkflow(analysis.changes);
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
    while (currentIndex < files.length) {
      const file = files[currentIndex];
      console.clear();

      // VSCode로 diff 보여주기
      await VSCodeIntegration.openDiffView({
        fromRef,
        toRef,
        filePath: file.path,
        workspacePath: process.cwd(),
      });

      // inquirer를 사용한 사용자 입력
      const { action } = await PROMPT.syncActionPrompt(file.path);

      switch (action) {
        case "next":
          if (currentIndex < files.length - 1) currentIndex++;
          continue;

        case "prev":
          if (currentIndex > 0) currentIndex--;
          continue;

        case "list":
          return;

        case "skip":
          currentIndex++;
          continue;

        case "confirm":
          // 동기화 진행
          spinner.start("Synchronizing file...");
          const syncResult = await this.merger.syncFile(
            file.path,
            fromRef,
            toRef
          );

          if (!syncResult.success) {
            spinner.fail("Synchronization failed");
            currentIndex++;
            continue;
          }

          spinner.succeed("Synchronization completed");

          // Accept/Reject 선택
          const { confirmation } = await inquirer.prompt([
            {
              type: "list",
              name: "confirmation",
              message: "Do you want to accept these changes?",
              choices: [
                { name: "Accept and commit", value: "accept" },
                { name: "Reject and rollback", value: "reject" },
              ],
            },
          ]);

          if (confirmation === "accept") {
            spinner.start("Creating commit...");
            await this.commitManager.createSyncCommit({
              filePath: file.path,
              fromRef,
              toRef,
            });
            spinner.succeed("Changes committed");
          } else {
            spinner.start("Rolling back changes...");
            await this.merger.rollback(file.path);
            spinner.succeed("Changes rolled back");
          }

          currentIndex++;
          break;
      }
    }
  }
}
