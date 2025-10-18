import { renderShell } from './renderShell.js';

export type RouteMode = 'catalog' | 'setupMaster' | 'loginMaster';

let selectedAppId: string | null = null;
let routeMode: RouteMode = 'catalog';

const isSetupRoute = (hash: string): boolean => /^#\/setup\/master$/.test(hash);
const isLoginRoute = (hash: string): boolean => /^#\/login\/master$/.test(hash);

export const isAuthRoute = (hash: string): boolean => isSetupRoute(hash) || isLoginRoute(hash);

export function getSelectedAppId(): string | null {
  return selectedAppId;
}

export function setSelectedAppId(id: string | null): void {
  selectedAppId = id;
}

export function getRouteMode(): RouteMode {
  return routeMode;
}

export function applyRouteFromLocation(): void {
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

export function setRouteForSelection(id: string | null): void {
  routeMode = 'catalog';
  const next = id ? `#/app/${encodeURIComponent(id)}` : '#/';
  if (window.location.hash !== next) {
    window.history.pushState({}, '', next);
  }
  renderShell();
}

window.addEventListener('hashchange', applyRouteFromLocation);
