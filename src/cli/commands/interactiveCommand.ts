import ora from "ora";
import { GitCommand } from "../../types/index.js";
import { CommandContext } from "../context/index.js";
import { PROMPT } from "../prompt.js";
import { RouteManager } from "../routes/router.js";
import { actionCreators } from "../../state/store.js";

export class InteractiveCompareCommand implements GitCommand {
  private routeManager: RouteManager;
  constructor(private context: CommandContext) {
    this.routeManager = new RouteManager(context);

    this.context.store.subscribe((state) => {
      if (state.ui.currentRoute === "main") {
        this.execute().catch((error) =>
          console.error("Failed to restart interactive mode:", error)
        );
      }
    });
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
    this.context.dispatch({
      type: "UI_UPDATE",
      payload: { selectedFormat: formatAnswer.format },
    });

    const patternAnswers = await PROMPT.usePatternFilter();
    this.context.dispatch({
      type: "UI_UPDATE",
      payload: { selectedPattern: patternAnswers.pattern },
    });

    try {
      this.context.dispatch(actionCreators.startAnalysis());

      const analysis = await this.context.analyzer.analyzeDiff({
        fromRef: answers.fromRef,
        toRef: answers.toRef,
        filterPattern: patternAnswers.pattern,
      });

      this.context.dispatch(actionCreators.completeAnalysis(analysis));
      await this.routeManager.showFileSelectionRoute(analysis.changes);
    } catch (error) {
      this.context.dispatch({
        type: "ANALYSIS_ERROR",
        payload: error,
      });
      throw error;
    }
  }
}
