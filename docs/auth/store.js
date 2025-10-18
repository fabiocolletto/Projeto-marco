import { openIdxDB } from '../storage/indexeddb/IdxDBStore.js';
const MASTER_KEY = 'masterUser';
export async function getMaster() {
    const db = await openIdxDB();
    try {
        const payload = await db.settings.get(MASTER_KEY);
        if (!payload) {
            return null;
        }
        const { key: _ignored, ...rest } = payload;
        return rest;
    }
    finally {
        await db.close();
    }
}
export async function saveMaster(user) {
    const db = await openIdxDB();
    try {
        await db.settings.set(MASTER_KEY, { ...user, key: MASTER_KEY });
    }
    finally {
        await db.close();
    }
}
export async function hasMaster() {
    return (await getMaster()) !== null;
}
//# sourceMappingURL=store.js.map