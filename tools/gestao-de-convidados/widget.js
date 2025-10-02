const DEFAULT_CONTAINER_SELECTOR = '[data-gestao-convidados-widget]';
const DEFAULT_CONTAINER_ID = 'gestao-de-convidados-widget';
const DEFAULT_MIN_HEIGHT = '720px';

const appUrl = new URL('./app.html', import.meta.url).href;

function ensureContainers() {
  const containers = Array.from(
    document.querySelectorAll(DEFAULT_CONTAINER_SELECTOR),
  );

  if (containers.length > 0) {
    return containers;
  }

  const existing = document.getElementById(DEFAULT_CONTAINER_ID);
  if (existing) {
    return [existing];
  }

  const fallback = document.createElement('div');
  fallback.id = DEFAULT_CONTAINER_ID;
  fallback.style.width = '100%';
  fallback.style.display = 'block';
  document.body.appendChild(fallback);
  return [fallback];
}

function mountApp(container) {
  const dataset = container.dataset || {};
  const minHeight = dataset.minHeight?.trim() || DEFAULT_MIN_HEIGHT;
  const iframeTitle = dataset.title?.trim() || 'Assistente Cerimonial';
  const resolvedAppUrl = dataset.appUrl?.trim() || appUrl;

  const iframe = document.createElement('iframe');
  iframe.src = resolvedAppUrl;
  iframe.title = iframeTitle;
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'no-referrer';
  iframe.style.width = '100%';
  iframe.style.minHeight = minHeight;
  iframe.style.border = '0';
  iframe.style.borderRadius = '16px';
  iframe.style.boxShadow = '0 20px 40px -24px rgba(0, 0, 0, 0.35)';

  container.replaceChildren(iframe);
}

function initialize() {
  const containers = ensureContainers();
  containers.forEach(mountApp);
  window.dispatchEvent(
    new CustomEvent('gestao-convidados:widget-mounted', {
      detail: { count: containers.length, appUrl },
    }),
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
