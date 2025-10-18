import { renderShell } from './renderShell.js';

let selectedAppId: string | null = null;

export function getSelectedAppId(): string | null {
  return selectedAppId;
}

export function setSelectedAppId(id: string | null): void {
  selectedAppId = id;
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

window.addEventListener('hashchange', applyRouteFromLocation);
