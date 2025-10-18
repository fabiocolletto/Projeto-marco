import { renderShell } from './renderShell.js';

const LAST_SELECTED_STORAGE_KEY = 'appbase:last-selected-miniapp';

type RouteMode = 'catalog' | 'setupMaster' | 'loginMaster';

let selectedAppId: string | null = null;
let routeMode: RouteMode = 'catalog';

const isSetupRoute = (hash: string): boolean => /^#\/setup\/master$/.test(hash);
const isLoginRoute = (hash: string): boolean => /^#\/login\/master$/.test(hash);

export const isAuthRoute = (hash: string): boolean => isSetupRoute(hash) || isLoginRoute(hash);

const persistLastSelectedApp = (id: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_SELECTED_STORAGE_KEY, id);
  } catch (error) {
    console.warn('Não foi possível salvar a seleção do MiniApp.', error);
  }
};

const removeStoredSelectedApp = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LAST_SELECTED_STORAGE_KEY);
  } catch (error) {
    console.warn('Não foi possível limpar a seleção do MiniApp.', error);
  }
};

export function getSelectedAppId(): string | null {
  return selectedAppId;
}

export function setSelectedAppId(id: string | null): void {
  selectedAppId = id;
  if (id) {
    persistLastSelectedApp(id);
  }
}

export function getRouteMode(): RouteMode {
  return routeMode;
}

export function setRouteMode(mode: RouteMode): void {
  routeMode = mode;
}

export function applyRouteFromLocation(): void {
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

export function setRouteForSelection(id: string | null): void {
  setRouteMode('catalog');
  const next = id ? `#/app/${encodeURIComponent(id)}` : '#/';
  if (window.location.hash !== next) {
    window.history.pushState({}, '', next);
  }
  renderShell();
}

export function getStoredSelectedAppId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(LAST_SELECTED_STORAGE_KEY);
    return stored ?? null;
  } catch (error) {
    console.warn('Não foi possível recuperar a seleção do MiniApp.', error);
    return null;
  }
}

export function clearStoredSelectedAppId(): void {
  removeStoredSelectedApp();
}

window.addEventListener('hashchange', applyRouteFromLocation);
