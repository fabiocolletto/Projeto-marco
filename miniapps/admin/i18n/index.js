const DEFAULT_LOCALE = "pt-BR";
const SUPPORTED = new Set(["pt-BR", "en-US", "es-419"]);
const cache = new Map();

export async function getMessages(locale) {
  const normalized = normalizeLocale(locale);
  if (cache.has(normalized)) {
    return cache.get(normalized);
  }
  const url = new URL(`./${normalized}.json`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Não foi possível carregar o pacote de idioma: ${normalized}`);
  }
  const messages = await response.json();
  cache.set(normalized, messages);
  return messages;
}

export function createTranslator(messages) {
  return function translate(path, fallback = path) {
    if (!path) {
      return fallback;
    }
    const segments = path.split(".");
    let current = messages;
    for (const segment of segments) {
      if (current && Object.prototype.hasOwnProperty.call(current, segment)) {
        current = current[segment];
      } else {
        return fallback;
      }
    }
    if (typeof current === "string" || typeof current === "number") {
      return current;
    }
    return fallback;
  };
}

export function normalizeLocale(locale) {
  if (locale && SUPPORTED.has(locale)) {
    return locale;
  }
  return DEFAULT_LOCALE;
}
