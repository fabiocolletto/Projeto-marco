// tools/shared/core/miniAppSync.mjs
// Utilidades para montar miniapps compartilhados garantindo montagem única por host.

const DEFAULT_MOUNT_KEYS = [
  'mountMiniApp',
  'mount',
  'default',
  'mountTasksMiniApp',
  'mountFornecedoresMiniApp',
  'mountConvidadosMiniApp',
  'mountMensagensMiniApp'
];

export function resolveMount(moduleExports, explicitKey){
  if (!moduleExports) return null;
  if (explicitKey && typeof moduleExports[explicitKey] === 'function') {
    return moduleExports[explicitKey];
  }
  if (typeof moduleExports === 'function') return moduleExports;
  for (const key of DEFAULT_MOUNT_KEYS) {
    if (typeof moduleExports[key] === 'function') return moduleExports[key];
  }
  return null;
}

export function ensureMiniApp(host, moduleExports, { mountKey, deps = {}, flag = 'mounted', beforeMount, afterMount } = {}) {
  if (!host) throw new Error('[miniAppSync] host inválido');
  if (!moduleExports) throw new Error('[miniAppSync] módulo ausente');
  const attr = `miniapp${flag}`;
  if (host.dataset && host.dataset[attr]) return false;
  const mountFn = resolveMount(moduleExports, mountKey);
  if (typeof mountFn !== 'function') {
    throw new Error('[miniAppSync] não foi possível resolver função de montagem');
  }
  if (typeof beforeMount === 'function') beforeMount(host);
  mountFn(host, deps);
  if (host.dataset) host.dataset[attr] = '1';
  if (typeof afterMount === 'function') afterMount(host);
  return true;
}

export function createMiniAppSync(defaultDeps = {}) {
  const registry = new Map();

  function register(selector, moduleExports, options = {}) {
    registry.set(selector, { moduleExports, options });
  }

  function ensure(selector, moduleExportsOverride, extraOptions = {}) {
    const entry = registry.get(selector);
    if (!entry && !moduleExportsOverride) return false;
    const host = document.querySelector(selector);
    if (!host) return false;
    const moduleExports = moduleExportsOverride || entry?.moduleExports;
    if (!moduleExports) return false;
    const entryOptions = entry?.options || {};
    const mergedDeps = { ...defaultDeps, ...(entryOptions.deps || {}), ...(extraOptions.deps || {}) };
    const mountOptions = { ...entryOptions, ...extraOptions, deps: mergedDeps };
    return ensureMiniApp(host, moduleExports, mountOptions);
  }

  function mountAll(overrides = {}) {
    let mounted = 0;
    for (const [selector, entry] of registry.entries()) {
      const host = document.querySelector(selector);
      if (!host) continue;
      const moduleExports = overrides[selector] || entry.moduleExports;
      if (!moduleExports) continue;
      const mergedDeps = { ...defaultDeps, ...(entry.options?.deps || {}) };
      if (ensureMiniApp(host, moduleExports, { ...entry.options, deps: mergedDeps })) {
        mounted += 1;
      }
    }
    return mounted;
  }

  function reset(selector, flag = 'mounted') {
    const host = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (host?.dataset) delete host.dataset[`miniapp${flag}`];
  }

  return { register, ensure, mountAll, reset };
}
