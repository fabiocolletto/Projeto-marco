const AUTH_KEY = 'appbase:auth';
const MASTER_TOKEN = 'master';
const getStorage = () => {
    if (typeof globalThis.localStorage !== 'undefined') {
        return globalThis.localStorage;
    }
    return null;
};
export function isMasterAuthenticated() {
    return getStorage()?.getItem(AUTH_KEY) === MASTER_TOKEN;
}
export function setMasterAuthenticated() {
    getStorage()?.setItem(AUTH_KEY, MASTER_TOKEN);
}
export function clearMasterAuthentication() {
    getStorage()?.removeItem(AUTH_KEY);
}
export function getAuthToken() {
    return getStorage()?.getItem(AUTH_KEY) ?? null;
}
export const MASTER_AUTH_TOKEN = MASTER_TOKEN;
//# sourceMappingURL=session.js.map