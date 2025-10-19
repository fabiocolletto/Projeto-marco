const SUPPORTED_LOCALES = ['pt-br', 'en-us', 'es-419'];
const FALLBACK_LOCALE = 'pt-br';
const DB_NAME = 'appbase_db';
const KNOWN_STORAGE_PREFIXES = ['appbase:', 'sync:'];

const normalizeLocale = (value) => {
  if (!value) return FALLBACK_LOCALE;
  const normalized = value.toLowerCase();
  if (SUPPORTED_LOCALES.includes(normalized)) return normalized;
  const prefix = normalized.split('-')[0];
  const match = SUPPORTED_LOCALES.find((locale) => locale.startsWith(prefix));
  return match ?? FALLBACK_LOCALE;
};

const getBrowserLocale = () => normalizeLocale(navigator.language ?? FALLBACK_LOCALE);

const loadMessages = async (locale) => {
  const normalized = normalizeLocale(locale);
  try {
    const response = await fetch(`./i18n/${normalized}.json`, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Não foi possível carregar traduções para ${normalized}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('Falha ao carregar traduções, aplicando fallback.', error);
    if (normalized !== FALLBACK_LOCALE) {
      return loadMessages(FALLBACK_LOCALE);
    }
    return {
      badge: 'MiniApp',
      title: 'Limpeza de Dados do Dispositivo',
      description: 'Remova todo o conteúdo armazenado pelo AppBase neste dispositivo.',
      warning: {
        title: 'Atenção',
        text: 'Esta ação é irreversível. Todos os dados serão removidos e o aplicativo será reiniciado.',
      },
      button: {
        label: 'Limpar dados do dispositivo',
        confirm: 'Tem certeza? Esta ação removerá permanentemente todos os dados locais.',
        working: 'Limpando dados…',
        done: 'Limpeza concluída',
      },
      status: {
        working: 'Limpando dados locais…',
        success: 'Dados removidos com sucesso.',
        error: 'Não foi possível concluir a limpeza.',
      },
      details: {
        working: 'Aguarde enquanto removemos bancos, caches e credenciais.',
        success: 'Reabra o AppBase para iniciar uma nova configuração.',
        error: 'Feche outros painéis do AppBase e tente novamente.',
      },
      footer: 'Recomendamos exportar um backup antes de realizar a limpeza.',
    };
  }
};

const resolve = (source, path) => {
  return path.split('.').reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), source);
};

const applyMessages = (messages) => {
  document.documentElement.lang = getBrowserLocale();
  const mappings = [
    ['[data-i18n="badge"]', 'badge'],
    ['[data-i18n="title"]', 'title'],
    ['[data-i18n="description"]', 'description'],
    ['[data-i18n="warning.title"]', 'warning.title'],
    ['[data-i18n="warning.text"]', 'warning.text'],
    ['[data-i18n="button.label"]', 'button.label'],
    ['[data-i18n="footer"]', 'footer'],
  ];
  for (const [selector, key] of mappings) {
    const element = document.querySelector(selector);
    const value = resolve(messages, key);
    if (element && typeof value === 'string') {
      element.textContent = value;
    }
  }
};

const setStatus = (type, message, details) => {
  const panel = document.querySelector('[data-status-panel]');
  const messageTarget = document.querySelector('[data-status-message]');
  const detailsTarget = document.querySelector('[data-status-details]');
  if (!panel || !messageTarget || !detailsTarget) return;
  panel.hidden = false;
  panel.dataset.status = type;
  messageTarget.textContent = message;
  detailsTarget.textContent = details ?? '';
};

const matchesKnownPrefix = (key) => {
  return KNOWN_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
};

const clearStorage = (storage) => {
  if (!storage) return;
  try {
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (matchesKnownPrefix(key)) {
        storage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn('Falha ao limpar storage', error);
    storage?.clear?.();
  }
};

const deleteDatabase = (name) => {
  if (!('indexedDB' in globalThis)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    let blocked = false;
    request.onblocked = () => {
      blocked = true;
    };
    request.onerror = () => {
      reject(request.error ?? new Error(`Erro ao remover banco ${name}`));
    };
    request.onsuccess = () => {
      if (blocked) {
        reject(new Error('blocked'));
      } else {
        resolve(undefined);
      }
    };
  });
};

const deleteKnownDatabases = async () => {
  const results = [];
  for (const name of [DB_NAME]) {
    try {
      await deleteDatabase(name);
      results.push({ name, status: 'deleted' });
    } catch (error) {
      if (error?.message === 'blocked') {
        throw new Error('blocked');
      }
      console.error(`Falha ao remover o banco ${name}`, error);
      results.push({ name, status: 'error' });
    }
  }
  return results;
};

const clearCaches = async () => {
  if (!('caches' in globalThis)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch (error) {
    console.warn('Falha ao limpar caches', error);
  }
};

const unregisterServiceWorkers = async () => {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch (error) {
    console.warn('Falha ao remover service workers', error);
  }
};

const dispatchCleanupEvent = () => {
  document.dispatchEvent(
    new CustomEvent('miniapp:data-cleanup', {
      detail: { timestamp: new Date().toISOString() },
    }),
  );
};

const performCleanup = async (messages, button, labelTarget) => {
  const confirmText = resolve(messages, 'button.confirm');
  const workingLabel = resolve(messages, 'button.working') ?? 'Limpando dados…';
  const successLabel = resolve(messages, 'button.done') ?? 'Limpeza concluída';
  const idleLabel = resolve(messages, 'button.label') ?? 'Limpar dados do dispositivo';
  if (confirmText && !window.confirm(confirmText)) {
    return;
  }

  button.disabled = true;
  if (labelTarget) labelTarget.textContent = workingLabel;
  setStatus(
    'working',
    resolve(messages, 'status.working') ?? 'Limpando dados locais…',
    resolve(messages, 'details.working') ?? 'Aguarde enquanto removemos registros e credenciais.',
  );

  try {
    clearStorage(globalThis.localStorage);
    clearStorage(globalThis.sessionStorage);
    await deleteKnownDatabases();
    await clearCaches();
    await unregisterServiceWorkers();
    dispatchCleanupEvent();
    setStatus(
      'success',
      resolve(messages, 'status.success') ?? 'Dados removidos com sucesso.',
      resolve(messages, 'details.success') ?? 'Reabra o AppBase para iniciar uma nova configuração.',
    );
    if (labelTarget) labelTarget.textContent = successLabel;
  } catch (error) {
    console.error('Falha ao limpar dados locais', error);
    const blocked = error instanceof Error && error.message === 'blocked';
    setStatus(
      'error',
      resolve(messages, 'status.error') ?? 'Não foi possível concluir a limpeza.',
      blocked
        ? resolve(messages, 'details.blocked') ??
          'Feche outros painéis ou guias do AppBase e tente novamente.'
        : resolve(messages, 'details.error') ??
          'Revise se há outras guias do AppBase abertas e repita a operação.',
    );
    button.disabled = false;
    if (labelTarget) labelTarget.textContent = idleLabel;
  }
};

const bootstrap = async () => {
  const locale = getBrowserLocale();
  const messages = await loadMessages(locale);
  applyMessages(messages);

  const button = document.querySelector('[data-cleanup-button]');
  const labelTarget = button?.querySelector('span');
  button?.addEventListener('click', () => {
    void performCleanup(messages, button, labelTarget);
  });
};

void bootstrap();
