const CACHE_NAME = 'miniappbase-v1-clean';
const scopeUrl = new URL(self.registration.scope);
const BASE_PATH = scopeUrl.pathname.endsWith('/') ? scopeUrl.pathname : scopeUrl.pathname + '/';
const BASE_URL = new URL(BASE_PATH, self.location.origin);
const PRECACHE = [
  BASE_URL.href,
  new URL('index.html', BASE_URL).href,
  new URL('offline.html', BASE_URL).href,
  new URL('manifest.webmanifest', BASE_URL).href
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith(BASE_PATH + 'archive/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            const rootRequest = new Request(BASE_URL.href, { cache: 'reload' });
            cache.put(rootRequest, copy);
          });
          return response;
        })
        .catch(() => caches.match(new URL('offline.html', BASE_URL).href))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
