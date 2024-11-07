// src/cli/context/index.ts
import { GitAnalyzer } from "../../analyzer/git.js";
import { GitAnalyzerEventEmitter } from "../../events/eventEmitter.js";
import { DiffFormatter } from "../../formatters/index.js";
import { Store } from "../../state/store.js";

export class CommandContext {
  public readonly events: GitAnalyzerEventEmitter;
  public readonly store: Store;

  constructor(
    public readonly analyzer: GitAnalyzer,
    public readonly formatter: DiffFormatter
  ) {
    this.events = new GitAnalyzerEventEmitter();
    this.store = new Store();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.events.on("analysis:start", () => {
      this.store.setAnalysisState({ isAnalyzing: true, error: null });
    });

    this.events.on("analysis:complete", (analysis) => {
      this.store.setAnalysisState({
        currentAnalysis: analysis,
        isAnalyzing: false,
      });
    });

    this.events.on("analysis:error", (error) => {
      this.store.setAnalysisState({ isAnalyzing: false, error });
    });
  }
}
