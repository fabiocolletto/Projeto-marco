import { getSelectedAppId, setSelectedAppId, setRouteForSelection } from '../app/router.js';
export function wireCatalog(container) {
    const handleClick = (event) => {
        const target = event.target;
        const card = target?.closest('[data-app-id]');
        if (!card)
            return;
        const id = card.getAttribute('data-app-id');
        if (!id)
            return;
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
//# sourceMappingURL=wireCatalog.js.map