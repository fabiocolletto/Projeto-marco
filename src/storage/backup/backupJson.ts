import { openIdxDB } from '../indexeddb/IdxDBStore.js';
import type { KvLike } from '../indexeddb/IdxDBStore.js';
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

type StoreKey = 'id' | 'key';

const timestampFields = ['updatedAt', 'ts', 'timestamp'];

const getTimestamp = (value: Record<string, unknown> | undefined): number => {
  if (!value) return 0;
  for (const field of timestampFields) {
    const raw = value[field];
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const ts = Date.parse(raw);
      if (!Number.isNaN(ts)) return ts;
    }
  }
  return 0;
};

const mergeEntries = async <Store extends keyof AppBaseDB>(
  kv: KvLike<AppBaseDB[Store]['value']>,
  entries: AppBaseDB[Store]['value'][],
  keyProp: StoreKey,
  strategy: MergeStrategy,
): Promise<void> => {
  if (!entries?.length) return;
  const current = await kv.list();
  const byId = new Map<string, AppBaseDB[Store]['value']>();
  for (const item of current) {
    const keyRaw = (item as Record<string, unknown>)[keyProp];
    if (typeof keyRaw === 'string' && keyRaw) {
      byId.set(keyRaw, item);
    }
  }

  for (const entry of entries) {
    const keyValue = (entry as Record<string, unknown>)[keyProp];
    if (typeof keyValue !== 'string' || !keyValue) continue;
    const existing = byId.get(keyValue);
    if (!existing || strategy === 'overwrite') {
      await kv.set(keyValue, entry);
      continue;
    }
    const incomingTs = getTimestamp(entry as Record<string, unknown>);
    const existingTs = getTimestamp(existing as Record<string, unknown>);
    if (incomingTs >= existingTs) {
      await kv.set(keyValue, entry);
    }
  }
};

export const exportBackup = async (): Promise<BackupPayload> => {
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
  } finally {
    await db.close();
  }
};

export const importBackup = async (
  payload: BackupPayload,
  { mergeStrategy }: { mergeStrategy: MergeStrategy },
): Promise<void> => {
  if (!payload?.data) return;
  const db = await openIdxDB();
  try {
    await mergeEntries(db.profiles, payload.data.profiles ?? [], 'id', mergeStrategy);
    await mergeEntries(db.settings, payload.data.settings ?? [], 'key', mergeStrategy);
    await mergeEntries(db.telemetry, payload.data.telemetry ?? [], 'id', mergeStrategy);
  } finally {
    await db.close();
  }
};
