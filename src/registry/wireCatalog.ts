import { getSelectedAppId, setSelectedAppId, setRouteForSelection } from '../app/router.js';

export function wireCatalog(container: HTMLElement): () => void {
  const handleClick = (event: Event) => {
    const target = event.target as HTMLElement | null;
    const card = target?.closest('[data-app-id]') as HTMLElement | null;
    if (!card) return;

    const id = card.getAttribute('data-app-id');
    if (!id) return;

    const isActive = getSelectedAppId() === id;
    const next = isActive ? null : id;
    setSelectedAppId(next);
    setRouteForSelection(next);
  };

  container.addEventListener('click', handleClick);
  return () => {
    container.removeEventListener('click', handleClick);
  };
}
