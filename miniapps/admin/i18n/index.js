import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  createTranslator as createBaseTranslator,
  fetchLocaleData,
  normalizeLocale,
} from "../../../appbase/shell/i18n.js";

const cache = new Map();
let fallbackPromise = null;

async function getFallbackMessages() {
  if (!fallbackPromise) {
    fallbackPromise = fetchLocaleData(import.meta.url, DEFAULT_LOCALE).catch((error) => {
      console.error("admin:i18n — falha ao carregar fallback pt-BR.", error);
      return {};
    });
  }
  return fallbackPromise;
}

async function loadPrimaryMessages(locale) {
  if (locale === DEFAULT_LOCALE) {
    return getFallbackMessages();
  }
  try {
    return await fetchLocaleData(import.meta.url, locale);
  } catch (error) {
    console.warn(`admin:i18n — usando fallback para ${locale}.`, error);
    return getFallbackMessages();
  }
}

export async function getMessages(locale) {
  const normalized = normalizeLocale(locale, SUPPORTED_LOCALES);
  if (cache.has(normalized)) {
    return cache.get(normalized);
  }
  const fallback = await getFallbackMessages();
  const primary = await loadPrimaryMessages(normalized);
  const bundle = {
    primary,
    fallback,
  };
  cache.set(normalized, bundle);
  return bundle;
}

export function createTranslator(bundle) {
  if (!bundle) {
    return (key) => key;
  }
  return createBaseTranslator(bundle.primary, bundle.fallback);
}

export { normalizeLocale };
