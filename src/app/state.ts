import type { AppConfig, RegistryEntry, ManifestCacheEntry } from './types.js';

let appConfig: AppConfig = { publicAdmin: false, baseHref: '/' };
let registryEntries: RegistryEntry[] = [];
const manifestCache = new Map<string, ManifestCacheEntry>();

export function setAppConfig(config: AppConfig): void {
  appConfig = config;
}

export function getAppConfig(): AppConfig {
  return appConfig;
}

export function setRegistryEntries(entries: RegistryEntry[]): void {
  registryEntries = entries;
}

export function getRegistryEntries(): RegistryEntry[] {
  return registryEntries;
}

export function getManifestCache(): Map<string, ManifestCacheEntry> {
  return manifestCache;
}
