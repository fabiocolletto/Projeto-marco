import type { SyncProvider } from '../SyncProvider.js';
export declare class OneDriveStub implements SyncProvider {
    private readonly storage;
    constructor(storage?: Storage | undefined);
    isConfigured(): boolean;
    push(fullBackup: unknown): Promise<{
        ok: boolean;
        rev?: string;
    }>;
    pull(): Promise<{
        ok: boolean;
        backup?: unknown;
        rev?: string;
    }>;
}
//# sourceMappingURL=OneDriveStub.d.ts.map