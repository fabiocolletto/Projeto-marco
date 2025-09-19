// shared/io/storage.js
// Wrapper para localStorage com namespace

export function setNS(ns, key, val) {
  try {
    localStorage.setItem(`${ns}:${key}`, JSON.stringify(val));
  } catch (_) {}
}

export function getNS(ns, key, fallback = null) {
  try {
    const raw = localStorage.getItem(`${ns}:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

export function removeNS(ns, key) {
  try {
    localStorage.removeItem(`${ns}:${key}`);
  } catch (_) {}
}
