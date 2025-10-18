const SUPPORTED_LOCALES = ['pt-br', 'en-us', 'es-419'];
const FALLBACK_LOCALE = 'pt-br';

const normalizeLocale = (value) => {
  if (!value) return FALLBACK_LOCALE;
  const normalized = value.toLowerCase();
  if (SUPPORTED_LOCALES.includes(normalized)) {
    return normalized;
  }
  const prefix = normalized.split('-')[0];
  const partial = SUPPORTED_LOCALES.find((item) => item.startsWith(prefix));
  return partial ?? FALLBACK_LOCALE;
};

const loadMessages = async (locale) => {
  const target = normalizeLocale(locale);
  try {
    const response = await fetch(`./i18n/${target}.json`, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Falha ao carregar traduções para ${target}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(error);
    if (target !== FALLBACK_LOCALE) {
      return loadMessages(FALLBACK_LOCALE);
    }
    return {
      title: 'Painel Administrativo 2',
      subtitle: 'Resumo rápido para administradores avançados.',
      metrics: {
        title: 'Indicadores em destaque',
        items: [
          { label: 'Usuários ativos (24h)', value: '128' },
          { label: 'Pendências críticas', value: '5' },
        ],
      },
      shortcuts: {
        title: 'Atalhos principais',
        items: [
          { label: 'Ver auditoria', href: '#' },
          { label: 'Configurações avançadas', href: '#' },
        ],
      },
    };
  }
};

const renderList = (container, items, template) => {
  if (!container) return;
  container.innerHTML = '';
  for (const item of items) {
    container.append(template(item));
  }
};

const renderMetrics = (container, items) => {
  renderList(container, items, (item) => {
    const element = document.createElement('li');
    const label = document.createElement('strong');
    label.textContent = item.label;
    const value = document.createElement('span');
    value.textContent = item.value;
    element.append(label, document.createElement('br'), value);
    return element;
  });
};

const renderShortcuts = (container, items) => {
  renderList(container, items, (item) => {
    const link = document.createElement('a');
    link.href = item.href ?? '#';
    link.textContent = item.label;
    link.target = '_parent';
    link.rel = 'noreferrer noopener';
    return link;
  });
};

const applyTranslations = (messages) => {
  document.documentElement.lang = normalizeLocale(navigator.language ?? FALLBACK_LOCALE);
  const title = document.querySelector('[data-i18n="title"]');
  const subtitle = document.querySelector('[data-i18n="subtitle"]');
  const metricsTitle = document.querySelector('[data-i18n="metrics.title"]');
  const shortcutsTitle = document.querySelector('[data-i18n="shortcuts.title"]');
  if (title) title.textContent = messages.title;
  if (subtitle) subtitle.textContent = messages.subtitle;
  if (metricsTitle) metricsTitle.textContent = messages.metrics?.title ?? '';
  if (shortcutsTitle) shortcutsTitle.textContent = messages.shortcuts?.title ?? '';

  const metricsContainer = document.getElementById('highlight-metrics');
  const shortcutsContainer = document.getElementById('quick-actions');
  renderMetrics(metricsContainer, messages.metrics?.items ?? []);
  renderShortcuts(shortcutsContainer, messages.shortcuts?.items ?? []);
};

const bootstrap = async () => {
  const locale = normalizeLocale(navigator.language ?? FALLBACK_LOCALE);
  const messages = await loadMessages(locale);
  applyTranslations(messages);
};

void bootstrap();
