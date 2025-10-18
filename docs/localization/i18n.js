export const SUPPORTED_LOCALES = ['pt-BR', 'es-419', 'en-US'];
export const FALLBACK_LOCALE = 'pt-BR';
export const UNSUPPORTED_LOCALE_EVENT = 'idioma_nao_suportado';
const normalise = (value) => value.trim().toLowerCase();
const isSupported = (locale) => SUPPORTED_LOCALES.map(normalise).includes(normalise(locale));
export const pickSupportedLocale = (locales) => {
    for (const locale of locales) {
        if (isSupported(locale)) {
            const matched = SUPPORTED_LOCALES.find((supported) => normalise(supported) === normalise(locale));
            if (matched) {
                return { locale: matched, fallbackApplied: false };
            }
        }
    }
    return {
        locale: FALLBACK_LOCALE,
        fallbackApplied: true,
        unsupportedLocale: locales[0] ?? undefined,
    };
};
export const detectLocale = ({ locales, telemetry, device = 'unknown', now = () => new Date(), }) => {
    const result = pickSupportedLocale(locales);
    if (result.fallbackApplied && telemetry && result.unsupportedLocale) {
        const payload = {
            localeDetectado: result.unsupportedLocale,
            dispositivo: device,
            data: now().toISOString(),
        };
        telemetry.track(UNSUPPORTED_LOCALE_EVENT, payload);
    }
    return result;
};
export const createTranslator = ({ catalog, fallbackLocale = FALLBACK_LOCALE, }) => {
    return (key, locale) => {
        const preferred = catalog[locale]?.[key];
        if (preferred) {
            return preferred;
        }
        const fallback = catalog[fallbackLocale]?.[key];
        if (fallback) {
            return fallback;
        }
        return key;
    };
};
export const mergeDictionaries = (base, patch) => {
    const result = { ...base };
    for (const locale of Object.keys(patch)) {
        result[locale] = { ...(base[locale] ?? {}), ...(patch[locale] ?? {}) };
    }
    return result;
};
//# sourceMappingURL=i18n.js.map