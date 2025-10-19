import { getSessionPreferences, subscribeToSessionPreferences } from "./session.js";
import { initTheme, setTheme, onThemeChange } from "../../packages/base.theme/theme.js";

const listeners = new Set();
let initialized = false;
let currentState = null;
let unsubscribeSession = null;
let unsubscribeThemeChange = null;

function resolveFromPreferences(preferences) {
  const followSystem = preferences?.seguirSistema !== false;
  if (followSystem) {
    return "system";
  }
  const preferred = preferences?.temaPreferido;
  if (preferred === "dark" || preferred === "light") {
    return preferred;
  }
  return "light";
}

function applyTheme(preferences, isInitial = false) {
  const desired = resolveFromPreferences(preferences);
  if (isInitial) {
    currentState = initTheme(desired);
  } else {
    currentState = setTheme(desired);
  }
  return currentState;
}

function notify(themeState) {
  const snapshot = themeState ? { ...themeState } : null;
  listeners.forEach((callback) => {
    try {
      callback(snapshot);
    } catch (error) {
      console.error("theme: falha ao notificar inscrito.", error);
    }
  });
}

export function bootstrapTheme() {
  if (initialized) {
    return currentState;
  }
  const preferences = getSessionPreferences();
  applyTheme(preferences, true);
  unsubscribeSession = subscribeToSessionPreferences((next) => {
    const desired = resolveFromPreferences(next);
    const currentMode = currentState?.mode ?? "";
    if (desired === currentMode) {
      if (desired === "system") {
        setTheme("system");
      }
      return;
    }
    currentState = setTheme(desired);
  });
  unsubscribeThemeChange = onThemeChange((state) => {
    currentState = state;
    notify(state);
  });
  initialized = true;
  return currentState;
}

export function subscribeToTheme(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("subscribeToTheme requer uma função de callback.");
  }
  listeners.add(callback);
  if (currentState) {
    try {
      callback({ ...currentState });
    } catch (error) {
      console.error("theme: falha ao enviar estado inicial ao inscrito.", error);
    }
  }
  return () => {
    listeners.delete(callback);
  };
}

export function getCurrentThemeState() {
  return currentState ? { ...currentState } : null;
}

export function teardownThemeSync() {
  if (unsubscribeSession) {
    unsubscribeSession();
    unsubscribeSession = null;
  }
  if (typeof unsubscribeThemeChange === "function") {
    unsubscribeThemeChange();
    unsubscribeThemeChange = null;
  }
  initialized = false;
  listeners.clear();
}
