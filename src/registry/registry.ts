import type { Locale, MiniAppManifest, MiniAppRegistry } from '../core/types.js';
import { FALLBACK_LOCALE } from '../localization/i18n.js';

export interface RegistryFilters {
  readonly role: 'admin' | 'user';
  readonly locale: Locale;
}

export const listVisibleMiniApps = (
  registry: MiniAppRegistry,
  { role }: RegistryFilters,
): MiniAppManifest[] => {
  return registry.miniapps.filter((manifest) => {
    if (role === 'admin') return true;
    return manifest.visibility !== 'admin';
  });
};

export const resolveMiniAppName = (
  manifest: MiniAppManifest,
  locale: Locale,
): string => {
  return (
    manifest.name[locale] ??
    manifest.name[FALLBACK_LOCALE] ??
    Object.values(manifest.name)[0] ??
    manifest.id
  );
};

export const sortMiniApps = (
  manifests: MiniAppManifest[],
  locale: Locale,
): MiniAppManifest[] => {
  return [...manifests].sort((a, b) =>
    resolveMiniAppName(a, locale).localeCompare(resolveMiniAppName(b, locale), locale),
  );
};
