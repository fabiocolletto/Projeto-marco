const STORAGE_KEY = 'miniapp.base.theme';
const listeners = new Set();
const storage = (() => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
})();

let preferredMode = readStoredTheme() || 'system';
const mediaQuery = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

function readStoredTheme() {
  if (!storage) return null;
  return storage.getItem(STORAGE_KEY);
}

function persistTheme(theme) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    console.warn('theme: unable to persist preference', error);
  }
}

function resolveTheme(theme) {
  if (theme === 'system') {
    return mediaQuery && mediaQuery.matches ? 'dark' : 'light';
  }
  return theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themeSource = theme;
  root.style.colorScheme = resolved;
  swapBrand(resolved);
  listeners.forEach(listener => listener({ mode: theme, resolved }));
}

function swapBrand(resolved) {
  if (typeof document === 'undefined') return;
  const logo = document.getElementById('logo');
  if (!logo) return;
  const path = resolved === 'dark' ? '../../assets/brand/logo-dark.svg' : '../../assets/brand/logo-light.svg';
  logo.setAttribute('src', path);
}

export function initTheme(defaultTheme = preferredMode) {
  preferredMode = defaultTheme;
  if (mediaQuery) {
    mediaQuery.addEventListener('change', () => {
      if (preferredMode === 'system') {
        applyTheme(preferredMode);
      }
    });
  }
  applyTheme(preferredMode);
  return {
    mode: preferredMode,
    resolved: resolveTheme(preferredMode)
  };
}

export function setTheme(theme) {
  preferredMode = theme;
  persistTheme(theme);
  applyTheme(preferredMode);
  return {
    mode: preferredMode,
    resolved: resolveTheme(preferredMode)
  };
}

export function getTheme() {
  return {
    mode: preferredMode,
    resolved: resolveTheme(preferredMode)
  };
}

export function onThemeChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
