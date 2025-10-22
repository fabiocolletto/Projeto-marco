const MarcoBus = {
  emit(eventName, payload) {
    console.log(`[MarcoBus] ${eventName}`, payload ?? "");
  }
};

const Store = {
  state: new Map(),
  set(key, value) {
    this.state.set(key, value);
    console.log(`[Store] set ${key}`, value);
  },
  get(key) {
    return this.state.get(key);
  }
};

const railButtons = Array.from(document.querySelectorAll('.js-etiq'));
const panels = new Map(
  Array.from(document.querySelectorAll('.ac-panel')).map((panel) => [panel.id, panel])
);

function updateBreadcrumb(panel, label) {
  const breadcrumbItems = panel.querySelectorAll('.ac-breadcrumb li');
  if (breadcrumbItems.length > 1) {
    const currentItem = breadcrumbItems[breadcrumbItems.length - 1];
    currentItem.textContent = label;
    currentItem.setAttribute('aria-current', 'page');
  }
}

function setActivePanel(panelId, label) {
  panels.forEach((panel) => {
    panel.classList.toggle('ac-panel--active', panel.id === panelId);
  });

  railButtons.forEach((button) => {
    const isActive = button.dataset.target === panelId;
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
    button.classList.toggle('is-active', isActive);
  });

  const activePanel = panels.get(panelId);
  if (activePanel) {
    updateBreadcrumb(activePanel, label);
    activePanel.focus?.();
  }

  Store.set('ui.activePanel', panelId);
  MarcoBus.emit('panel:change', { panelId, label });
}

railButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.target;
    const label = button.textContent.trim();
    setActivePanel(target, label);
  });
});

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function updateKpi(service, isActive) {
  const tile = document.querySelector(`.ac-tile[data-kpi="${service}"]`);
  if (!tile) return;

  const stateEl = tile.querySelector(`.ac-kpi-state[data-state="${service}"]`);
  const dateEl = tile.querySelector(`.ac-kpi-date[data-date="${service}"]`);
  if (!stateEl || !dateEl) return;

  if (isActive) {
    tile.dataset.state = 'active';
    stateEl.textContent = 'Ativo';
    const now = new Date();
    const formatted = formatDate(now);
    dateEl.textContent = formatted;
    dateEl.dateTime = now.toISOString();
  } else {
    delete tile.dataset.state;
    stateEl.textContent = 'Desativado';
    dateEl.textContent = '—';
    dateEl.removeAttribute('datetime');
  }
}

const sessionFeedbackTarget =
  document.querySelector('.js-session-feedback') ?? document.querySelector('[data-auth-status]');
let supabaseClientPromise = null;

function readSupabaseMeta(name) {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() ?? null;
}

function resolveSupabaseConfig() {
  const globalConfig = window.__APPBASE_SUPABASE__ ?? {};
  const url = globalConfig?.url?.trim?.() ?? readSupabaseMeta('supabase-url');
  const anonKey = globalConfig?.anonKey?.trim?.() ?? readSupabaseMeta('supabase-anon-key');
  const schema = globalConfig?.schema?.trim?.() ?? readSupabaseMeta('supabase-schema');
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey, schema: schema || 'public' };
}

async function getSupabaseAuthClient() {
  if (supabaseClientPromise) {
    return supabaseClientPromise;
  }
  const config = resolveSupabaseConfig();
  if (!config) {
    return null;
  }
  supabaseClientPromise = import('https://esm.sh/@supabase/supabase-js@2')
    .then(({ createClient }) =>
      createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          storageKey: 'appbase.supabase.auth'
        },
        db: { schema: config.schema }
      })
    )
    .catch((error) => {
      console.warn('[auth] Não foi possível inicializar o Supabase', error);
      supabaseClientPromise = null;
      return null;
    });
  return supabaseClientPromise;
}

function setSessionFeedback(status, message, session = null) {
  const payload = {
    status,
    message,
    email: session?.user?.email ?? null,
    updatedAt: new Date().toISOString()
  };
  Store.set('auth.session', payload);
  if (sessionFeedbackTarget) {
    sessionFeedbackTarget.textContent = message;
    sessionFeedbackTarget.dataset.status = status;
  }
  MarcoBus.emit('auth:session', { status, session });
}

