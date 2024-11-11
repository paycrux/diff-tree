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

    // readline 설정
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    const renderScreen = () => {
      console.clear();
      console.log(chalk.green("✔"), "Analysis complete\n");
      console.log(
        chalk.bold(`Current file (${currentIndex + 1}/${files.length}):`),
        chalk.cyan(files[currentIndex].path)
      );
      console.log(chalk.bold("Status:"), "Reviewing in VSCode");
      console.log(chalk.bold("\nActions:"));
      console.log("1. Confirm sync [Enter]");
      console.log("2. Skip file [Esc]");
      console.log("3. View next diff [→]");
      console.log("4. View previous diff [←]");
      console.log("5. Go to file list [Q]\n");
    };

    return new Promise<void>((resolve, reject) => {
      const handleKeypress = async (_: any, key: any) => {
        try {
          const file = files[currentIndex];

          // Ctrl+C 처리
          if (key.ctrl && key.name === "c") {
            process.exit();
          }

          switch (key.name) {
            case "return": // Enter
              spinner.start("Synchronizing file...");
              const syncResult = await this.merger.syncFile(
                file.path,
                fromRef,
                toRef
              );

              if (!syncResult.success) {
                spinner.fail("Synchronization failed");
                break;
              }

              spinner.succeed("Synchronization completed");

              // Accept/Reject 선택
              if (process.stdin.isTTY) process.stdin.setRawMode(false);
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
                currentIndex++;
              } else {
                spinner.start("Rolling back changes...");
                await this.merger.rollback(file.path);
                spinner.succeed("Changes rolled back");
                currentIndex++;
              }

              if (process.stdin.isTTY) process.stdin.setRawMode(true);

              if (currentIndex >= files.length) {
                resolve();
                return;
              }
              break;

            case "escape": // Skip
              currentIndex++;
              if (currentIndex >= files.length) {
                resolve();
                return;
              }
              break;

            case "right": // Next file
              if (currentIndex < files.length - 1) {
                currentIndex++;
              }
              break;

            case "left": // Previous file
              if (currentIndex > 0) {
                currentIndex--;
              }
              break;

            case "q": // Quit
              resolve();
              return;
          }

          // 화면 갱신 및 VSCode 실행
          renderScreen();
          if (files[currentIndex]) {
            await VSCodeIntegration.openDiffView({
              fromRef,
              toRef,
              filePath: files[currentIndex].path,
              workspacePath: process.cwd(),
            });
          }
        } catch (error) {
          reject(error);
        }
      };

      // 키 입력 이벤트 리스너 등록
      process.stdin.on("keypress", handleKeypress);

      // 초기 화면 렌더링 및 첫 파일 VSCode 실행
      renderScreen();
      VSCodeIntegration.openDiffView({
        fromRef,
        toRef,
        filePath: files[currentIndex].path,
        workspacePath: process.cwd(),
      });
    }).finally(() => {
      // 정리
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.removeAllListeners("keypress");
    });
  }
}
