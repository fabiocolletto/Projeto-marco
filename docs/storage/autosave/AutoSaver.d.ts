type QueueOp = Record<string, unknown>;
export declare const createAutoSaver: (saveFn: (ops: QueueOp[]) => Promise<void>) => {
    queue(op: QueueOp): void;
    flush(): Promise<void>;
    dispose(): void;
};
export {};
//# sourceMappingURL=AutoSaver.d.ts.map