function updateServiceStatesForSession(session) {
  const isAuthenticated = Boolean(session);
  const now = new Date().toISOString();
  const toggles = [
    { key: 'sync', button: document.querySelector('.js-toggle-sync') },
    { key: 'backup', button: document.querySelector('.js-toggle-backup') }
  ];

  toggles.forEach(({ key, button }) => {
    if (!button) return;
    const serviceKey = `services.${key}`;
    const previous = Store.get(serviceKey) ?? {};
    if (isAuthenticated) {
      button.toggleAttribute('disabled', false);
      const pressed = button.getAttribute('aria-pressed') === 'true';
      updateKpi(key, pressed);
      Store.set(serviceKey, {
        ...previous,
        enabled: pressed,
        updatedAt: pressed ? now : null,
        userId: session?.user?.id ?? null
      });
      button.classList.remove('is-disabled');
    } else {
      button.setAttribute('aria-pressed', 'false');
      button.toggleAttribute('disabled', true);
      updateKpi(key, false);
      Store.set(serviceKey, {
        ...previous,
        enabled: false,
        updatedAt: null,
        reason: 'auth-required'
      });
      button.classList.add('is-disabled');
    }
  });
}

function applySessionState(session) {
  const isAuthenticated = Boolean(session);
  const email = session?.user?.email ?? null;
  const message = isAuthenticated
    ? email
      ? `Sessão ativa (${email})`
      : 'Sessão ativa.'
    : 'Sessão não autenticada.';

  updateServiceStatesForSession(session);
  setSessionFeedback(isAuthenticated ? 'signed_in' : 'signed_out', message, session);
  if (!isAuthenticated) {
    toggleLoginOverlay(false);
  }
}

async function bootstrapAuthWatcher() {
  updateServiceStatesForSession(null);
  const client = await getSupabaseAuthClient();
  if (!client) {
    setSessionFeedback('unavailable', 'Sessão indisponível. Configure o Supabase para autenticar.');
    return;
  }
  try {
    const { data, error } = await client.auth.getSession();
    if (error) {
      console.warn('[auth] Falha ao recuperar sessão', error);
      setSessionFeedback('error', 'Não foi possível verificar a sessão.');
    } else {
      applySessionState(data?.session ?? null);
    }
  } catch (error) {
    console.warn('[auth] Erro inesperado ao recuperar sessão', error);
  }

  client.auth.onAuthStateChange((event, session) => {
    applySessionState(session);
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      const email = session?.user?.email ?? null;
      setSessionFeedback('signed_in', email ? `Sessão ativa (${email}).` : 'Sessão ativa.', session);
    }
    if (event === 'SIGNED_OUT') {
      setSessionFeedback('signed_out', 'Sessão encerrada.', session);
    }
  });
}

function handleToggle(button, serviceKey) {
  if (!button) return;
  button.addEventListener('click', () => {
    const current = button.getAttribute('aria-pressed') === 'true';
    const next = !current;
    button.setAttribute('aria-pressed', String(next));
    updateKpi(serviceKey, next);
    Store.set(`services.${serviceKey}`, { enabled: next, updatedAt: next ? new Date().toISOString() : null });
    MarcoBus.emit(`service:${serviceKey}:${next ? 'enabled' : 'disabled'}`);
  });
}

handleToggle(document.querySelector('.js-toggle-sync'), 'sync');
handleToggle(document.querySelector('.js-toggle-backup'), 'backup');

const table = document.querySelector('.ac-table');
const tableBody = table?.querySelector('tbody');
const headerButtons = table ? Array.from(table.querySelectorAll('.ac-th')) : [];

function getCellValue(cell, sortKey) {
  const rawValue = cell.textContent.trim();
  if (sortKey === 'data') {
    const timeEl = cell.querySelector('time');
    const source = timeEl?.dateTime ?? rawValue;
    return new Date(source);
  }
  return rawValue.toLocaleLowerCase();
}

