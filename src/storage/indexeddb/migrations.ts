import type { DBSchema } from 'idb';
import type { IDBPDatabase } from 'idb';

export interface AppBaseDB extends DBSchema {
  profiles: {
    key: string;
    value: Record<string, unknown> & { id: string; updatedAt?: string };
    indexes: { byUpdatedAt: string };
  };
  settings: {
    key: string;
    value: Record<string, unknown> & { key: string; updatedAt?: string };
  };
  telemetry: {
    key: string;
    value: Record<string, unknown> & { id: string; ts?: string; updatedAt?: string };
    indexes: { byTs: string };
  };
}

export const DB_NAME = 'appbase_db';
export const DB_VERSION = 1;

export const upgrade = (db: IDBPDatabase<AppBaseDB>, oldVersion: number): void => {
  if (oldVersion < 1) {
    const profiles = db.createObjectStore('profiles', { keyPath: 'id' });
    profiles.createIndex('byUpdatedAt', 'updatedAt');

    db.createObjectStore('settings', { keyPath: 'key' });

    const telemetry = db.createObjectStore('telemetry', { keyPath: 'id' });
    telemetry.createIndex('byTs', 'ts');
  }
};
