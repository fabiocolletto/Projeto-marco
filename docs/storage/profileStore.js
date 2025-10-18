import { openIdxDB } from './indexeddb/IdxDBStore.js';
const DEFAULT_KEY = 'appbase.profile';
const DEFAULT_PROFILE_ID = 'primary-profile';
export class MemoryProfileStore {
    load() {
        return this.profile ? { ...this.profile } : undefined;
    }
    save(profile) {
        this.profile = { ...profile };
    }
    clear() {
        this.profile = undefined;
    }
}
export const createBrowserProfileStore = (key = DEFAULT_KEY, storage = globalThis.localStorage) => {
    return {
        load() {
            const raw = storage?.getItem?.(key);
            if (!raw)
                return undefined;
            try {
                return JSON.parse(raw);
            }
            catch (error) {
                console.warn('Falha ao ler perfil local, limpando…', error);
                storage.removeItem(key);
                return undefined;
            }
        },
        save(profile) {
            storage?.setItem?.(key, JSON.stringify(profile));
        },
        clear() {
            storage?.removeItem?.(key);
        },
    };
};
class IndexedDBProfileStore {
    constructor(profileId = DEFAULT_PROFILE_ID) {
        this.profileId = profileId;
    }
    async load() {
        const db = await openIdxDB();
        try {
            const record = (await db.profiles.get(this.profileId));
            if (!record)
                return undefined;
            const { id: _id, updatedAt: _updatedAt, ...profile } = record;
            return profile;
        }
        finally {
            await db.close();
        }
    }
    async save(profile) {
        const db = await openIdxDB();
        try {
            await db.profiles.set(this.profileId, {
                ...profile,
                id: this.profileId,
                updatedAt: new Date().toISOString(),
            });
        }
        finally {
            await db.close();
        }
    }
    async clear() {
        const db = await openIdxDB();
        try {
            await db.profiles.delete(this.profileId);
        }
        finally {
            await db.close();
        }
    }
}
const resolveEnv = (key) => {
    const globalRecord = globalThis;
    const nodeEnv = globalRecord.process?.env;
    if (nodeEnv && key in nodeEnv) {
        return nodeEnv[key];
    }
    if (key in globalRecord) {
        const value = globalRecord[key];
        if (typeof value === 'string')
            return value;
    }
    try {
        const metaEnv = import.meta?.env;
        const value = metaEnv?.[key];
        if (typeof value === 'string')
            return value;
    }
    catch (error) {
        // ignore when import.meta is unavailable
    }
    return undefined;
};
const resolveStorageDriver = () => {
    const raw = resolveEnv('STORAGE_DRIVER');
    if (raw === 'memory')
        return 'memory';
    return 'indexeddb';
};
export const createProfileStore = () => {
    const driver = resolveStorageDriver();
    if (driver === 'memory') {
        return new MemoryProfileStore();
    }
    return new IndexedDBProfileStore();
};
//# sourceMappingURL=profileStore.js.map