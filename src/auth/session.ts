const AUTH_KEY = 'appbase:auth';
const MASTER_TOKEN = 'master';

const getStorage = (): Storage | null => {
  if (typeof globalThis.localStorage !== 'undefined') {
    return globalThis.localStorage;
  }
  return null;
};

export function isMasterAuthenticated(): boolean {
  return getStorage()?.getItem(AUTH_KEY) === MASTER_TOKEN;
}

export function setMasterAuthenticated(): void {
  getStorage()?.setItem(AUTH_KEY, MASTER_TOKEN);
}

export function clearMasterAuthentication(): void {
  getStorage()?.removeItem(AUTH_KEY);
}

export function getAuthToken(): string | null {
  return getStorage()?.getItem(AUTH_KEY) ?? null;
}

export const MASTER_AUTH_TOKEN = MASTER_TOKEN;
