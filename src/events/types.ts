// src/events/types.ts
export type EventType =
  | "analysis:start"
  | "analysis:progress"
  | "analysis:complete"
  | "analysis:error"
  | "interaction:mode:select"
  | "interaction:format:select"
  | "interaction:pattern:select"
  | "navigation:main";

export interface AnalysisProgressData {
  status: string;
  current?: number;
  total?: number;
}

export type EventCallback = (data: any) => void;

export interface EventEmitter {
  emit(event: EventType, data: any): void;
  on(event: EventType, callback: EventCallback): void;
  off(event: EventType, callback: EventCallback): void;
}
