import { bus } from './bus.js';

const modules = new Map();
const defaults = new Set();
let enabled = new Set();
let currentConfig = null;
const listeners = new Set();

function normalizeMeta(key, definition) {
  const sourceMeta = definition.meta ?? {};
  const cardSource = sourceMeta.card ?? definition.card ?? {};
  const panelSource = sourceMeta.panel ?? definition.panel ?? {};
  const badgesSource = Array.isArray(sourceMeta.badges)
    ? sourceMeta.badges
    : Array.isArray(definition.badges)
      ? definition.badges
      : [];
  const badgeKeysSource = Array.isArray(sourceMeta.badgeKeys)
    ? sourceMeta.badgeKeys
    : Array.isArray(definition.badgeKeys)
      ? definition.badgeKeys
      : [];

  return {
    key,
    id: sourceMeta.id ?? definition.id ?? key,
    card: { ...cardSource },
    badges: [...badgesSource],
    badgeKeys: [...badgeKeysSource],
    panel: { ...panelSource },
  };
}

function notify(event) {
  const payload = Object.freeze({ ...event });
  try {
    bus.emit(`appbase:${event.type}`, payload);
    bus.emit('appbase:change', payload);
  } catch (error) {
    console.error('AppBase bus emit error', error);
  }
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error('AppBase listener error', error);
    }
  });
}

function register(key, definition) {
  if (!definition || typeof definition.init !== 'function') {
    throw new Error(`AppBase.register("${key}") requer um módulo com método init(container, context).`);
  }
  const meta = normalizeMeta(key, definition);
  modules.set(key, { module: definition, meta });
}

function boot(config) {
  currentConfig = config;
  defaults.clear();
  (config.defaults?.enabledMiniApps ?? []).forEach((key) => defaults.add(key));
  enabled = new Set([
    ...(config.defaults?.enabledMiniApps ?? []),
    ...(config.user?.enabledMiniApps ?? []),
  ]);
  notify({
    type: 'boot',
    enabled: getEnabledMiniApps(),
    defaults: Array.from(defaults),
    config: getResolvedConfig(),
  });
}

function toggleMiniApp(key) {
  if (!modules.has(key) && !defaults.has(key)) {
    return { changed: false, enabled: isEnabled(key) };
  }
  const wasEnabled = enabled.has(key);
  if (wasEnabled) {
    if (defaults.has(key)) {
      return { changed: false, enabled: true, isDefault: true };
    }
    enabled.delete(key);
  } else {
    enabled.add(key);
  }
  const isNowEnabled = enabled.has(key);
  notify({
    type: 'toggle',
    key,
    enabled: isNowEnabled,
    changed: wasEnabled !== isNowEnabled,
    defaults: Array.from(defaults),
    config: getResolvedConfig(),
  });
  return { changed: wasEnabled !== isNowEnabled, enabled: isNowEnabled };
}

function isEnabled(key) {
  return enabled.has(key);
}

function isDefault(key) {
  return defaults.has(key);
}

function getResolvedConfig() {
  if (!currentConfig) {
    return null;
  }
  return {
    tenantId: currentConfig.tenantId,
    userId: currentConfig.userId,
    catalogBaseUrl: currentConfig.catalogBaseUrl,
    enabledMiniApps: Array.from(enabled),
    entitlements: currentConfig.user?.entitlements ?? {},
    providers: currentConfig.user?.providers ?? {},
    ui: currentConfig.ui,
    meta: currentConfig.meta,
  };
}

function resolve(key) {
  return modules.get(key)?.module ?? null;
}

function getEnabledMiniApps() {
  return Array.from(enabled).filter((key) => modules.has(key));
}

function getConfig() {
  return currentConfig;
}

function getModuleEntries() {
  return Array.from(modules.entries()).map(([key, entry]) => [key, entry.module]);
}

function getModuleMeta(key) {
  return modules.get(key)?.meta ?? null;
}

function getModuleMetaEntries() {
  return Array.from(modules.entries()).map(([key, entry]) => [key, entry.meta]);
}

function onChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const AppBase = {
  register,
  boot,
  toggleMiniApp,
  isEnabled,
  isDefault,
  getResolvedConfig,
  resolve,
  getEnabledMiniApps,
  getConfig,
  getModuleEntries,
  getModuleMeta,
  getModuleMetaEntries,
  onChange,
  bus,
};
