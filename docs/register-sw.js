(() => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
        scope: './'
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
