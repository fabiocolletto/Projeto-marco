import type { EventPayload } from '../core/types.js';

export interface TelemetryClient {
  track(event: string, props?: Record<string, unknown>): void;
  flush?(): Promise<void> | void;
}

export class InMemoryTelemetryClient implements TelemetryClient {
  private readonly events: EventPayload[] = [];

  constructor(private readonly now: () => Date = () => new Date()) {}

  track(event: string, props: Record<string, unknown> = {}): void {
    this.events.push({
      event,
      timestamp: this.now().toISOString(),
      props,
    });
  }

  drain(): EventPayload[] {
    return [...this.events];
  }
}
