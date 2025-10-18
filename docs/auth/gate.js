import { renderShell } from '../app/renderShell.js';
import { applyRouteFromLocation, isAuthRoute } from '../app/router.js';
import { getDeviceId } from './device.js';
import { getMaster } from './store.js';
import { getAuthToken, MASTER_AUTH_TOKEN } from './session.js';
const POST_AUTH_HASH_KEY = 'appbase:postAuthHash';
const getSessionStorage = () => {
    if (typeof globalThis.sessionStorage !== 'undefined') {
        return globalThis.sessionStorage;
    }
    return null;
};
export const rememberPostAuthHash = () => {
    if (isAuthRoute(window.location.hash))
        return;
    const storage = getSessionStorage();
    if (!storage)
        return;
    const current = window.location.hash || '#/';
    storage.setItem(POST_AUTH_HASH_KEY, current);
};
export const consumePostAuthHash = () => {
    const storage = getSessionStorage();
    if (!storage)
        return null;
    const value = storage.getItem(POST_AUTH_HASH_KEY);
    if (value) {
        storage.removeItem(POST_AUTH_HASH_KEY);
        return value;
    }
    return null;
};
export const ensureMasterGate = async () => {
    const master = await getMaster();
    const auth = getAuthToken();
    if (!master) {
        rememberPostAuthHash();
        if (window.location.hash !== '#/setup/master') {
            window.location.hash = '#/setup/master';
        }
        applyRouteFromLocation();
        renderShell();
        return { allowed: false, master: null };
    }
    const deviceId = getDeviceId();
    const needsDeviceSync = master.deviceId !== deviceId;
    if (auth !== MASTER_AUTH_TOKEN || needsDeviceSync) {
        rememberPostAuthHash();
        if (window.location.hash !== '#/login/master') {
            window.location.hash = '#/login/master';
        }
        applyRouteFromLocation();
        renderShell();
        return { allowed: false, master };
    }
    if (isAuthRoute(window.location.hash)) {
        const pending = consumePostAuthHash();
        window.location.hash = pending ?? '#/';
        applyRouteFromLocation();
    }
    return { allowed: true, master };
};
//# sourceMappingURL=gate.js.map