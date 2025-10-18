import { getDeviceId } from './device.js';
import { sha256 } from './crypto.js';
import { setMasterAuthenticated } from './session.js';
import { getMaster, saveMaster } from './store.js';
import type { MasterUser } from './types.js';

const DEFAULT_MASTER_ID = 'master';
const DEFAULT_MASTER_USERNAME = 'adm';
const DEFAULT_MASTER_PASSWORD = '0000';

export async function autoProvisionMaster(): Promise<boolean> {
  const existing = await getMaster();
  if (existing) {
    return false;
  }

  const deviceId = getDeviceId();
  const passHash = await sha256(`${deviceId}:${DEFAULT_MASTER_PASSWORD}`);
  const now = new Date().toISOString();
  const master: MasterUser = {
    id: DEFAULT_MASTER_ID,
    username: DEFAULT_MASTER_USERNAME,
    passHash,
    createdAt: now,
    updatedAt: now,
    deviceId,
    role: 'master',
  };

  await saveMaster(master);
  setMasterAuthenticated();
  return true;
}
