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
    if (typeof window === 'undefined')
        return;
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
const setHash = (next) => {
    if (typeof window === 'undefined')
        return;
    if (window.location.hash !== next) {
        window.location.hash = next;
    }
};
export const ensureMasterGate = async () => {
    try {
        const master = await getMaster();
        const auth = getAuthToken();
        if (!master) {
            rememberPostAuthHash();
            setHash('#/setup/master');
            applyRouteFromLocation();
            renderShell();
            return { allowed: false, master: null };
        }
        const deviceId = getDeviceId();
        const needsDeviceSync = master.deviceId !== deviceId;
        if (auth !== MASTER_AUTH_TOKEN || needsDeviceSync) {
            rememberPostAuthHash();
            setHash('#/login/master');
            applyRouteFromLocation();
            renderShell();
            return { allowed: false, master };
        }
        if (typeof window !== 'undefined' && isAuthRoute(window.location.hash)) {
            const pending = consumePostAuthHash();
            setHash(pending ?? '#/');
            applyRouteFromLocation();
        }
        return { allowed: true, master };
    }
    catch (error) {
        console.error('Falha ao garantir acesso master', error);
        return { allowed: true, master: null };
    }
};
//# sourceMappingURL=gate.js.map