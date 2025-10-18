import type { EventPayload } from '../core/types.js';
export interface TelemetryClient {
    track(event: string, props?: Record<string, unknown>): void;
    flush?(): Promise<void> | void;
}
export declare class InMemoryTelemetryClient implements TelemetryClient {
    private readonly now;
    private readonly events;
    constructor(now?: () => Date);
    track(event: string, props?: Record<string, unknown>): void;
    drain(): EventPayload[];
}
//# sourceMappingURL=eventBus.d.ts.map