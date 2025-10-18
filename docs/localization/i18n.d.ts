import type { Locale } from '../core/types.js';
import type { TelemetryClient } from '../telemetry/eventBus.js';
export declare const SUPPORTED_LOCALES: Locale[];
export declare const FALLBACK_LOCALE: Locale;
export declare const UNSUPPORTED_LOCALE_EVENT = "idioma_nao_suportado";
export interface LocaleDetectionResult {
    locale: Locale;
    fallbackApplied: boolean;
    unsupportedLocale?: string | undefined;
}
export declare const pickSupportedLocale: (locales: readonly string[]) => LocaleDetectionResult;
export interface LocaleDetectionOptions {
    readonly locales: readonly string[];
    readonly telemetry?: TelemetryClient;
    readonly device?: string;
    readonly now?: () => Date;
}
export declare const detectLocale: ({ locales, telemetry, device, now, }: LocaleDetectionOptions) => LocaleDetectionResult;
export type LocaleDictionary = Record<string, string>;
export type MessageCatalog = Partial<Record<Locale, LocaleDictionary>>;
export interface TranslatorOptions {
    readonly catalog: MessageCatalog;
    readonly fallbackLocale?: Locale;
}
export declare const createTranslator: ({ catalog, fallbackLocale, }: TranslatorOptions) => (key: string, locale: Locale) => string;
export declare const mergeDictionaries: (base: MessageCatalog, patch: MessageCatalog) => MessageCatalog;
//# sourceMappingURL=i18n.d.ts.map