import { getSessionPreferences, updateSessionPreferences } from "./session.js";

export const DEFAULT_LOCALE = "pt-BR";
export const SUPPORTED_LOCALES = new Set(["pt-BR", "en-US", "es-419"]);

const EVENTS_STORAGE_KEY = "miniapp.base.admin-events";
const LEGACY_EVENTS_STORAGE_KEY = "appbase:shell:admin-events";
const EVENT_TYPES = {
  UNSUPPORTED_LOCALE: "idioma_nao_suportado",
};

const translationSubscribers = new Set();
const recordedUnsupportedLocales = new Set();
let cachedEvents = null;

function readEventsFromStorage() {
  if (cachedEvents) {
    return cachedEvents;
  }
  let raw = null;
  try {
    if (typeof localStorage !== "undefined") {
      raw = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (!raw && LEGACY_EVENTS_STORAGE_KEY) {
        const legacy = localStorage.getItem(LEGACY_EVENTS_STORAGE_KEY);
        if (legacy) {
          localStorage.setItem(EVENTS_STORAGE_KEY, legacy);
          localStorage.removeItem(LEGACY_EVENTS_STORAGE_KEY);
          raw = legacy;
        }
      }
    }
  } catch (error) {
    console.warn("i18n: não foi possível ler eventos persistidos.", error);
  }
  if (!raw) {
    cachedEvents = [];
    return cachedEvents;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedEvents = parsed;
      return cachedEvents;
    }
  } catch (error) {
    console.warn("i18n: formato inválido dos eventos persistidos.", error);
  }
  cachedEvents = [];
  return cachedEvents;
}

function writeEventsToStorage(events) {
  cachedEvents = Array.isArray(events) ? [...events] : [];
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(cachedEvents));
  } catch (error) {
    console.warn("i18n: não foi possível salvar eventos.", error);
  }
}

function notifyTranslationSubscribers() {
  const snapshot = getTranslationOpportunities();
  translationSubscribers.forEach((callback) => {
    try {
      callback(snapshot);
    } catch (error) {
      console.error("i18n: falha ao notificar inscrito de oportunidades.", error);
    }
  });
}

function pushTranslationOpportunity(opportunity) {
  const events = readEventsFromStorage();
  events.push(opportunity);
  // mantém histórico limitado para evitar crescimento ilimitado
  const MAX_ENTRIES = 50;
  if (events.length > MAX_ENTRIES) {
    events.splice(0, events.length - MAX_ENTRIES);
  }
  writeEventsToStorage(events);
  notifyTranslationSubscribers();
}

function createEventId(prefix = "evt") {
  const random = Math.random().toString(36).slice(2, 8);
  const timestamp = Date.now().toString(36);
  return `${prefix}-${timestamp}-${random}`;
}

export function getTranslationOpportunities() {
  return readEventsFromStorage().map((entry) => ({ ...entry }));
}

export function subscribeToTranslationOpportunities(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("subscribeToTranslationOpportunities requer uma função de callback.");
  }
  translationSubscribers.add(callback);
  return () => {
    translationSubscribers.delete(callback);
  };
}

function recordUnsupportedLocale(locale) {
  if (!locale || recordedUnsupportedLocales.has(locale)) {
    return;
  }
  recordedUnsupportedLocales.add(locale);
  const event = {
    id: createEventId("lang"),
    type: EVENT_TYPES.UNSUPPORTED_LOCALE,
    localeDetectado: locale,
    ts: new Date().toISOString(),
  };
  pushTranslationOpportunity(event);
}

function coerceLocale(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.trim();
}

export function normalizeLocale(locale, supported = SUPPORTED_LOCALES) {
  const normalized = coerceLocale(locale);
  const catalog = supported instanceof Set ? supported : new Set(supported ?? []);
  if (catalog.has(normalized)) {
    return normalized;
  }
  return DEFAULT_LOCALE;
}

export function getNavigatorLocales() {
  const locales = [];
  try {
    if (typeof navigator !== "undefined") {
      if (Array.isArray(navigator.languages)) {
        navigator.languages.forEach((item) => {
          const normalized = coerceLocale(item);
          if (normalized) {
            locales.push(normalized);
          }
        });
      }
      if (navigator.language) {
        const normalized = coerceLocale(navigator.language);
        if (normalized) {
          locales.push(normalized);
        }
      }
    }
  } catch (error) {
    console.warn("i18n: falha ao inspecionar navigator.languages.", error);
  }
  if (!locales.includes(DEFAULT_LOCALE)) {
    locales.push(DEFAULT_LOCALE);
  }
  return locales;
}

export function negotiateLocale(availableLocales = SUPPORTED_LOCALES, preferredLocales = getNavigatorLocales()) {
  const catalog = availableLocales instanceof Set ? availableLocales : new Set(availableLocales ?? []);
  const preferences = Array.isArray(preferredLocales) ? preferredLocales : [];
  let detected = null;
  for (const locale of preferences) {
    const normalized = coerceLocale(locale);
    if (!normalized) {
      continue;
    }
    if (!detected) {
      detected = normalized;
    }
    if (catalog.has(normalized)) {
      return {
        locale: normalized,
        detected,
        usedFallback: false,
      };
    }
  }
  const fallback = DEFAULT_LOCALE;
  if (detected && !catalog.has(detected)) {
    recordUnsupportedLocale(detected);
  } else if (!detected && preferences.length) {
    const candidate = coerceLocale(preferences[0]);
    if (candidate && !catalog.has(candidate)) {
      recordUnsupportedLocale(candidate);
    }
  }
  return {
    locale: fallback,
    detected: detected ?? preferences[0] ?? fallback,
    usedFallback: true,
  };
}

function applyDocumentLocale(locale) {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (root) {
    root.lang = locale ?? DEFAULT_LOCALE;
  }
}

export function bootstrapLocale(availableLocales = SUPPORTED_LOCALES) {
  const preferences = getSessionPreferences();
  const catalog = availableLocales instanceof Set ? availableLocales : new Set(availableLocales ?? []);
  let resolved = null;
  if (preferences?.idiomaPreferido && catalog.has(preferences.idiomaPreferido)) {
    resolved = preferences.idiomaPreferido;
  } else {
    const negotiation = negotiateLocale(catalog);
    resolved = negotiation.locale;
  }
  applyDocumentLocale(resolved);
  if (!preferences || preferences.idiomaPreferido !== resolved) {
    updateSessionPreferences({ idiomaPreferido: resolved });
  }
  return resolved;
}

function extractValue(messages, path) {
  if (!messages || typeof messages !== "object" || !path) {
    return undefined;
  }
  const segments = path.split(".");
  let current = messages;
  for (const segment of segments) {
    if (current && Object.prototype.hasOwnProperty.call(current, segment)) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  if (typeof current === "string" || typeof current === "number") {
    return current;
  }
  return undefined;
}

export function createTranslator(primaryMessages, fallbackMessages = null) {
  return function translate(path, fallbackValue = path) {
    const primary = extractValue(primaryMessages, path);
    if (primary !== undefined) {
      return primary;
    }
    const fallback = extractValue(fallbackMessages, path);
    if (fallback !== undefined) {
      return fallback;
    }
    return fallbackValue;
  };
}

export async function fetchLocaleData(moduleUrl, locale) {
  if (!moduleUrl) {
    throw new TypeError("fetchLocaleData requer a URL base do módulo como primeiro argumento.");
  }
  const target = new URL(`./${locale}.json`, moduleUrl);
  const response = await fetch(target);
  if (!response.ok) {
    throw new Error(`Não foi possível carregar o pacote de idioma: ${locale}`);
  }
  return response.json();
}
