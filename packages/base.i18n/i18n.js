const STORAGE_KEY = 'miniapp.base.lang';
const FALLBACK_LANG = 'en-us';
const listeners = new Set();
const dictionaries = new Map();
const storage = (() => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
})();

let currentLang = normalize(readStoredLang() || FALLBACK_LANG);

function readStoredLang() {
  if (!storage) return null;
  return storage.getItem(STORAGE_KEY);
}

function persistLang(lang) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, lang);
  } catch (error) {
    console.warn('i18n: unable to persist language', error);
  }
}

function normalize(lang) {
  return String(lang || '').toLowerCase();
}

function notify() {
  const canonical = getLang();
  listeners.forEach(listener => listener(canonical));
}

export function registerDictionary(lang, dictionary) {
  const normalized = normalize(lang);
  dictionaries.set(normalized, {
    lang,
    dictionary
  });
}

export function initI18n(defaultLang = FALLBACK_LANG) {
  const target = normalize(readStoredLang() || defaultLang);
  if (dictionaries.has(target)) {
    currentLang = target;
  } else if (dictionaries.has(FALLBACK_LANG)) {
    currentLang = FALLBACK_LANG;
  } else if (dictionaries.size > 0) {
    currentLang = Array.from(dictionaries.keys())[0];
  }
  persistLang(currentLang);
  return getLang();
}

export function getLang() {
  const entry = dictionaries.get(currentLang);
  return entry ? entry.lang : currentLang;
}

export function availableLangs() {
  return Array.from(dictionaries.values()).map(entry => entry.lang);
}

export function setLang(lang) {
  const normalized = normalize(lang);
  if (!dictionaries.has(normalized)) {
    throw new Error(`Dictionary for language "${lang}" not registered`);
  }
  currentLang = normalized;
  persistLang(currentLang);
  notify();
  return getLang();
}

export function onLanguageChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function interpolate(text, params) {
  if (!params) return text;
  return text.replace(/\{(.*?)\}/g, (_, token) => {
    return token in params ? params[token] : `{${token}}`;
  });
}

export function t(key, params) {
  const entry = dictionaries.get(currentLang) || dictionaries.get(FALLBACK_LANG);
  if (!entry) return key;
  const value = entry.dictionary[key];
  return value ? interpolate(value, params) : key;
}
