import { setSelectedAppId, setRouteForSelection } from '../app/router.js';

export function wireCatalog(selector: HTMLSelectElement): () => void {
  const handleChange = () => {
    const value = selector.value.trim();
    const next = value.length ? value : null;
    setSelectedAppId(next);
    setRouteForSelection(next);
  };

  selector.addEventListener('change', handleChange);
  return () => {
    selector.removeEventListener('change', handleChange);
  };
}
