;(async () => {
  if (typeof process !== 'undefined' && process.env && process.env.VITEST) {
    return;
  }
  const scriptUrl = document.currentScript && document.currentScript.src;
  const baseFromScript = (() => {
    if (!scriptUrl) return null;
    try {
      const url = new URL(scriptUrl);
      const path = url.pathname.replace(/scripts\/reset-factory\.js$/i, '');
      if (path.endsWith('/')) return path;
      return path + '/';
    } catch (error) {
      console.warn('factory reset base path derive', error);
      return null;
    }
  })();
  const derivedBase = (() => {
    if (window.__APP_BASE_PATH__) return window.__APP_BASE_PATH__;
    if (baseFromScript) return baseFromScript;
    const baseTag = document.querySelector('base');
    if (baseTag && baseTag.href) {
      try {
        const url = new URL(baseTag.href);
        return url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
      } catch (error) {
        console.warn('factory reset base tag parse', error);
      }
    }
    const parts = location.pathname.split('/');
    parts.pop();
    const fallback = parts.join('/') + '/';
    return fallback === '//' ? '/' : fallback;
  })();
  window.__APP_BASE_PATH__ = derivedBase;

  const todayKey = new Date().toISOString().slice(0, 10);
  const onceKey = `factoryResetDone:${todayKey}`;
  const force = window.__FACTORY_RESET_FORCE__ === true;

  try {
    if (!force && localStorage.getItem(onceKey)) {
      return;
    }
  } catch (error) {
    console.warn('factory reset read marker', error);
  }

  const knownDatabases = ['projectStore', 'MarcoBus', 'MiniAppBase', 'ac_store'];

  try {
    if ('databases' in indexedDB && typeof indexedDB.databases === 'function') {
      const databases = await indexedDB.databases();
      await Promise.all(databases.map((db) => db.name && indexedDB.deleteDatabase(db.name)));
    } else {
      knownDatabases.forEach((name) => indexedDB.deleteDatabase(name));
    }
  } catch (error) {
    console.warn('IDB wipe', error);
  }

  try {
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of Object.keys(storage)) {
        storage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn('Storage wipe', error);
  }

  try {
    if ('caches' in self) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn('Cache wipe', error);
  }

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (error) {
    console.warn('SW unregister', error);
  }

  try {
    localStorage.setItem(onceKey, '1');
  } catch (error) {
    console.warn('factory reset marker write', error);
  }

  const target = derivedBase || '/';
  if (force) {
    location.reload();
  } else {
    location.replace(target);
  }
})();
