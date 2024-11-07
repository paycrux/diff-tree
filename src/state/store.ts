// src/state/store.ts
import { AppState, AnalysisState, UIState } from "./types.js";

export class Store {
  private state: AppState;
  private listeners: Set<(state: AppState) => void>;

  constructor() {
    this.state = {
      analysis: {
        currentAnalysis: null,
        isAnalyzing: false,
        error: null,
        refs: {
          fromRef: null,
          toRef: null,
        },
      },
      ui: {
        selectedMode: null,
        selectedFormat: null,
        selectedPattern: null,
      },
    };
    this.listeners = new Set();
  }

  getState(): AppState {
    return { ...this.state };
  }

  private setState(newState: Partial<AppState>) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  setAnalysisState(analysisState: Partial<AnalysisState>) {
    this.setState({
      analysis: { ...this.state.analysis, ...analysisState },
    });
  }

  setRefs(refs: { fromRef: string; toRef: string }) {
    this.setAnalysisState({ refs });
  }

  setUIState(uiState: Partial<UIState>) {
    this.setState({
      ui: { ...this.state.ui, ...uiState },
    });
  }

  subscribe(listener: (state: AppState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.state));
  }
}
