import { renderShell } from './renderShell.js';

let selectedAppId: string | null = null;

export function getSelectedAppId(): string | null {
  return selectedAppId;
}

export function setSelectedAppId(id: string | null): void {
  selectedAppId = id;
}

export function applyRouteFromLocation(): void {
  const match = window.location.hash.match(/^#\/app\/(.+)$/);
  setSelectedAppId(match ? decodeURIComponent(match[1]) : null);
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
