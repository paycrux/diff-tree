import ora from "ora";
import { GitCommand } from "../../types/index.js";
import { CommandContext } from "../context/index.js";
import {
  getCommitCompareAnswers,
  getDirectoryCompareAnswers,
  getFormatSelection,
  getModeSelection,
  getPatternAnswers,
} from "../prompt.js";
import { RouteManager } from "../routes/router.js";

export class InteractiveCompareCommand implements GitCommand {
  private routeManager: RouteManager;
  constructor(private context: CommandContext) {
    this.routeManager = new RouteManager(context);

    this.context.events.on("navigation:main", () => {
      this.execute().catch((error) =>
        console.error("Failed to restart interactive mode:", error)
      );
    });
  }

  async execute(): Promise<void> {
    console.clear();

    const answers = await getModeSelection()
      .then((answers) => {
        if (answers.compareMode === "commits") return getCommitCompareAnswers();
        return getDirectoryCompareAnswers();
      })
      .then(({ fromRef, toRef, ...rest }) => {
        this.context.store.setRefs({ fromRef, toRef });
        return { fromRef, toRef, ...rest };
      });

    const formatAnswer = await getFormatSelection();
    this.context.formatter.updateOptions({ format: formatAnswer.format });
    this.context.events.emit("interaction:format:select", formatAnswer);
    this.context.store.setUIState({ selectedFormat: formatAnswer.format });

    const patternAnswers = await getPatternAnswers();
    this.context.events.emit("interaction:pattern:select", patternAnswers);
    this.context.store.setUIState({ selectedPattern: patternAnswers.pattern });

    const spinner = ora("Analyzing differences...").start();
    try {
      this.context.events.emit("analysis:start", null);
      const analysis = await this.context.analyzer.analyzeDiff({
        fromRef: answers.fromRef,
        toRef: answers.toRef,
        filterPattern: patternAnswers.pattern,
      });

      this.context.events.emit("analysis:complete", analysis);
      spinner.succeed("Analysis complete");

      await this.routeManager.showFileSelectionRoute(analysis.changes);
    } catch (error) {
      this.context.events.emit("analysis:error", error);
      spinner.fail("Analysis failed");
      throw error;
    }
  }
}
