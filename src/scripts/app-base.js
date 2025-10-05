const modules = new Map();
const defaults = new Set();
let enabled = new Set();
let currentConfig = null;
const listeners = new Set();

function notify(event) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('AppBase listener error', error);
    }
  });
}

function register(key, definition) {
  modules.set(key, definition);
}

function boot(config) {
  currentConfig = config;
  defaults.clear();
  (config.defaults?.enabledMiniApps ?? []).forEach((key) => defaults.add(key));
  enabled = new Set([
    ...(config.defaults?.enabledMiniApps ?? []),
    ...(config.user?.enabledMiniApps ?? []),
  ]);
  notify({ type: 'boot', enabled: getEnabledMiniApps() });
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
  notify({ type: 'toggle', key, enabled: isNowEnabled, defaults: Array.from(defaults) });
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
  return modules.get(key);
}

function getEnabledMiniApps() {
  return Array.from(enabled).filter((key) => modules.has(key));
}

function getConfig() {
  return currentConfig;
}

function getModuleEntries() {
  return Array.from(modules.entries());
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
  onChange,
};
