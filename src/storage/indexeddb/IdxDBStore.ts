import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, upgrade, type AppBaseDB } from './migrations.js';

export interface KvLike<T> {
  get(id: string): Promise<T | undefined>;
  set(id: string, value: T): Promise<void>;
  delete(id: string): Promise<void>;
  list(opts?: { index?: string; limit?: number; reverse?: boolean }): Promise<T[]>;
}

export interface IdxDB {
  profiles: KvLike<AppBaseDB['profiles']['value']>;
  settings: KvLike<AppBaseDB['settings']['value']>;
  telemetry: KvLike<AppBaseDB['telemetry']['value']>;
  close(): Promise<void>;
}

type StoreName = 'profiles' | 'settings' | 'telemetry';
type StoreValueMap = {
  profiles: AppBaseDB['profiles']['value'];
  settings: AppBaseDB['settings']['value'];
  telemetry: AppBaseDB['telemetry']['value'];
};

const KEY_FIELDS: Record<StoreName, string> = {
  profiles: 'id',
  settings: 'key',
  telemetry: 'id',
};

const directionFor = (reverse?: boolean): IDBCursorDirection => (reverse ? 'prev' : 'next');

const iterateStore = async <T>(
  source: any,
  { limit, reverse }: { limit?: number; reverse?: boolean } = {},
): Promise<T[]> => {
  const results: T[] = [];
  const cursorDirection = directionFor(reverse);
  for (
    let cursor = await source.openCursor(undefined, cursorDirection);
    cursor && (limit === undefined || results.length < limit);
    cursor = await cursor.continue()
  ) {
    results.push(cursor.value as T);
  }
  return results;
};

const createKv = <Store extends StoreName>(
  db: IDBPDatabase<any>,
  storeName: Store,
): KvLike<StoreValueMap[Store]> => {
  const getStore = (mode: IDBTransactionMode = 'readonly') =>
    db.transaction(storeName, mode).objectStore(storeName) as any;

  return {
    async get(id) {
      const store = getStore('readonly');
      return (await store.get(id)) as StoreValueMap[Store] | undefined;
    },
    async set(id, value) {
      const store = getStore('readwrite');
      const keyField = KEY_FIELDS[storeName];
      store.put({ ...(value as Record<string, unknown>), [keyField]: id });
      await store.transaction.done;
    },
    async delete(id) {
      const store = getStore('readwrite');
      await store.delete(id);
      await store.transaction.done;
    },
    async list(opts) {
      const { index, ...rest } = opts ?? {};
      const store = getStore('readonly');
      if (index && Array.from(store.indexNames ?? []).includes(index)) {
        const idx = store.index(index);
        return iterateStore<StoreValueMap[Store]>(idx, rest);
      }
      return iterateStore<StoreValueMap[Store]>(store, rest);
    },
  };
};

export const openIdxDB = async (): Promise<IdxDB> => {
  const rawDb = await openDB<AppBaseDB>(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion) {
      upgrade(database, oldVersion);
    },
  });
  const db = rawDb as unknown as IDBPDatabase<any>;

  return {
    profiles: createKv(db, 'profiles'),
    settings: createKv(db, 'settings'),
    telemetry: createKv(db, 'telemetry'),
    async close() {
      db.close();
    },
  };
};
