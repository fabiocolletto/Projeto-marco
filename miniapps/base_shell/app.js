import {
  registerDictionary,
  initI18n,
  t,
  setLang,
  getLang,
  onLanguageChange
} from '../../packages/base.i18n/i18n.js';
import {
  initTheme,
  setTheme,
  getTheme,
  onThemeChange
} from '../../packages/base.theme/theme.js';
import {
  register,
  login,
  logout,
  currentUser,
  listUsers,
  switchUser,
  onAuthChange
} from '../../packages/base.security/auth.js';
import {
  isAvailable as isStoreAvailable,
  init as initProjectStore,
  listProjects,
  backupAll,
  restoreBackup,
  wipeAll,
  ensurePersistence as ensureStorePersistence,
  ping as pingStore
} from '../../shared/projectStore.js';

const LANG_RESOURCES = [
  { lang: 'pt-BR', file: 'pt-br.json', labelKey: 'lang.pt' },
  { lang: 'en-US', file: 'en-us.json', labelKey: 'lang.en' },
  { lang: 'es-419', file: 'es-419.json', labelKey: 'lang.es' }
];

const THEME_ICON_MAP = {
  light: '☀️',
  dark: '🌙'
};

const LANG_ICON_MAP = {
  'pt-BR': '🇧🇷',
  'en-US': '🇺🇸',
  'es-419': '🇪🇸'
};

const USER_PANEL_URL = new URL('./auth/profile.html', import.meta.url);

let activeMenu = null;
let settingsMenuControls = null;
const storageCardState = {
  initialized: false,
  available: false,
  busy: false,
  status: 'checking',
  statusParams: null,
  projects: [],
  feedbackKey: null,
  feedbackParams: null,
  errorMessage: null,
  persisted: null,
  persistenceSupported: null
};
let storageCardElements = null;

bootstrap();

async function bootstrap() {
  await loadDictionaries();
  const initialLang = initI18n('pt-BR');
  document.documentElement.lang = initialLang;
  applyTranslations();
  initTheme(getTheme().mode);
  setupLanguageToggle();
  updateLanguageToggle();
  setupThemeToggle();
  updateThemeToggle();
  setupUserPanelShortcut();
  updateUserPanelShortcut();
  updateUserDisplay(currentUser());
  updateProfileView(currentUser());
  setupSidebar();
  setupSettingsMenu();
  setupUserMenu();
  setupAuthForms();
  await setupStorageCard();
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
  onLanguageChange(lang => {
    document.documentElement.lang = lang;
    applyTranslations();
    updateLanguageToggle();
    updateThemeToggle();
    updateUserPanelShortcut();
    refreshUserMenu();
    refreshStorageCard();
  });
  onThemeChange(() => {
    updateThemeToggle();
  });
  onAuthChange(user => {
    updateUserDisplay(user);
    updateProfileView(user);
    updateUserPanelShortcut();
    refreshUserMenu();
    refreshStorageCard();
  });
}

async function loadDictionaries() {
  await Promise.all(
    LANG_RESOURCES.map(async resource => {
      const dictionary = await readDictionary(resource);
      registerDictionary(resource.lang, dictionary);
    })
  );
}

