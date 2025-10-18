import { renderShell } from './renderShell.js';
let selectedAppId = null;
let routeMode = 'catalog';
const isSetupRoute = (hash) => /^#\/setup\/master$/.test(hash);
const isLoginRoute = (hash) => /^#\/login\/master$/.test(hash);
export const isAuthRoute = (hash) => isSetupRoute(hash) || isLoginRoute(hash);
export function getSelectedAppId() {
    return selectedAppId;
}
export function setSelectedAppId(id) {
    selectedAppId = id;
}
export function getRouteMode() {
    return routeMode;
}
export function applyRouteFromLocation() {
    const hash = window.location.hash || '#/';
    if (isSetupRoute(hash)) {
        routeMode = 'setupMaster';
        setSelectedAppId(null);
        renderShell();
        return;
    }
    if (isLoginRoute(hash)) {
        routeMode = 'loginMaster';
        setSelectedAppId(null);
        renderShell();
        return;
    }
    const match = hash.match(/^#\/app\/(.+)$/);
    const rawId = match?.[1];
    const decodedId = typeof rawId === 'string' ? decodeURIComponent(rawId) : null;
    setSelectedAppId(decodedId);
    routeMode = 'catalog';
    renderShell();
}
export function setRouteForSelection(id) {
    routeMode = 'catalog';
    const next = id ? `#/app/${encodeURIComponent(id)}` : '#/';
    if (window.location.hash !== next) {
        window.history.pushState({}, '', next);
    }
    renderShell();
}
window.addEventListener('hashchange', applyRouteFromLocation);
//# sourceMappingURL=router.js.map