const STORAGE_KEY = "appbase:shell:preferences";
const defaultPreferences = {
  mode: "user",
  idiomaPreferido: typeof navigator !== "undefined" ? navigator.language : "pt-BR",
  temaPreferido: null,
  seguirSistema: true,
};

let preferences = loadPreferences();
const subscribers = new Set();
let exposeHandle = null;

function loadPreferences() {
  const stored = readFromStorage();
  if (!stored || typeof stored !== "object") {
    return { ...defaultPreferences };
  }
  return sanitizePreferences({ ...defaultPreferences, ...stored });
}

function readFromStorage() {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Não foi possível carregar as preferências da sessão.", error);
    return null;
  }
}

function writeToStorage(state) {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Não foi possível persistir as preferências da sessão.", error);
  }
}

function sanitizePreferences(state) {
  const allowedModes = new Set(["admin", "user"]);
  if (!allowedModes.has(state.mode)) {
    state.mode = defaultPreferences.mode;
  }
  state.seguirSistema = Boolean(state.seguirSistema);
  if (state.temaPreferido !== null && typeof state.temaPreferido !== "string") {
    state.temaPreferido = null;
  }
  if (state.idiomaPreferido !== null && typeof state.idiomaPreferido !== "string") {
    state.idiomaPreferido = defaultPreferences.idiomaPreferido;
  }
  return state;
}

function notifySubscribers() {
  const snapshot = getSessionPreferences();
  subscribers.forEach((callback) => {
    try {
      callback(snapshot);
    } catch (error) {
      console.error("Erro ao notificar inscrito de sessão:", error);
    }
  });
}

export function getSessionPreferences() {
  return { ...preferences };
}

export function updateSessionPreferences(partial = {}) {
  const next = sanitizePreferences({ ...preferences, ...partial });
  preferences = next;
  writeToStorage(next);
  notifySubscribers();
  return getSessionPreferences();
}

export function setSessionMode(mode) {
  const nextMode = mode === "admin" ? "admin" : "user";
  return updateSessionPreferences({ mode: nextMode });
}

export function subscribeToSessionPreferences(callback) {
  if (typeof callback !== "function") {
    throw new TypeError("subscribeToSessionPreferences requer uma função de callback.");
  }
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export function resetSessionPreferences() {
  preferences = { ...defaultPreferences };
  writeToStorage(preferences);
  notifySubscribers();
  return getSessionPreferences();
}

function exposeForDebug() {
  if (typeof window === "undefined" || exposeHandle) {
    return;
  }
  exposeHandle = {
    get: getSessionPreferences,
    update: updateSessionPreferences,
    setMode: setSessionMode,
    reset: resetSessionPreferences,
  };
  window.appSession = exposeHandle;
}

exposeForDebug();
