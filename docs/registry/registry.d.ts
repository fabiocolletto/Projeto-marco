import type { Locale, MiniAppManifest, MiniAppRegistry } from '../core/types.js';
export interface RegistryFilters {
    readonly role: 'admin' | 'user';
    readonly locale: Locale;
}
export declare const listVisibleMiniApps: (registry: MiniAppRegistry, { role }: RegistryFilters) => MiniAppManifest[];
export declare const resolveMiniAppName: (manifest: MiniAppManifest, locale: Locale) => string;
export declare const sortMiniApps: (manifests: MiniAppManifest[], locale: Locale) => MiniAppManifest[];
//# sourceMappingURL=registry.d.ts.map