async function readDictionary(resource) {
  const url = new URL(`./i18n/${resource.file}`, import.meta.url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`i18n: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    try {
      const module = await import(/* @vite-ignore */ url.href, { assert: { type: 'json' } });
      return module.default;
    } catch (fallbackError) {
      console.error('i18n: unable to load dictionary', resource.lang, error, fallbackError);
      throw error;
    }
  }
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.dataset.i18n;
    const params = readParams(node.dataset.i18nParams);
    const message = t(key, params);
    if (node.tagName === 'TITLE') {
      document.title = message;
    } else if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      node.placeholder = message;
    } else if (node instanceof HTMLOptionElement) {
      node.textContent = message;
    } else {
      node.textContent = message;
    }
  });
}

function readParams(raw) {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('i18n params parse error', error);
    return undefined;
  }
}

function setupSidebar() {
  const shell = document.querySelector('.app-shell');
  const toggleButtons = [
    document.getElementById('btnMenu'),
    document.getElementById('btnCollapse')
  ].filter(Boolean);
  if (!shell || toggleButtons.length === 0) return;
  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      const collapsed = shell.classList.toggle('is-collapsed');
      toggleButtons.forEach(control => control.setAttribute('aria-expanded', String(!collapsed)));
      if (collapsed) {
        closeSettingsMenu();
      }
    });
  });
}

function setupSettingsMenu() {
  const toggle = document.getElementById('settings-toggle');
  const submenu = document.getElementById('settings-submenu');
  if (!toggle || !submenu) return;
  const container = toggle.closest('.has-submenu');
  settingsMenuControls = { toggle, submenu, container };
  toggle.setAttribute('aria-expanded', 'false');
  submenu.hidden = true;
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    const next = !expanded;
    toggle.setAttribute('aria-expanded', String(next));
    submenu.hidden = !next;
    if (next) {
      closeActiveMenu();
    }
  });
}

function closeSettingsMenu() {
  if (!settingsMenuControls) return;
  const { toggle, submenu } = settingsMenuControls;
  if (!toggle || !submenu) return;
  toggle.setAttribute('aria-expanded', 'false');
  submenu.hidden = true;
}

function setupLanguageToggle() {
  const button = document.getElementById('btnLang');
  if (!button) return;
  button.addEventListener('click', () => {
    const current = getLang();
    const index = LANG_RESOURCES.findIndex(resource => resource.lang === current);
    const next = LANG_RESOURCES[(index + 1) % LANG_RESOURCES.length];
    setLang(next.lang);
  });
}

function updateLanguageToggle() {
  const button = document.getElementById('btnLang');
  if (!button) return;
  const icon = button.querySelector('[data-lang-icon]');
  const srOnly = button.querySelector('.sr-only');
  const current = getLang();
  const resource = LANG_RESOURCES.find(item => item.lang === current);
  const label = resource ? t(resource.labelKey) : current;
  const actionLabel = t('actions.toggleLanguage');
  const withContext = `${actionLabel} (${label})`;
  button.setAttribute('aria-label', withContext);
  button.title = withContext;
  if (srOnly) {
    srOnly.textContent = withContext;
  }
  if (icon) {
    icon.textContent = LANG_ICON_MAP[current] || '🌐';
  }
}

function setupThemeToggle() {
  const button = document.getElementById('btnTheme');
  if (!button) return;
  button.addEventListener('click', () => {
    const { resolved } = getTheme();
    const next = resolved === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });
}

function setupUserPanelShortcut() {
  const button = document.getElementById('btnUserPanel');
  if (!button) return;
  button.addEventListener('click', () => {
    handleUserAction('profile');
    closeSettingsMenu();
  });
}

function updateUserPanelShortcut() {
  const button = document.getElementById('btnUserPanel');
  if (!button) return;
  const srOnly = button.querySelector('.sr-only');
  const user = currentUser();
  const baseLabel = t('actions.openUserPanel');
  let label = baseLabel;
  if (user && user.name) {
    const contextKey = 'actions.openUserPanelWithName';
    const contextual = t(contextKey, { name: user.name });
    label = contextual === contextKey ? `${baseLabel} (${user.name})` : contextual;
  }
  button.setAttribute('aria-label', label);
  button.title = label;
  if (srOnly) {
    srOnly.textContent = label;
  }
}

function setupUserMenu() {
  const button = document.getElementById('btnUser');
  const menu = document.getElementById('user-menu');
  if (!button || !menu) return;
  menu.hidden = true;
  button.addEventListener('click', event => {
    event.stopPropagation();
    toggleMenu(button, menu, renderUserMenu);
  });
}

function renderUserMenu(menu) {
  menu.innerHTML = '';
  menu.appendChild(createMenuAction('profile', t('actions.profile')));
  const users = listUsers();
  if (users.length > 0) {
    const label = document.createElement('li');
    label.className = 'menu-label';
    label.textContent = t('actions.switchUser');
    menu.appendChild(label);
    const active = currentUser();
    users.forEach(user => {
      const item = document.createElement('li');
      const option = document.createElement('button');
      option.type = 'button';
      option.textContent = user.name;
      option.dataset.email = user.email;
      if (active && active.id === user.id) {
        option.setAttribute('aria-current', 'true');
      }
      option.addEventListener('click', () => {
        switchUser(user.email);
        announce(t('auth.feedback.switched', { name: user.name }));
        closeActiveMenu();
      });
      item.appendChild(option);
      menu.appendChild(item);
    });
  }
  menu.appendChild(createMenuAction('logout', t('actions.logout')));
}

function refreshUserMenu() {
  const menu = document.getElementById('user-menu');
  if (menu) {
    renderUserMenu(menu);
  }
}

function createMenuAction(action, label) {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.action = action;
  button.textContent = label;
  button.addEventListener('click', () => handleUserAction(action));
  item.appendChild(button);
  return item;
}

function handleUserAction(action) {
  if (action === 'profile') {
    window.location.href = USER_PANEL_URL.href;
    return;
  }
  if (action === 'logout') {
    logout();
    announce(t('actions.logout'));
    closeActiveMenu();
  }
}

function updateThemeToggle() {
  const button = document.getElementById('btnTheme');
  if (!button) return;
  const icon = button.querySelector('[data-theme-icon]');
  const label = t('actions.toggleTheme');
  const { resolved } = getTheme();
  const symbol = THEME_ICON_MAP[resolved] || THEME_ICON_MAP.light;
  button.setAttribute('aria-pressed', String(resolved === 'dark'));
  button.setAttribute('aria-label', label);
  button.title = label;
  if (icon) {
    icon.textContent = symbol;
  }
  const srOnly = button.querySelector('.sr-only');
  if (srOnly) {
    srOnly.textContent = label;
  }
}

function toggleMenu(button, menu, renderer) {
  if (activeMenu && activeMenu.menu !== menu) {
    closeActiveMenu();
  }
  const isOpen = !menu.hidden;
  if (isOpen) {
    closeMenu(button, menu);
    return;
  }
  renderer(menu);
  menu.hidden = false;
  button.setAttribute('aria-expanded', 'true');
  activeMenu = { button, menu };
}

function closeMenu(button, menu) {
  menu.hidden = true;
  button.setAttribute('aria-expanded', 'false');
  if (activeMenu && activeMenu.menu === menu) {
    activeMenu = null;
  }
}

function closeActiveMenu() {
  if (!activeMenu) return;
  closeMenu(activeMenu.button, activeMenu.menu);
}

function handleDocumentClick(event) {
  if (settingsMenuControls && settingsMenuControls.container) {
    const { container } = settingsMenuControls;
    if (!container.contains(event.target)) {
      closeSettingsMenu();
    }
  }
  if (!activeMenu) return;
  const { button, menu } = activeMenu;
  if (button.contains(event.target) || menu.contains(event.target)) return;
  closeActiveMenu();
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeSettingsMenu();
    closeActiveMenu();
  }
}

function setupAuthForms() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const feedback = document.getElementById('login-feedback');
    loginForm.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(loginForm);
      try {
        const user = login({
          email: data.get('email'),
          password: data.get('password')
        });
        announceTo(feedback, t('auth.feedback.loggedIn', { name: user.name }));
      } catch (error) {
        const message = error.message === 'auth:invalid-credentials'
          ? t('auth.feedback.invalid')
          : t('auth.feedback.invalid');
        announceTo(feedback, message);
      }
    });
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    const feedback = document.getElementById('register-feedback');
    registerForm.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(registerForm);
      try {
        const user = register({
          name: data.get('name'),
          email: data.get('email'),
          password: data.get('password'),
          role: data.get('role')
        });
        announceTo(feedback, t('auth.feedback.registered'));
        updateUserDisplay(user);
        registerForm.reset();
      } catch (error) {
        const message = error.message === 'auth:user-exists'
          ? t('auth.feedback.exists')
          : error.message;
        announceTo(feedback, message);
      }
    });
  }

  const logoutButton = document.getElementById('profile-logout');
  if (logoutButton) {
    const feedback = document.getElementById('profile-feedback');
    logoutButton.addEventListener('click', () => {
      logout();
      announceTo(feedback, t('actions.logout'));
    });
  }
}

function updateUserDisplay(user) {
  const display = document.getElementById('current-user');
  if (display) {
    display.textContent = user ? user.name : '--';
  }
}

function updateProfileView(user) {
  const name = document.getElementById('profile-name');
  const email = document.getElementById('profile-email');
  const role = document.getElementById('profile-role');
  if (!name || !email || !role) return;
  if (user) {
    name.textContent = user.name;
    email.textContent = user.email;
    role.textContent = user.role === 'owner' ? t('auth.form.owner') : t('auth.form.member');
  } else {
    name.textContent = '--';
    email.textContent = '--';
    role.textContent = '--';
  }
}

function announce(message) {
  const feedback = document.querySelector('.feedback');
  announceTo(feedback, message);
}

function announceTo(element, message) {
  if (!element) return;
  element.textContent = message;
}

async function setupStorageCard() {
  const elements = getStorageCardElements();
  if (!elements) return;
  storageCardElements = elements;
  storageCardState.initialized = true;
  elements.spinner.textContent = t('storage.spinner.label');
  elements.spinner.dataset.i18n = 'storage.spinner.label';
  bindStorageEvents(elements);
  updateStorageCardUI();

  if (!isStoreAvailable()) {
    storageCardState.available = false;
    storageCardState.status = 'unsupported';
    setStorageFeedback('storage.feedback.unavailable');
    updateStorageCardUI();
    return;
  }

  setStorageBusy(true);
  try {
    await initProjectStore();
    const ok = await safePing();
    storageCardState.available = ok;
    storageCardState.status = ok ? 'ready' : 'error';
    if (!ok) {
      const reason = { key: 'storage.errors.ping' };
      setStorageError(reason.key, reason.params);
      setStorageFeedback('storage.feedback.pingFailed', {
        reasonKey: reason.key,
        reasonParams: reason.params
      });
    } else {
      clearStorageError();
      clearStorageFeedback();
    }
    storageCardState.projects = listProjects();
  } catch (error) {
    const resolved = resolveStorageError(error);
    storageCardState.available = false;
    storageCardState.status = 'error';
    setStorageError(resolved.key, resolved.params);
    setStorageFeedback('storage.feedback.initError', {
      reasonKey: resolved.key,
      reasonParams: resolved.params
    });
  } finally {
    setStorageBusy(false);
    updateStorageCardUI();
  }
}

function refreshStorageCard() {
  if (!storageCardElements || !storageCardState.initialized) return;
  updateStorageCardUI();
}

function getStorageCardElements() {
  const card = document.getElementById('storage-card');
  if (!card) return null;
  return {
    card,
    statusText: document.getElementById('storage-status-text'),
    count: document.getElementById('storage-count'),
    list: document.getElementById('storage-projects'),
    exportBtn: document.getElementById('storage-export'),
    importBtn: document.getElementById('storage-import'),
    wipeBtn: document.getElementById('storage-wipe'),
    persistLink: document.getElementById('storage-persist'),
    fileInput: document.getElementById('storage-import-file'),
    feedback: document.getElementById('storage-feedback'),
    spinner: document.getElementById('storage-spinner'),
    controls: card.querySelector('[data-controls]')
  };
}

function bindStorageEvents(elements) {
  if (elements.exportBtn) {
    elements.exportBtn.addEventListener('click', handleStorageExport);
  }
  if (elements.importBtn) {
    elements.importBtn.addEventListener('click', handleStorageImport);
  }
  if (elements.fileInput) {
    elements.fileInput.addEventListener('change', handleStorageFileImport);
  }
  if (elements.wipeBtn) {
    elements.wipeBtn.addEventListener('click', handleStorageWipe);
  }
  if (elements.persistLink) {
    elements.persistLink.addEventListener('click', handleStoragePersistence);
  }
}

function updateStorageCardUI() {
  if (!storageCardElements) return;
  const { card, statusText, count, list, exportBtn, importBtn, wipeBtn, persistLink, feedback, spinner } =
    storageCardElements;
  if (card) {
    card.dataset.status = storageCardState.status;
    card.classList.toggle('is-busy', storageCardState.busy);
  }
  if (spinner) {
    spinner.hidden = !storageCardState.busy;
  }
  if (statusText) {
    const message = renderStorageStatus();
    statusText.textContent = message;
  }
  if (count) {
    count.textContent = String(storageCardState.projects.length);
  }
  if (list) {
    list.innerHTML = '';
    if (storageCardState.projects.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = t('storage.summary.empty');
      list.appendChild(empty);
    } else {
      storageCardState.projects.forEach(project => {
        const item = document.createElement('li');
        item.textContent = renderProjectEntry(project);
        list.appendChild(item);
      });
    }
  }
  if (feedback) {
    const message = renderStorageFeedback();
    feedback.textContent = message;
  }
  const disableControls = !storageCardState.available || storageCardState.busy;
  if (exportBtn) {
    exportBtn.disabled = disableControls;
  }
  if (importBtn) {
    importBtn.disabled = disableControls;
  }
  if (wipeBtn) {
    wipeBtn.disabled = disableControls;
  }
  if (persistLink) {
    if (disableControls) {
      persistLink.setAttribute('aria-disabled', 'true');
      persistLink.classList.add('is-disabled');
    } else {
      persistLink.removeAttribute('aria-disabled');
      persistLink.classList.remove('is-disabled');
    }
  }
}

async function handleStorageExport() {
  if (!canUseStorage()) return;
  clearStorageFeedback();
  setStorageBusy(true);
  try {
    const payload = await backupAll();
    const name = getBackupFilename();
    downloadJSON(name, payload);
    markStorageReady();
    setStorageFeedback('storage.feedback.exportSuccess', {
      count: storageCardState.projects.length
    });
  } catch (error) {
    const resolved = resolveStorageError(error);
    markStorageError(resolved);
    setStorageFeedback('storage.feedback.exportError', {
      reasonKey: resolved.key,
      reasonParams: resolved.params
    });
  } finally {
    setStorageBusy(false);
  }
}

function handleStorageImport(event) {
  event.preventDefault();
  if (!canUseStorage()) return;
  if (storageCardElements?.fileInput) {
    storageCardElements.fileInput.value = '';
    storageCardElements.fileInput.click();
  }
}

async function handleStorageFileImport(event) {
  const input = event.currentTarget;
  if (!input || !input.files || input.files.length === 0) {
    return;
  }
  if (!canUseStorage()) {
    input.value = '';
    return;
  }
  const file = input.files[0];
  clearStorageFeedback();
  setStorageBusy(true);
  try {
    const text = await readFileAsText(file);
    await restoreBackup(text);
    refreshStorageProjects();
    setStorageFeedback('storage.feedback.importSuccess', {
      count: storageCardState.projects.length
    });
  } catch (error) {
    const resolved = resolveStorageError(error);
    markStorageError(resolved);
    setStorageFeedback('storage.feedback.importError', {
      reasonKey: resolved.key,
      reasonParams: resolved.params
    });
  } finally {
    setStorageBusy(false);
    input.value = '';
  }
}

async function handleStorageWipe() {
  if (!canUseStorage()) return;
  clearStorageFeedback();
  setStorageBusy(true);
  try {
    await wipeAll();
    refreshStorageProjects();
    setStorageFeedback('storage.feedback.wipeSuccess');
  } catch (error) {
    const resolved = resolveStorageError(error);
    markStorageError(resolved);
    setStorageFeedback('storage.feedback.wipeError', {
      reasonKey: resolved.key,
      reasonParams: resolved.params
    });
  } finally {
    setStorageBusy(false);
  }
}

async function handleStoragePersistence(event) {
  event.preventDefault();
  if (!isStoreAvailable()) {
    setStorageFeedback('storage.feedback.unavailable');
    return;
  }
  clearStorageFeedback();
  setStorageBusy(true);
  try {
    const result = await ensureStorePersistence();
    storageCardState.persistenceSupported = !!result.supported;
    storageCardState.persisted = !!result.persisted;
    if (!result.supported) {
      setStorageFeedback('storage.feedback.persistenceUnsupported');
    } else if (result.persisted) {
      markStorageReady();
      setStorageFeedback('storage.feedback.persistenceSuccess');
    } else {
      setStorageFeedback('storage.feedback.persistenceDenied');
    }
  } catch (error) {
    const resolved = resolveStorageError(error);
    markStorageError(resolved);
    setStorageFeedback('storage.feedback.persistenceError', {
      reasonKey: resolved.key,
      reasonParams: resolved.params
    });
  } finally {
    setStorageBusy(false);
  }
}

function canUseStorage() {
  if (!storageCardState.available) {
    setStorageFeedback('storage.feedback.unavailable');
    return false;
  }
  if (storageCardState.busy) {
    return false;
  }
  return true;
}

function setStorageBusy(value) {
  storageCardState.busy = value;
  updateStorageCardUI();
}

function clearStorageFeedback() {
  storageCardState.feedbackKey = null;
  storageCardState.feedbackParams = null;
}

function setStorageFeedback(key, params) {
  storageCardState.feedbackKey = key;
  storageCardState.feedbackParams = params || null;
  updateStorageCardUI();
}

function setStorageError(key, params) {
  storageCardState.errorKey = key;
  storageCardState.errorParams = params || null;
}

function clearStorageError() {
  storageCardState.errorKey = null;
  storageCardState.errorParams = null;
}

function markStorageReady() {
  storageCardState.status = 'ready';
  storageCardState.available = true;
  clearStorageError();
}

function markStorageError(resolved) {
  storageCardState.status = 'error';
  setStorageError(resolved.key, resolved.params);
}

function renderStorageStatus() {
  const map = {
    checking: 'storage.status.checking',
    ready: 'storage.status.ready',
    unsupported: 'storage.status.unsupported',
    error: 'storage.status.error'
  };
  const key = map[storageCardState.status] || map.error;
  let params = storageCardState.statusParams || {};
  if (storageCardState.status === 'error') {
    const reason = storageCardState.errorKey
      ? t(storageCardState.errorKey, storageCardState.errorParams || {})
      : '';
    params = { message: reason };
  }
  return t(key, params);
}

function renderStorageFeedback() {
  if (!storageCardState.feedbackKey) return '';
  const params = { ...(storageCardState.feedbackParams || {}) };
  if (params.reasonKey) {
    params.reason = t(params.reasonKey, params.reasonParams || {});
    delete params.reasonKey;
    delete params.reasonParams;
  }
  return t(storageCardState.feedbackKey, params);
}

function renderProjectEntry(project) {
  const name = project.nome || '—';
  const updatedAt = project.updatedAt ? formatDate(project.updatedAt) : '';
  return t('storage.list.item', { name, date: updatedAt });
}

function formatDate(timestamp) {
  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(getLang(), {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  } catch (error) {
    return new Date(timestamp).toLocaleString();
  }
}

function refreshStorageProjects() {
  try {
    storageCardState.projects = listProjects();
    markStorageReady();
    storageCardState.available = true;
    updateStorageCardUI();
  } catch (error) {
    const resolved = resolveStorageError(error);
    markStorageError(resolved);
    setStorageFeedback('storage.feedback.refreshError', {
      reasonKey: resolved.key,
      reasonParams: resolved.params
    });
  }
}

function resolveStorageError(error) {
  if (!error) {
    return { key: 'storage.errors.unknown' };
  }
  const name = error.name || '';
  if (name === 'QuotaExceededError') {
    return { key: 'storage.errors.quota' };
  }
  if (name === 'NotAllowedError') {
    return { key: 'storage.errors.notAllowed' };
  }
  if (name === 'AbortError') {
    return { key: 'storage.errors.aborted' };
  }
  if (error instanceof SyntaxError) {
    return { key: 'storage.errors.invalidJson' };
  }
  return {
    key: 'storage.errors.generic',
    params: { message: error.message || String(error) }
  };
}

function downloadJSON(filename, text) {
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (error) {
    console.error('storage: unable to trigger download', error);
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('File read error'));
    reader.readAsText(file);
  });
}

function getBackupFilename() {
  const iso = new Date().toISOString().replace(/[:.]/g, '-');
  return `miniapp-backup-${iso}.json`;
}

async function safePing() {
  try {
    return await pingStore();
  } catch (error) {
    console.warn('storage: ping failed', error);
    return false;
  }
}
