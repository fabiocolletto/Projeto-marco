import { openIdxDB } from '../indexeddb/IdxDBStore.js';
const timestampFields = ['updatedAt', 'ts', 'timestamp'];
const getTimestamp = (value) => {
    if (!value)
        return 0;
    for (const field of timestampFields) {
        const raw = value[field];
        if (typeof raw === 'number')
            return raw;
        if (typeof raw === 'string') {
            const ts = Date.parse(raw);
            if (!Number.isNaN(ts))
                return ts;
        }
    }
    return 0;
};
const mergeEntries = async (kv, entries, keyProp, strategy) => {
    if (!entries?.length)
        return;
    const current = await kv.list();
    const byId = new Map();
    for (const item of current) {
        const keyRaw = item[keyProp];
        if (typeof keyRaw === 'string' && keyRaw) {
            byId.set(keyRaw, item);
        }
    }
    for (const entry of entries) {
        const keyValue = entry[keyProp];
        if (typeof keyValue !== 'string' || !keyValue)
            continue;
        const existing = byId.get(keyValue);
        if (!existing || strategy === 'overwrite') {
            await kv.set(keyValue, entry);
            continue;
        }
        const incomingTs = getTimestamp(entry);
        const existingTs = getTimestamp(existing);
        if (incomingTs >= existingTs) {
            await kv.set(keyValue, entry);
        }
    }
};
export const exportBackup = async () => {
    const db = await openIdxDB();
    try {
        const [profiles, settings, telemetry] = await Promise.all([
            db.profiles.list(),
            db.settings.list(),
            db.telemetry.list(),
        ]);
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            data: { profiles, settings, telemetry },
        };
    }
    finally {
        await db.close();
    }
};
export const importBackup = async (payload, { mergeStrategy }) => {
    if (!payload?.data)
        return;
    const db = await openIdxDB();
    try {
        await mergeEntries(db.profiles, payload.data.profiles ?? [], 'id', mergeStrategy);
        await mergeEntries(db.settings, payload.data.settings ?? [], 'key', mergeStrategy);
        await mergeEntries(db.telemetry, payload.data.telemetry ?? [], 'id', mergeStrategy);
    }
    finally {
        await db.close();
    }
};
//# sourceMappingURL=backupJson.js.map