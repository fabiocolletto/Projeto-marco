const SUPPORTED_LOCALES = ['pt-br', 'en-us', 'es-419'];
const FALLBACK_LOCALE = 'pt-br';

const normalizeLocale = (value) => {
  if (!value) return FALLBACK_LOCALE;
  const normalized = value.toLowerCase();
  if (SUPPORTED_LOCALES.includes(normalized)) return normalized;
  const prefix = normalized.split('-')[0];
  const match = SUPPORTED_LOCALES.find((locale) => locale.startsWith(prefix));
  return match ?? FALLBACK_LOCALE;
};

const loadMessages = async (locale) => {
  const target = normalizeLocale(locale);
  try {
    const response = await fetch(`./i18n/${target}.json`, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Não foi possível carregar traduções para ${target}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(error);
    if (target !== FALLBACK_LOCALE) {
      return loadMessages(FALLBACK_LOCALE);
    }
    return {
      title: 'Painel do Usuário',
      subtitle: 'Acompanhe seu progresso pessoal.',
      journey: {
        title: 'Sua jornada',
        items: [
          'Complete seu perfil',
          'Ative notificações importantes',
          'Revise suas metas semanais'
        ]
      },
      resources: {
        title: 'Recursos rápidos',
        items: [
          { label: 'Central de ajuda', href: '#' },
          { label: 'Comunidade', href: '#' }
        ]
      }
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

const applyMessages = (messages) => {
  document.documentElement.lang = normalizeLocale(navigator.language ?? FALLBACK_LOCALE);
  const title = document.querySelector('[data-i18n="title"]');
  const subtitle = document.querySelector('[data-i18n="subtitle"]');
  const journeyTitle = document.querySelector('[data-i18n="journey.title"]');
  const resourcesTitle = document.querySelector('[data-i18n="resources.title"]');
  if (title) title.textContent = messages.title;
  if (subtitle) subtitle.textContent = messages.subtitle;
  if (journeyTitle) journeyTitle.textContent = messages.journey?.title ?? '';
  if (resourcesTitle) resourcesTitle.textContent = messages.resources?.title ?? '';

  const journeyContainer = document.getElementById('journey-steps');
  const resourcesContainer = document.getElementById('resource-links');
  renderList(journeyContainer, messages.journey?.items ?? [], (text) => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  });
  renderList(resourcesContainer, messages.resources?.items ?? [], (item) => {
    const link = document.createElement('a');
    link.href = item.href ?? '#';
    link.textContent = item.label;
    link.target = '_parent';
    link.rel = 'noreferrer noopener';
    return link;
  });
};

const bootstrap = async () => {
  const locale = normalizeLocale(navigator.language ?? FALLBACK_LOCALE);
  const messages = await loadMessages(locale);
  applyMessages(messages);
};

void bootstrap();
