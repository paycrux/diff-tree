// src/state/store.ts
import { DiffAnalysis } from '../types/index.js';
import { type AppState, type Subscriber, type MiddleWare, type Action } from './types.js';

export const initialState: AppState = {
  analysis: {
    currentAnalysis: null,
    isAnalyzing: false,
    error: null,
    refs: { fromRef: null, toRef: null },
  },
  ui: {
    selectedMode: null,
    selectedFormat: null,
    selectedPattern: null,
    currentRoute: 'main',
  },
};

export class Store {
  private state: AppState;
  private subscribers: Set<Subscriber>;
  private middlewares: Set<MiddleWare>;

  constructor(initialState: AppState) {
    this.state = initialState;
    this.subscribers = new Set();
    this.middlewares = new Set();
  }

  getState(): AppState {
    return { ...this.state };
  }

  subscribe(subscriber: Subscriber) {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  addMiddleware(middlewares: MiddleWare) {
    this.middlewares.add(middlewares);
    return () => this.middlewares.delete(middlewares);
  }

  dispatch(action: Action) {
    // execute middlewares
    this.middlewares.forEach((middleware) => middleware(action, this.state));

    // update state
    this.state = this.reducer(this.state, action);

    this.notifySubscribers();
  }

  private notifySubscribers() {
    this.subscribers.forEach((subscriber) => subscriber(this.getState()));
  }

  private reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
      case 'ANALYSIS_START':
        return {
          ...state,
          analysis: {
            ...state.analysis,
            isAnalyzing: true,
            error: null,
          },
        };

      case 'ANALYSIS_COMPLETE':
        return {
          ...state,
          analysis: {
            ...state.analysis,
            currentAnalysis: action.payload,
            isAnalyzing: false,
          },
        };

      case 'ANALYSIS_ERROR':
        return {
          ...state,
          analysis: {
            ...state.analysis,
            error: action.payload,
            isAnalyzing: false,
          },
        };

      case 'REFS_UPDATE':
        return {
          ...state,
          analysis: {
            ...state.analysis,
            refs: action.payload,
          },
        };

      case 'UI_UPDATE':
        return {
          ...state,
          ui: {
            ...state.ui,
            ...action.payload,
          },
        };

      case 'NAVIGATION_CHANGE':
        return {
          ...state,
          ui: {
            ...state.ui,
            currentRoute: action.payload,
          },
        };

      default:
        return state;
    }
  }
}

// Example action creators
export const actionCreators = {
  startAnalysis: () => ({
    type: 'ANALYSIS_START' as const,
    payload: null,
  }),

  completeAnalysis: (analysis: DiffAnalysis) => ({
    type: 'ANALYSIS_COMPLETE' as const,
    payload: analysis,
  }),

  updateRefs: (refs: { fromRef: string; toRef: string }) => ({
    type: 'REFS_UPDATE' as const,
    payload: refs,
  }),

  navigateTo: (route: string) => ({
    type: 'NAVIGATION_CHANGE' as const,
    payload: route,
  }),
};

// Logging middleware example
export const loggingMiddleware: MiddleWare = (action, state) => {
  console.debug(`Action: ${action.type}`, {
    payload: action.payload,
    currentState: state,
  });
};
