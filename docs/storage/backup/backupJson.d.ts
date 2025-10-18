import type { AppBaseDB } from '../indexeddb/migrations.js';
export interface BackupPayload {
    version: number;
    exportedAt: string;
    data: {
        profiles: AppBaseDB['profiles']['value'][];
        settings: AppBaseDB['settings']['value'][];
        telemetry: AppBaseDB['telemetry']['value'][];
    };
}
type MergeStrategy = 'keep-newer' | 'overwrite';
export declare const exportBackup: () => Promise<BackupPayload>;
export declare const importBackup: (payload: BackupPayload, { mergeStrategy }: {
    mergeStrategy: MergeStrategy;
}) => Promise<void>;
export {};
//# sourceMappingURL=backupJson.d.ts.map