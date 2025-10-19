import { currentUser, onAuthChange } from "../../packages/base.security/auth.js";
import { getLang, setLang, onLanguageChange } from "../../packages/base.i18n/i18n.js";
import { getTheme, setTheme, onThemeChange } from "../../packages/base.theme/theme.js";
import { DEFAULT_LOCALE } from "./i18n.js";

const MODE_STORAGE_KEY = "miniapp.base.sessionMode";
const LEGACY_STORAGE_KEY = "appbase:shell:preferences";

const subscribers = new Set();
let preferences = buildPreferences();

migrateLegacyPreferences();
preferences = buildPreferences();

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (!event || !event.key) {
      return;
    }
    if (
      event.key === MODE_STORAGE_KEY ||
      event.key === "miniapp.base.theme" ||
      event.key === "miniapp.base.lang"
    ) {
      refreshPreferences();
    }
  });
}

onAuthChange(() => {
  refreshPreferences();
});

onLanguageChange(() => {
  refreshPreferences();
});

onThemeChange(() => {
  refreshPreferences();
});

function readModeOverride() {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(MODE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return raw === "admin" ? "admin" : raw === "user" ? "user" : null;
  } catch (error) {
    console.warn("session: falha ao ler modo da sessão.", error);
    return null;
  }
}

function persistModeOverride(value) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    if (!value) {
      localStorage.removeItem(MODE_STORAGE_KEY);
      return;
    }
    localStorage.setItem(MODE_STORAGE_KEY, value);
  } catch (error) {
    console.warn("session: não foi possível salvar modo da sessão.", error);
  }
}

function deriveModeFromUser(user) {
  if (readModeOverride()) {
    return readModeOverride();
  }
  if (user && user.role === "owner") {
    return "admin";
  }
  return "user";
}

function buildPreferences() {
  const themeState = getTheme();
  const seguirSistema = !themeState || themeState.mode === "system";
  const themePreference = seguirSistema ? null : themeState.mode;
  const idiomaPreferido = getLang() ?? DEFAULT_LOCALE;
  const modeOverride = readModeOverride();
  const activeUser = currentUser();
  const mode = modeOverride ?? deriveModeFromUser(activeUser);
  return {
    mode,
    idiomaPreferido,
    temaPreferido: themePreference === "dark" || themePreference === "light" ? themePreference : null,
    seguirSistema,
  };
}

function refreshPreferences() {
  const next = buildPreferences();
  if (!arePreferencesEqual(preferences, next)) {
    preferences = next;
    notifySubscribers();
  }
}

function arePreferencesEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.mode === b.mode &&
    a.idiomaPreferido === b.idiomaPreferido &&
    a.temaPreferido === b.temaPreferido &&
    a.seguirSistema === b.seguirSistema
  );
}

function notifySubscribers() {
  const snapshot = getSessionPreferences();
  subscribers.forEach((callback) => {
    try {
      callback(snapshot);
    } catch (error) {
      console.error("session: falha ao notificar inscrito.", error);
    }
  });
}

function migrateLegacyPreferences() {
  if (typeof localStorage === "undefined") {
    return;
  }
  let raw = null;
  try {
    raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    console.warn("session: falha ao ler preferências legadas.", error);
    return;
  }
  if (!raw) {
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.idiomaPreferido === "string") {
        try {
          setLang(parsed.idiomaPreferido);
        } catch (error) {
          console.warn("session: idioma legado inválido.", error);
        }
      }
      const seguirSistema = parsed?.seguirSistema !== false;
      const tema = parsed?.temaPreferido === "dark" ? "dark" : parsed?.temaPreferido === "light" ? "light" : "light";
      setTheme(seguirSistema ? "system" : tema);
      if (parsed?.mode === "admin" || parsed?.mode === "user") {
        persistModeOverride(parsed.mode);
      }
    }
  } catch (error) {
    console.warn("session: formato inválido em preferências legadas.", error);
  } finally {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      console.warn("session: não foi possível limpar preferências legadas.", error);
    }
  }
}

export function getSessionPreferences() {
  return { ...preferences };
}

export function updateSessionPreferences(partial = {}) {
  if (partial && typeof partial === "object") {
    if (Object.prototype.hasOwnProperty.call(partial, "idiomaPreferido") && typeof partial.idiomaPreferido === "string") {
      try {
        setLang(partial.idiomaPreferido);
      } catch (error) {
        console.warn("session: idioma preferido inválido.", error);
      }
    }
    const followSystem =
      Object.prototype.hasOwnProperty.call(partial, "seguirSistema")
        ? partial.seguirSistema !== false
        : preferences.seguirSistema;
    let desiredTheme = preferences.temaPreferido ?? "light";
    if (Object.prototype.hasOwnProperty.call(partial, "temaPreferido")) {
      const normalized = partial.temaPreferido === "dark" ? "dark" : partial.temaPreferido === "light" ? "light" : desiredTheme;
      desiredTheme = normalized;
    }
    setTheme(followSystem ? "system" : desiredTheme);
    if (Object.prototype.hasOwnProperty.call(partial, "mode")) {
      setSessionMode(partial.mode);
    } else {
      refreshPreferences();
    }
  }
  return getSessionPreferences();
}

export function setSessionMode(mode) {
  const normalized = mode === "admin" ? "admin" : mode === "user" ? "user" : null;
  if (normalized) {
    persistModeOverride(normalized);
  } else {
    persistModeOverride(null);
  }
  refreshPreferences();
  return getSessionPreferences();
}

export function subscribeToSessionPreferences(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("subscribeToSessionPreferences requer uma função de callback.");
  }
  subscribers.add(callback);
  try {
    callback(getSessionPreferences());
  } catch (error) {
    console.error("session: falha ao enviar estado inicial ao inscrito.", error);
  }
  return () => {
    subscribers.delete(callback);
  };
}

export function resetSessionPreferences() {
  persistModeOverride(null);
  try {
    setLang(DEFAULT_LOCALE);
  } catch (error) {
    console.warn("session: falha ao redefinir idioma.", error);
  }
  setTheme("system");
  refreshPreferences();
  return getSessionPreferences();
}
