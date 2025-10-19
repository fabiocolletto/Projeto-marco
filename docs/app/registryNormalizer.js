export const normalizeRegistryId = (value) => value.trim().toLowerCase();
export function normalizeRegistryEntries(rawEntries) {
    if (!Array.isArray(rawEntries)) {
        return [];
    }
    const normalized = [];
    rawEntries.forEach((item, index) => {
        const entry = item;
        if (!entry || typeof entry !== 'object') {
            console.warn('Ignorando entrada inválida no registry.', { index, reason: 'tipo inválido' });
            return;
        }
        const { id, name, path } = entry;
        if (typeof id !== 'string' || typeof name !== 'string') {
            console.warn('Ignorando entrada do registry sem id ou nome válidos.', { index, id, name });
            return;
        }
        if (typeof path !== 'string' || path.trim().length === 0) {
            console.warn('Ignorando entrada do registry sem path válido.', { index, id, path });
            return;
        }
        normalized.push({
            ...entry,
            id: normalizeRegistryId(id),
            name,
            path: path.trim(),
        });
    });
    return normalized;
}
//# sourceMappingURL=registryNormalizer.js.map