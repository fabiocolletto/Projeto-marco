import type { UserProfile } from '../core/types.js';
import { openIdxDB } from './indexeddb/IdxDBStore.js';

export interface ProfileStore {
  load(): Promise<UserProfile | undefined> | UserProfile | undefined;
  save(profile: UserProfile): Promise<void> | void;
  clear(): Promise<void> | void;
}

const DEFAULT_KEY = 'appbase.profile';
const DEFAULT_PROFILE_ID = 'primary-profile';

export class MemoryProfileStore implements ProfileStore {
  private profile: UserProfile | undefined;

  load(): UserProfile | undefined {
    return this.profile ? { ...this.profile } : undefined;
  }

  save(profile: UserProfile): void {
    this.profile = { ...profile };
  }

  clear(): void {
    this.profile = undefined;
  }
}

export const createBrowserProfileStore = (
  key: string = DEFAULT_KEY,
  storage: Storage = globalThis.localStorage,
): ProfileStore => {
  return {
    load(): UserProfile | undefined {
      const raw = storage?.getItem?.(key);
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as UserProfile;
      } catch (error) {
        console.warn('Falha ao ler perfil local, limpando…', error);
        storage.removeItem(key);
        return undefined;
      }
    },
    save(profile: UserProfile): void {
      storage?.setItem?.(key, JSON.stringify(profile));
    },
    clear(): void {
      storage?.removeItem?.(key);
    },
  };
};

class IndexedDBProfileStore implements ProfileStore {
  constructor(private readonly profileId: string = DEFAULT_PROFILE_ID) {}

  async load(): Promise<UserProfile | undefined> {
    const db = await openIdxDB();
    try {
      const record = (await db.profiles.get(this.profileId)) as
        | (UserProfile & { id: string; updatedAt?: string })
        | undefined;
      if (!record) return undefined;
      const { id: _id, updatedAt: _updatedAt, ...profile } = record;
      return profile;
    } finally {
      await db.close();
    }
  }

  async save(profile: UserProfile): Promise<void> {
    const db = await openIdxDB();
    try {
      await db.profiles.set(this.profileId, {
        ...profile,
        id: this.profileId,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      await db.close();
    }
  }

  async clear(): Promise<void> {
    const db = await openIdxDB();
    try {
      await db.profiles.delete(this.profileId);
    } finally {
      await db.close();
    }
  }
}

const resolveEnv = (key: string): string | undefined => {
  const globalRecord = globalThis as Record<string, unknown> & {
    process?: { env?: Record<string, string | undefined> };
  };
  const nodeEnv = globalRecord.process?.env;
  if (nodeEnv && key in nodeEnv) {
    return nodeEnv[key];
  }
  if (key in globalRecord) {
    const value = globalRecord[key];
    if (typeof value === 'string') return value;
  }
  try {
    const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> })?.env;
    const value = metaEnv?.[key];
    if (typeof value === 'string') return value;
  } catch (error) {
    // ignore when import.meta is unavailable
  }
  return undefined;
};

const resolveStorageDriver = (): 'indexeddb' | 'memory' => {
  const raw = resolveEnv('STORAGE_DRIVER');
  if (raw === 'memory') return 'memory';
  return 'indexeddb';
};

export const createProfileStore = (): ProfileStore => {
  const driver = resolveStorageDriver();
  if (driver === 'memory') {
    return new MemoryProfileStore();
  }
  return new IndexedDBProfileStore();
};
