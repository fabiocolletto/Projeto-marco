import type { DBSchema } from 'idb';
import type { IDBPDatabase } from 'idb';
export interface AppBaseDB extends DBSchema {
    profiles: {
        key: string;
        value: Record<string, unknown> & {
            id: string;
            updatedAt?: string;
        };
        indexes: {
            byUpdatedAt: string;
        };
    };
    settings: {
        key: string;
        value: Record<string, unknown> & {
            key: string;
            updatedAt?: string;
        };
    };
    telemetry: {
        key: string;
        value: Record<string, unknown> & {
            id: string;
            ts?: string;
            updatedAt?: string;
        };
        indexes: {
            byTs: string;
        };
    };
}
export declare const DB_NAME = "appbase_db";
export declare const DB_VERSION = 1;
export declare const upgrade: (db: IDBPDatabase<AppBaseDB>, oldVersion: number) => void;
//# sourceMappingURL=migrations.d.ts.map