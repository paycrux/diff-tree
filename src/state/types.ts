// src/state/types.ts
import { DiffAnalysis } from "../types/index.js";

export interface AnalysisState {
  currentAnalysis: DiffAnalysis | null;
  isAnalyzing: boolean;
  error: Error | null;
  refs: {
    fromRef: string | null;
    toRef: string | null;
  };
}

export interface UIState {
  selectedMode: "commits" | "directories" | null;
  selectedFormat: "tree" | "plain" | "json" | null;
  selectedPattern: string | null;
}

export interface AppState {
  analysis: AnalysisState;
  ui: UIState;
}
