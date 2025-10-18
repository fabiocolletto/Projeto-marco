import { openIdxDB } from '../storage/indexeddb/IdxDBStore.js';
import type { MasterUser } from './types.js';

const MASTER_KEY = 'masterUser';

export async function getMaster(): Promise<MasterUser | null> {
  const db = await openIdxDB();
  try {
    const payload = (await db.settings.get(MASTER_KEY)) as MasterUser | undefined;
    return payload ?? null;
  } finally {
    await db.close();
  }
}

export async function saveMaster(user: MasterUser): Promise<void> {
  const db = await openIdxDB();
  try {
    await db.settings.set(MASTER_KEY, user);
  } finally {
    await db.close();
  }
}

export async function hasMaster(): Promise<boolean> {
  return (await getMaster()) !== null;
}