function sortRows(sortKey, direction) {
  if (!tableBody) return;

  const rows = Array.from(tableBody.querySelectorAll('tr'));
  const sorted = rows.sort((rowA, rowB) => {
    const cellA = rowA.querySelector(`[data-type="${sortKey}"]`);
    const cellB = rowB.querySelector(`[data-type="${sortKey}"]`);
    if (!cellA || !cellB) return 0;

    let valueA = getCellValue(cellA, sortKey);
    let valueB = getCellValue(cellB, sortKey);

    if (valueA instanceof Date && valueB instanceof Date) {
      valueA = valueA.getTime();
      valueB = valueB.getTime();
    }

    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  sorted.forEach((row) => tableBody.appendChild(row));

  MarcoBus.emit('table:sorted', { sortKey, direction });
}

headerButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const currentOrder = button.dataset.order === 'asc' ? 'asc' : button.dataset.order === 'desc' ? 'desc' : null;
    const nextOrder = currentOrder === 'asc' ? 'desc' : 'asc';

    headerButtons.forEach((other) => {
      if (other !== button) {
        delete other.dataset.order;
      }
    });

    button.dataset.order = nextOrder;
    const sortKey = button.dataset.sort;
    sortRows(sortKey, nextOrder);
  });
});

function tableToCsv(tableElement) {
  const rows = Array.from(tableElement.querySelectorAll('tr'));
  return rows
    .map((row) =>
      Array.from(row.children)
        .map((cell) => `"${cell.textContent.trim().replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
}

const exportButton = document.querySelector('.js-export');
if (exportButton && table) {
  exportButton.addEventListener('click', () => {
    const csvContent = tableToCsv(table);
    const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eventos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    MarcoBus.emit('table:export', { rows: table.querySelectorAll('tbody tr').length });
  });
}

const overlay = document.getElementById('login-overlay');
const dialog = overlay?.querySelector('.ac-dialog');
const closeControls = overlay ? Array.from(overlay.querySelectorAll('.js-close')) : [];
const openLoginButton = document.querySelector('.js-open-login');
const resetAppButton = document.querySelector('.js-reset-app');
const loginForm = overlay?.querySelector('form');
const emailInput =
  overlay?.querySelector('[data-auth-email]') ?? overlay?.querySelector('input[type="email"]');
const otpInput =
  overlay?.querySelector('[data-auth-token]') ?? overlay?.querySelector('input[name="otp"]');
const overlayMessage = overlay?.querySelector('.js-login-feedback');
const signOutButtons = Array.from(document.querySelectorAll('.js-sign-out'));
const loginSubmitButton = loginForm?.querySelector('[type="submit"]');
let lastFocus = null;

function toggleLoginOverlay(isVisible) {
  if (!overlay || !dialog) return;
  if (isVisible) {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => {
      dialog.focus?.();
    });
    MarcoBus.emit('overlay:open');
  } else {
    overlay.hidden = true;
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    }
    MarcoBus.emit('overlay:close');
  }
  Store.set('ui.loginOverlay', { open: Boolean(isVisible) });
}

function resetLoginForm() {
  loginForm?.reset?.();
  if (overlayMessage) {
    overlayMessage.textContent = '';
    delete overlayMessage.dataset.tone;
  }
}

function focusLoginEmail() {
  if (emailInput && typeof emailInput.focus === 'function') {
    requestAnimationFrame(() => emailInput.focus());
  }
}

function setOverlayFeedback(message, tone = 'info') {
  if (!overlayMessage) return;
  overlayMessage.textContent = message;
  if (message) {
    overlayMessage.dataset.tone = tone;
  } else {
    delete overlayMessage.dataset.tone;
  }
}

async function handleLoginSubmit(event) {
  event?.preventDefault?.();
  const client = await getSupabaseAuthClient();
  if (!client) {
    setOverlayFeedback('Configuração Supabase indisponível.', 'error');
    setSessionFeedback('unavailable', 'Sessão indisponível.');
    return;
  }

  let email = emailInput?.value?.trim?.() ?? '';
  if (!email) {
    email = window.prompt('Informe seu e-mail para login:')?.trim?.() ?? '';
  }
  if (!email) {
    setOverlayFeedback('Informe um e-mail válido para continuar.', 'error');
    focusLoginEmail();
    return;
  }

  const token = otpInput?.value?.trim?.() ?? '';
  if (loginSubmitButton) {
    loginSubmitButton.disabled = true;
  }
  setOverlayFeedback('Processando…', 'info');

  try {
    if (token) {
      const { data, error } = await client.auth.verifyOtp({ type: 'email', email, token });
      if (error) {
        throw error;
      }
      setOverlayFeedback('Sessão confirmada com sucesso.', 'success');
      if (otpInput) {
        otpInput.value = '';
      }
      const session = data?.session ?? null;
      if (session) {
        applySessionState(session);
      }
      setSessionFeedback('signed_in', `Sessão ativa (${email}).`, session);
      toggleLoginOverlay(false);
    } else {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.href
        }
      });
      if (error) {
        throw error;
      }
      setOverlayFeedback('Enviamos um código para o seu e-mail. Verifique a caixa de entrada.', 'info');
      setSessionFeedback('pending', `Verifique o código enviado para ${email}.`);
    }
  } catch (error) {
    console.warn('[auth] Falha ao autenticar', error);
    const message = error?.message ? String(error.message) : 'Não foi possível iniciar a autenticação.';
    setOverlayFeedback(message, 'error');
    setSessionFeedback('error', message);
  } finally {
    if (loginSubmitButton) {
      loginSubmitButton.disabled = false;
    }
  }
}

async function handleLogout(event) {
  event?.preventDefault?.();
  const client = await getSupabaseAuthClient();
  if (!client) {
    toggleLoginOverlay(false);
    return;
  }
  try {
    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
    setOverlayFeedback('Sessão encerrada.', 'info');
    setSessionFeedback('signed_out', 'Sessão encerrada.');
    toggleLoginOverlay(false);
  } catch (error) {
    console.warn('[auth] Falha ao encerrar sessão', error);
    const message = error?.message ? String(error.message) : 'Não foi possível encerrar a sessão.';
    setOverlayFeedback(message, 'error');
    setSessionFeedback('error', message);
  }
}

openLoginButton?.addEventListener('click', (event) => {
  event?.preventDefault?.();
  resetLoginForm();
  setOverlayFeedback('', 'info');
  toggleLoginOverlay(true);
  focusLoginEmail();
});

closeControls.forEach((control) => {
  control.addEventListener('click', (event) => {
    event.preventDefault();
    if (control.dataset.authAction === 'sign-out') {
      handleLogout(event);
      return;
    }
    toggleLoginOverlay(false);
  });
});

signOutButtons.forEach((button) => {
  button.addEventListener('click', handleLogout);
});

loginForm?.addEventListener('submit', handleLoginSubmit);

overlay?.addEventListener('click', (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.dataset.overlayDismiss === 'true') {
    toggleLoginOverlay(false);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !overlay?.hidden) {
    event.preventDefault();
    toggleLoginOverlay(false);
  }
});

if (dialog) {
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
    }
  });
}

async function clearIndexedDbDatabases() {
  if (!('indexedDB' in window)) return;

  const deleteDatabase = (name) =>
    new Promise((resolve) => {
      const request = window.indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });

  if (typeof window.indexedDB.databases === 'function') {
    try {
      const databases = await window.indexedDB.databases();
      const deletions = databases
        .map((database) => database?.name)
        .filter(Boolean)
        .map((name) => deleteDatabase(name));
      await Promise.all(deletions);
    } catch (error) {
      console.warn('[Reset] Não foi possível listar bancos IndexedDB', error);
    }
  }
}

async function clearCachesStorage() {
  if (!('caches' in window)) return;
  try {
    const keys = await window.caches.keys();
    await Promise.all(keys.map((key) => window.caches.delete(key)));
  } catch (error) {
    console.warn('[Reset] Não foi possível limpar Cache Storage', error);
  }
}

async function resetStoredData() {
  try {
    window.localStorage?.clear?.();
  } catch (error) {
    console.warn('[Reset] Não foi possível limpar o localStorage', error);
  }

  try {
    window.sessionStorage?.clear?.();
  } catch (error) {
    console.warn('[Reset] Não foi possível limpar o sessionStorage', error);
  }

  await Promise.all([clearIndexedDbDatabases(), clearCachesStorage()]);

  MarcoBus.emit('app:reset:data');
}

if (resetAppButton) {
  const originalLabel = resetAppButton.textContent.trim();

  resetAppButton.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Tem certeza de que deseja limpar todos os dados salvos e restaurar o aplicativo?'
    );
    if (!confirmed) return;

    resetAppButton.disabled = true;
    resetAppButton.textContent = 'Resetando…';

    await resetStoredData();

    resetAppButton.disabled = false;
    resetAppButton.textContent = originalLabel;

    alert('Os dados locais foram limpos. O aplicativo será recarregado.');
    MarcoBus.emit('app:reset:complete');
    window.location.reload();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const activeButton = railButtons.find((button) => button.getAttribute('aria-current') === 'page');
  if (activeButton) {
    setActivePanel(activeButton.dataset.target, activeButton.textContent.trim());
  }
  bootstrapAuthWatcher();
});
