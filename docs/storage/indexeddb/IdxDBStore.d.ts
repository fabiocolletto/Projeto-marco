import { type AppBaseDB } from './migrations.js';
export interface KvLike<T> {
    get(id: string): Promise<T | undefined>;
    set(id: string, value: T): Promise<void>;
    delete(id: string): Promise<void>;
    list(opts?: {
        index?: string;
        limit?: number;
        reverse?: boolean;
    }): Promise<T[]>;
}
export interface IdxDB {
    profiles: KvLike<AppBaseDB['profiles']['value']>;
    settings: KvLike<AppBaseDB['settings']['value']>;
    telemetry: KvLike<AppBaseDB['telemetry']['value']>;
    close(): Promise<void>;
}
export declare const openIdxDB: () => Promise<IdxDB>;
//# sourceMappingURL=IdxDBStore.d.ts.map