(() => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const script = document.currentScript;
  let swUrl = './sw.js';
  let scope = './';

  if (script && script.src) {
    try {
      const scriptUrl = new URL(script.src, window.location.href);
      const baseUrl = new URL('./', scriptUrl);
      swUrl = new URL('sw.js', baseUrl).href;
      scope = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    } catch (error) {
      console.warn('[PWA] Não foi possível resolver a URL do service worker', error);
    }
  }

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope
      });
      console.info('[PWA] Service worker registrado', registration.scope);
    } catch (error) {
      console.error('[PWA] Falha ao registrar o service worker', error);
    }
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
})();
