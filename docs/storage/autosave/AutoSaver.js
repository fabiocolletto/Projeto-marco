const DEBOUNCE_MS = 400;
const BASE_RETRY_DELAY = 500;
const MAX_RETRIES = 5;
const getOnlineStatus = () => {
    if (typeof navigator === 'undefined')
        return true;
    if (typeof navigator.onLine === 'boolean')
        return navigator.onLine;
    return true;
};
const resolveGlobalTarget = () => {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        return window;
    }
    if (typeof globalThis !== 'undefined' && typeof globalThis.addEventListener === 'function') {
        return globalThis;
    }
    return undefined;
};
const jitter = (delay) => {
    const variance = Math.floor(Math.random() * 150);
    return delay + variance;
};
export const createAutoSaver = (saveFn) => {
    let debounceHandle;
    let processing = false;
    let retryAttempt = 0;
    let disposed = false;
    const pendingByEntity = new Map();
    const pendingGeneral = [];
    const entityOrder = [];
    const target = resolveGlobalTarget();
    const hasPending = () => pendingByEntity.size > 0 || pendingGeneral.length > 0;
    const collectOperations = () => {
        const orderedEntities = entityOrder.filter((id) => pendingByEntity.has(id));
        const entityOps = orderedEntities.map((id) => pendingByEntity.get(id));
        return [...entityOps, ...pendingGeneral];
    };
    const clearPending = () => {
        pendingByEntity.clear();
        pendingGeneral.length = 0;
        entityOrder.length = 0;
    };
    const schedule = (delay) => {
        if (disposed)
            return;
        if (debounceHandle)
            clearTimeout(debounceHandle);
        debounceHandle = setTimeout(async () => {
            debounceHandle = undefined;
            await attemptFlush();
        }, delay);
    };
    const attemptFlush = async () => {
        if (processing || disposed)
            return;
        if (!hasPending())
            return;
        if (!getOnlineStatus()) {
            return;
        }
        processing = true;
        const ops = collectOperations();
        try {
            await saveFn(ops);
            retryAttempt = 0;
            clearPending();
        }
        catch (error) {
            retryAttempt += 1;
            if (retryAttempt >= MAX_RETRIES) {
                console.error('AutoSaver reached max retries, dropping operations.', error);
                clearPending();
                retryAttempt = 0;
            }
            else {
                const delay = jitter(BASE_RETRY_DELAY * 2 ** (retryAttempt - 1));
                schedule(delay);
            }
            return;
        }
        finally {
            processing = false;
        }
        if (hasPending()) {
            schedule(DEBOUNCE_MS);
        }
    };
    const handleOnline = () => {
        if (!hasPending())
            return;
        schedule(0);
    };
    if (target) {
        target.addEventListener('online', handleOnline);
    }
    const queue = (op) => {
        if (disposed)
            return;
        const entityId = op?.entityId;
        if (typeof entityId === 'string' && entityId) {
            if (pendingByEntity.has(entityId)) {
                pendingByEntity.delete(entityId);
                const index = entityOrder.indexOf(entityId);
                if (index >= 0)
                    entityOrder.splice(index, 1);
            }
            pendingByEntity.set(entityId, op);
            entityOrder.push(entityId);
        }
        else {
            pendingGeneral.push(op);
        }
        if (getOnlineStatus()) {
            schedule(DEBOUNCE_MS);
        }
    };
    const flush = async () => {
        if (disposed)
            return;
        if (debounceHandle) {
            clearTimeout(debounceHandle);
            debounceHandle = undefined;
        }
        await attemptFlush();
    };
    const dispose = () => {
        disposed = true;
        if (debounceHandle) {
            clearTimeout(debounceHandle);
            debounceHandle = undefined;
        }
        clearPending();
        if (target && typeof target.removeEventListener === 'function') {
            target.removeEventListener('online', handleOnline);
        }
    };
    return { queue, flush, dispose };
};
//# sourceMappingURL=AutoSaver.js.map