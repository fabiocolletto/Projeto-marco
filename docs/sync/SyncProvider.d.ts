export interface SyncProvider {
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
type ProviderKey = 'none' | 'drive' | 'onedrive';
export declare const resolveSyncProvider: (provider?: ProviderKey) => SyncProvider | undefined;
export {};
//# sourceMappingURL=SyncProvider.d.ts.map