import { renderShell } from './renderShell.js';

const LAST_SELECTED_STORAGE_KEY = 'appbase:last-selected-miniapp';

let selectedAppId: string | null = null;

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

export function applyRouteFromLocation(): void {
  const hash = window.location.hash || '#/';
  const match = hash.match(/^#\/app\/(.+)$/);
  const rawId = match?.[1];
  const decodedId = typeof rawId === 'string' ? decodeURIComponent(rawId) : null;
  setSelectedAppId(decodedId);
  renderShell();
}

export function setRouteForSelection(id: string | null): void {
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
