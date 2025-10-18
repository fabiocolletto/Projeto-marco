const subscribers = new Set<() => void>();

let selectedAppId: string | null = null;

export function getSelectedAppId(): string | null {
  return selectedAppId;
}

export function setSelectedAppId(id: string | null): void {
  selectedAppId = id;
}

export function subscribeToSelection(listener: () => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function notify(): void {
  for (const listener of subscribers) {
    listener();
  }
}

export function applyRouteFromLocation(): void {
  const match = globalThis.location.hash.match(/^#\/app\/(.+)$/);
  const nextId = match && typeof match[1] === 'string' ? decodeURIComponent(match[1]) : null;
  if (nextId !== selectedAppId) {
    selectedAppId = nextId;
    notify();
  } else {
    notify();
  }
}

export function setRouteForSelection(id: string | null): void {
  const nextHash = id ? `#/app/${encodeURIComponent(id)}` : '#/' ;
  if (globalThis.location.hash !== nextHash) {
    history.pushState({}, '', nextHash);
  }
  applyRouteFromLocation();
}

globalThis.window.addEventListener('hashchange', applyRouteFromLocation);
