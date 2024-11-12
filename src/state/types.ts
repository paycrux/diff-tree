// src/state/types.ts
import { DiffAnalysis } from '../types/index.js';

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
  selectedMode: 'commits' | 'directories' | null;
  selectedFormat: 'tree' | 'plain' | 'json' | null;
  selectedPattern: string | null;
  currentRoute: 'main' | 'fileList' | 'fileDetail';
}

export interface AppState {
  analysis: AnalysisState;
  ui: UIState;
}

export type ActionType =
  | 'ANALYSIS_START'
  | 'ANALYSIS_COMPLETE'
  | 'ANALYSIS_ERROR'
  | 'REFS_UPDATE'
  | 'UI_UPDATE'
  | 'NAVIGATION_CHANGE';

export interface Action<T = any> {
  type: ActionType;
  payload: T;
}

export type Subscriber = (state: AppState) => void;
export type MiddleWare = (action: Action, state: AppState) => void;
