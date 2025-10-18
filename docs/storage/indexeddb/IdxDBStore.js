import { openDB } from 'idb';
import { DB_NAME, DB_VERSION, upgrade } from './migrations.js';
const KEY_FIELDS = {
    profiles: 'id',
    settings: 'key',
    telemetry: 'id',
};
const directionFor = (reverse) => (reverse ? 'prev' : 'next');
const iterateStore = async (source, { limit, reverse } = {}) => {
    const results = [];
    const cursorDirection = directionFor(reverse);
    for (let cursor = await source.openCursor(undefined, cursorDirection); cursor && (limit === undefined || results.length < limit); cursor = await cursor.continue()) {
        results.push(cursor.value);
    }
    return results;
};
const createKv = (db, storeName) => {
    const getStore = (mode = 'readonly') => db.transaction(storeName, mode).objectStore(storeName);
    return {
        async get(id) {
            const store = getStore('readonly');
            return (await store.get(id));
        },
        async set(id, value) {
            const store = getStore('readwrite');
            const keyField = KEY_FIELDS[storeName];
            store.put({ ...value, [keyField]: id });
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
                return iterateStore(idx, rest);
            }
            return iterateStore(store, rest);
        },
    };
};
export const openIdxDB = async () => {
    const rawDb = await openDB(DB_NAME, DB_VERSION, {
        upgrade(database, oldVersion) {
            upgrade(database, oldVersion);
        },
    });
    const db = rawDb;
    return {
        profiles: createKv(db, 'profiles'),
        settings: createKv(db, 'settings'),
        telemetry: createKv(db, 'telemetry'),
        async close() {
            db.close();
        },
    };
};
//# sourceMappingURL=IdxDBStore.js.map