import { renderShell } from './renderShell.js';
const LAST_SELECTED_STORAGE_KEY = 'appbase:last-selected-miniapp';
let selectedAppId = null;
let routeMode = 'catalog';
const isSetupRoute = (hash) => /^#\/setup\/master$/.test(hash);
const isLoginRoute = (hash) => /^#\/login\/master$/.test(hash);
export const isAuthRoute = (hash) => isSetupRoute(hash) || isLoginRoute(hash);
const persistLastSelectedApp = (id) => {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(LAST_SELECTED_STORAGE_KEY, id);
    }
    catch (error) {
        console.warn('Não foi possível salvar a seleção do MiniApp.', error);
    }
};
const removeStoredSelectedApp = () => {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.removeItem(LAST_SELECTED_STORAGE_KEY);
    }
    catch (error) {
        console.warn('Não foi possível limpar a seleção do MiniApp.', error);
    }
};
export function getSelectedAppId() {
    return selectedAppId;
}
export function setSelectedAppId(id) {
    selectedAppId = id;
    if (id) {
        persistLastSelectedApp(id);
    }
}
export function getRouteMode() {
    return routeMode;
}
export function setRouteMode(mode) {
    routeMode = mode;
}
export function applyRouteFromLocation() {
    const hash = window.location.hash || '#/';
    if (isSetupRoute(hash)) {
        setSelectedAppId(null);
        setRouteMode('setupMaster');
        renderShell();
        return;
    }
    if (isLoginRoute(hash)) {
        setSelectedAppId(null);
        setRouteMode('loginMaster');
        renderShell();
        return;
    }
    const match = hash.match(/^#\/app\/(.+)$/);
    const rawId = match?.[1];
    const decodedId = typeof rawId === 'string' ? decodeURIComponent(rawId) : null;
    setSelectedAppId(decodedId);
    setRouteMode('catalog');
    renderShell();
}
export function setRouteForSelection(id) {
    setRouteMode('catalog');
    const next = id ? `#/app/${encodeURIComponent(id)}` : '#/';
    if (window.location.hash !== next) {
        window.history.pushState({}, '', next);
    }
    renderShell();
}
export function getStoredSelectedAppId() {
    if (typeof window === 'undefined')
        return null;
    try {
        const stored = window.localStorage.getItem(LAST_SELECTED_STORAGE_KEY);
        return stored ?? null;
    }
    catch (error) {
        console.warn('Não foi possível recuperar a seleção do MiniApp.', error);
        return null;
    }
}
export function clearStoredSelectedAppId() {
    removeStoredSelectedApp();
}
window.addEventListener('hashchange', applyRouteFromLocation);
//# sourceMappingURL=router.js.map