import type { RegistryEntry } from './types.js';

export const normalizeRegistryId = (value: string): string => value.trim().toLowerCase();

interface RegistryEntryLike {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly path?: unknown;
  readonly adminOnly?: unknown;
  readonly visible?: unknown;
  readonly [key: string]: unknown;
}

export function normalizeRegistryEntries(rawEntries: unknown): RegistryEntry[] {
  if (!Array.isArray(rawEntries)) {
    return [];
  }

  const normalized: RegistryEntry[] = [];

  rawEntries.forEach((item, index) => {
    const entry = item as RegistryEntryLike | null | undefined;
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
      ...(entry as RegistryEntry),
      id: normalizeRegistryId(id),
      name,
      path: path.trim(),
    });
  });

  return normalized;
}
