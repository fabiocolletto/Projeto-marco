import type { DeviceContext, Locale } from '../core/types.js';
import type { TelemetryClient } from '../telemetry/eventBus.js';

export const SUPPORTED_LOCALES: Locale[] = ['pt-BR', 'es-419', 'en-US'];
export const FALLBACK_LOCALE: Locale = 'pt-BR';
export const UNSUPPORTED_LOCALE_EVENT = 'idioma_nao_suportado';

export interface LocaleDetectionResult {
  locale: Locale;
  fallbackApplied: boolean;
  unsupportedLocale?: string | undefined;
}

const normalise = (value: string): string => value.trim().toLowerCase();

const isSupported = (locale: string): locale is Locale =>
  SUPPORTED_LOCALES.map(normalise).includes(normalise(locale));

export const pickSupportedLocale = (locales: readonly string[]): LocaleDetectionResult => {
  for (const locale of locales) {
    if (isSupported(locale)) {
      const matched = SUPPORTED_LOCALES.find(
        (supported) => normalise(supported) === normalise(locale),
      );
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

export interface LocaleDetectionOptions {
  readonly locales: readonly string[];
  readonly telemetry?: TelemetryClient;
  readonly device?: string;
  readonly now?: () => Date;
}

export const detectLocale = ({
  locales,
  telemetry,
  device = 'unknown',
  now = () => new Date(),
}: LocaleDetectionOptions): LocaleDetectionResult => {
  const result = pickSupportedLocale(locales);
  if (result.fallbackApplied && telemetry && result.unsupportedLocale) {
    const payload: DeviceContext = {
      localeDetectado: result.unsupportedLocale,
      dispositivo: device,
      data: now().toISOString(),
    };
    telemetry.track(UNSUPPORTED_LOCALE_EVENT, payload);
  }
  return result;
};

export type LocaleDictionary = Record<string, string>;

export type MessageCatalog = Partial<Record<Locale, LocaleDictionary>>;

export interface TranslatorOptions {
  readonly catalog: MessageCatalog;
  readonly fallbackLocale?: Locale;
}

export const createTranslator = ({
  catalog,
  fallbackLocale = FALLBACK_LOCALE,
}: TranslatorOptions) => {
  return (key: string, locale: Locale): string => {
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

export const mergeDictionaries = (
  base: MessageCatalog,
  patch: MessageCatalog,
): MessageCatalog => {
  const result: MessageCatalog = { ...base };
  for (const locale of Object.keys(patch) as Locale[]) {
    result[locale] = { ...(base[locale] ?? {}), ...(patch[locale] ?? {}) };
  }
  return result;
};
