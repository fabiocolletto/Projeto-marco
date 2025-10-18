import { getSelectedAppId, setSelectedAppId, setRouteForSelection } from '../app/router.js';

export function wireCatalog(container: HTMLElement): void {
  container.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement | null)?.closest('[data-app-id]') as
      | HTMLElement
      | null;
    if (!target) return;

    const id = target.getAttribute('data-app-id');
    if (!id) return;

    const isActive = getSelectedAppId() === id;
    const next = isActive ? null : id;
    setSelectedAppId(next);
    setRouteForSelection(next);
  });
}
