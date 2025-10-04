// @ts-check

/**
 * @typedef {import('./types').AppId} AppId
 * @typedef {import('./types').AppManifestEntry} AppManifestEntry
 * @typedef {import('./types').AppManifest} AppManifest
 * @typedef {import('./types').AppManifestOverrides} AppManifestOverrides
 */

/**
 * Mescla as entradas padrão do manifesto com substituições opcionais.
 * Entradas novas são anexadas ao final da lista.
 *
 * @param {readonly AppManifestEntry[]} baseList
 * @param {Partial<AppManifest | AppManifestOverrides>} [overrides]
 * @returns {{ list: AppManifestEntry[]; map: AppManifest }}
 */
export function mergeManifest(baseList, overrides) {
  const list = [];
  /** @type {AppManifest} */
  const map = /** @type {AppManifest} */ ({});
  const overrideMap = normalizeOverrides(overrides);

  for (const entry of baseList) {
    const merged = mergeEntry(entry, overrideMap.get(entry.id));
    list.push(merged);
    map[merged.id] = merged;
    overrideMap.delete(entry.id);
  }

  for (const [, extra] of overrideMap) {
    list.push(extra);
    map[extra.id] = extra;
  }

  return { list, map };
}

/**
 * Normaliza o identificador ativo considerando fallbacks.
 *
 * @param {AppId | null | undefined} candidate
 * @param {AppManifest} map
 * @param {readonly AppManifestEntry[]} list
 * @returns {AppId | null}
 */
export function resolveActiveId(candidate, map, list) {
  if (candidate && candidate in map) {
    return candidate;
  }
  return list[0]?.id ?? null;
}

/**
 * Importa dinamicamente uma vertical validando o retorno.
 *
 * @template T
 * @param {AppManifestEntry} entry
 * @param {(loader: string) => Promise<T>} importer
 * @returns {Promise<Function>}
 */
export async function loadVertical(entry, importer) {
  if (typeof importer !== 'function') {
    throw new TypeError('Função de importação inválida para carregar vertical.');
  }

  try {
    const module = await importer(entry.loader);
    const candidate = extractComponent(module);
    if (typeof candidate !== 'function') {
      throw createLoadError(entry, new Error(`Loader para ${entry.id} não exporta um componente Svelte padrão.`));
    }
    return candidate;
  } catch (error) {
    if (error instanceof Error && error.name === 'AppHostLoadError') {
      throw error;
    }
    throw createLoadError(entry, error);
  }
}

/**
 * @param {unknown} module
 */
function extractComponent(module) {
  if (!module) return null;
  if (typeof module === 'function') return module;
  if (typeof module === 'object') {
    const mod = /** @type {Record<string, unknown>} */ (module);
    if (typeof mod.default === 'function') {
      return mod.default;
    }
    for (const value of Object.values(mod)) {
      if (typeof value === 'function') {
        return value;
      }
    }
  }
  return null;
}

/**
 * @param {Partial<AppManifest | AppManifestOverrides>} overrides
 */
function normalizeOverrides(overrides) {
  /** @type {Map<AppId, AppManifestEntry>} */
  const map = new Map();
  if (!overrides) return map;

  for (const [key, value] of Object.entries(overrides)) {
    if (!value) continue;
    const entry = mergeEntry(
      {
        id: /** @type {AppId} */ (key),
        label: '',
        icon: '',
        loader: '',
        requires: [],
      },
      value,
    );
    map.set(entry.id, entry);
  }

  return map;
}

/**
 * @param {AppManifestEntry} base
 * @param {Partial<AppManifestEntry> | undefined} override
 */
function mergeEntry(base, override) {
  const baseDeps = Array.isArray(base.requires) ? base.requires : [];
  const overrideDeps = Array.isArray(override?.requires) ? override.requires : [];

  const requires = new Set(baseDeps);
  if (overrideDeps.length > 0) {
    for (const dep of overrideDeps) {
      requires.add(dep);
    }
  }

  return {
    ...base,
    ...override,
    requires: Array.from(requires),
  };
}

/**
 * @param {AppManifestEntry} entry
 * @param {unknown} cause
 */
function createLoadError(entry, cause) {
  const error = cause instanceof Error ? cause : new Error(String(cause));
  const loadError = new Error(`Falha ao carregar vertical "${entry.id}": ${error.message}`, { cause: error });
  loadError.name = 'AppHostLoadError';
  return loadError;
}
