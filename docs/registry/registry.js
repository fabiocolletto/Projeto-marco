import { FALLBACK_LOCALE } from '../localization/i18n.js';
export const listVisibleMiniApps = (registry, { role }) => {
    return registry.miniapps.filter((manifest) => {
        if (role === 'admin')
            return true;
        return manifest.visibility !== 'admin';
    });
};
export const resolveMiniAppName = (manifest, locale) => {
    return (manifest.name[locale] ??
        manifest.name[FALLBACK_LOCALE] ??
        Object.values(manifest.name)[0] ??
        manifest.id);
};
export const sortMiniApps = (manifests, locale) => {
    return [...manifests].sort((a, b) => resolveMiniAppName(a, locale).localeCompare(resolveMiniAppName(b, locale), locale));
};
//# sourceMappingURL=registry.js.map