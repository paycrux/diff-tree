// src/events/eventEmitter.ts
import { EventType, EventCallback } from "./types.js";

export class GitAnalyzerEventEmitter {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();

  emit(event: EventType, data: any): void {
    const callbacks = this.listeners.get(event);
    callbacks?.forEach((callback) => callback(data));
  }

  on(event: EventType, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: EventType, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }
}
