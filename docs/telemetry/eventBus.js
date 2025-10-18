export class InMemoryTelemetryClient {
    constructor(now = () => new Date()) {
        this.now = now;
        this.events = [];
    }
    track(event, props = {}) {
        this.events.push({
            event,
            timestamp: this.now().toISOString(),
            props,
        });
    }
    drain() {
        return [...this.events];
    }
}
//# sourceMappingURL=eventBus.js.map