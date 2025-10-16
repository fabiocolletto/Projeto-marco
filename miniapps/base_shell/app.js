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
  onAuthChange,
  updateUserProfile,
  changePassword,
  deleteUser,
  setUserPassword
} from '../../packages/base.security/auth.js';

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

const MINI_APP_CATALOG = [
  {
    id: 'mini-app-1',
    labelKey: 'nav.miniapps.miniappOne',
    welcomeTitleKey: 'panel.miniapps.item1.title',
    welcomeMessageKey: 'panel.miniapps.item1.message',
    icon: '🧩',
    route: '../mini_app_1/index.html'
  },
  {
    id: 'mini-app-2',
    labelKey: 'nav.miniapps.miniappTwo',
    welcomeTitleKey: 'panel.miniapps.item2.title',
    welcomeMessageKey: 'panel.miniapps.item2.message',
    icon: '🧩',
    route: '../mini_app_2/index.html'
  }
];

const MINI_APP_CATALOG_MAP = new Map(MINI_APP_CATALOG.map(item => [item.id, item]));

const DEFAULT_MINI_APP_CONTENT = {
  titleKey: 'panel.welcomeTitle',
  messageKey: 'panel.welcomeMessage'
};

const SHELL_APP_ID = 'base.shell';

const USER_PANEL_URL = new URL('./auth/profile.html', import.meta.url);
const LOGIN_URL = new URL('./auth/login.html', import.meta.url);
const HOME_REDIRECT_DELAY = 500;

const FEEDBACK_CLEAR_DELAY = 3000;
const PANEL_HIGHLIGHT_DURATION = 1600;
const SIDEBAR_STORAGE_KEY = `${SHELL_APP_ID}:sidebar.collapsed`;
const SIDEBAR_RESPONSIVE_QUERY = '(max-width: 900px)';
const feedbackTimers = new WeakMap();
const highlightTimers = new WeakMap();
const preferenceStorage = createPreferenceStorage(() => window.localStorage);

let revisionInfo = null;
let activeMenu = null;
let settingsMenuControls = null;
let languageDialogControls = null;
let isRedirectingHome = false;
let userManagementControls = null;

let sidebarControls = null;
let miniAppMenuControls = null;
let homeNavigationControls = null;

const userManagementState = {
  mode: null,
  targetId: null
};

const miniAppState = {
  items: [],
  activeId: null
};

const stageControls = {
  host: null,
  fallback: null
};

let stageRenderToken = 0;

bootstrap();

async function bootstrap() {
  await loadDictionaries();
  const initialLang = initI18n('pt-BR');
  document.documentElement.lang = initialLang;
  revisionInfo = await loadRevisionInfo();
  updateRevisionMetadata();
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
  const miniApps = await loadActiveMiniApps();
  const initialMiniAppId = getInitialMiniAppId(miniApps);
  if (initialMiniAppId) {
    miniAppState.activeId = initialMiniAppId;
  }
  updateNavigationState();
  setupMiniAppMenu(miniApps);
  if (initialMiniAppId) {
    updateMiniAppHistory(initialMiniAppId, { replace: true });
  }
  setupSettingsMenu();
  setupUserMenu();
  setupAuthForms();
  setupUserManagement();
  updateRegistrationAccess();
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('popstate', handleHistoryNavigation);
  onLanguageChange(lang => {
    document.documentElement.lang = lang;
    updateRevisionMetadata();
    applyTranslations();
    updateLanguageToggle();
    renderLanguageOptions();
    updateThemeToggle();
    updateUserPanelShortcut();
    refreshUserMenu();
    renderMiniAppMenu();
    updateMiniAppPanel();
    refreshSidebarNavigationLabels();
  });
  onThemeChange(() => {
    updateThemeToggle();
  });
  onAuthChange(user => {
    updateUserDisplay(user);
    updateProfileView(user);
    updateUserPanelShortcut();
    refreshUserMenu();
    refreshUserManagement();
    updateRegistrationAccess();
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

async function loadRevisionInfo() {
  const manifestUrl = new URL('./manifest.json', import.meta.url);
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`manifest: ${response.status} ${response.statusText}`);
    }
    const manifest = await response.json();
    return extractRevisionInfo(manifest);
  } catch (error) {
    try {
      const module = await import(/* @vite-ignore */ manifestUrl.href, { assert: { type: 'json' } });
      const manifest = module?.default ?? module;
      return extractRevisionInfo(manifest);
    } catch (fallbackError) {
      console.warn('shell: unable to read manifest', error, fallbackError);
      return null;
    }
  }
}

async function loadActiveMiniApps() {
  try {
    const registryUrl = new URL('../../appbase/registry.json', import.meta.url);
    const registry = await readJsonResource(registryUrl);
    const catalog = normalizeMiniAppEntries(registry && registry.apps);
    if (catalog.length) {
      return catalog;
    }
  } catch (error) {
    console.warn('mini-app registry: using fallback catalog', error);
  }
  return normalizeMiniAppEntries(MINI_APP_CATALOG);
}

async function readJsonResource(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`mini-app registry: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    try {
      const module = await import(/* @vite-ignore */ url.href, { assert: { type: 'json' } });
      return module.default;
    } catch (fallbackError) {
      throw new AggregateError([error, fallbackError], 'mini-app registry: unable to read resource');
    }
  }
}

function normalizeMiniAppEntries(entries) {
  const items = Array.isArray(entries) ? entries : [];
  return items
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      if (entry.active === false) return null;
      if (!entry.id || !entry.labelKey) return null;
      if (entry.id === SHELL_APP_ID) return null;
      const order = typeof entry.order === 'number' ? entry.order : Number.POSITIVE_INFINITY;
      const fallback = MINI_APP_CATALOG_MAP.get(entry.id) || null;
      return {
        id: String(entry.id),
        labelKey: String(entry.labelKey),
        icon: entry.icon || fallback?.icon || '🧩',
        route: entry.route
          ? String(entry.route)
          : fallback?.route
          ? String(fallback.route)
          : undefined,
        welcomeTitleKey:
          entry.welcomeTitleKey || fallback?.welcomeTitleKey || DEFAULT_MINI_APP_CONTENT.titleKey,
        welcomeMessageKey:
          entry.welcomeMessageKey || fallback?.welcomeMessageKey || DEFAULT_MINI_APP_CONTENT.messageKey,
        order,
        index
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.order === b.order) {
        return a.index - b.index;
      }
      return a.order - b.order;
    })
    .map(item => {
      const { order, index, ...rest } = item;
      return rest;
    });
}

function extractRevisionInfo(manifest) {
  if (!manifest || typeof manifest !== 'object') return null;
  const version = manifest.version ? String(manifest.version) : null;
  const revision = manifest.revision ? String(manifest.revision) : null;
  const name = manifest.name ? String(manifest.name) : null;
  return { version, revision, name };
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
    const params = parseI18nParams(node.dataset.i18nParams);
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

function parseI18nParams(rawParams) {
  if (!rawParams) return undefined;
  try {
    return JSON.parse(rawParams);
  } catch (error) {
    console.warn('i18n: invalid params payload', rawParams, error);
    return undefined;
  }
}

function updateRevisionMetadata() {
  const node = document.querySelector('[data-revision]');
  if (!node) return;
  let appName = t('app.title');
  if (!appName || appName === 'app.title') {
    appName = (revisionInfo && revisionInfo.name) || 'MiniApp Base';
  }
  if (revisionInfo && (revisionInfo.revision || revisionInfo.version)) {
    const revisionLabel = String(revisionInfo.revision || revisionInfo.version || '—');
    const versionLabel = String(revisionInfo.version || revisionInfo.revision || '—');
    node.dataset.i18n = 'footer.revision';
    node.dataset.i18nParams = JSON.stringify({
      appName,
      revision: revisionLabel,
      version: versionLabel
    });
  } else {
    node.dataset.i18n = 'footer.revisionFallback';
    node.dataset.i18nParams = JSON.stringify({ appName });
  }
}

function getSidebarControls() {
  if (sidebarControls) {
    return sidebarControls;
  }
  const shell = document.querySelector('.app-shell');
  const menuButton = document.getElementById('btnMenu');
  if (!shell || !menuButton) {
    return null;
  }
  sidebarControls = { shell, buttons: [menuButton] };
  return sidebarControls;
}

function setSidebarCollapsed(collapsed, options = {}) {
  const controls = getSidebarControls();
  if (!controls) return;
  const { shell, buttons } = controls;
  const shouldCollapse = Boolean(collapsed);
  shell.classList.toggle('is-collapsed', shouldCollapse);
  shell.dataset.sidebarCollapsed = String(shouldCollapse);
  buttons.forEach(button => button.setAttribute('aria-expanded', String(!shouldCollapse)));
  updateSidebarNavigationLabels(shouldCollapse);
  if (options.persist !== false) {
    persistSidebarPreference(shouldCollapse);
  }
  if (shouldCollapse && options.closeSettingsMenu !== false) {
    closeSettingsMenu();
    closeMiniAppMenu();
  }
}

function setupSidebar() {
  const controls = getSidebarControls();
  if (!controls) return;
  const { shell, buttons } = controls;
  const initialCollapsed = getPreferredSidebarCollapsed();
  setSidebarCollapsed(initialCollapsed, { persist: false, skipFocus: true });
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const next = !shell.classList.contains('is-collapsed');
      setSidebarCollapsed(next);
    });
  });
  setupResponsiveSidebarObserver();
  setupSidebarKeyboardNavigation();
  refreshSidebarNavigationLabels();
  setupHomeNavigation();
}

function getPreferredSidebarCollapsed() {
  if (shouldCollapseForViewport()) {
    return true;
  }
  const stored = getStoredSidebarPreference();
  if (stored !== null) {
    return stored;
  }
  return false;
}

function shouldCollapseForViewport() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    const mediaQuery = window.matchMedia(SIDEBAR_RESPONSIVE_QUERY);
    return Boolean(mediaQuery && mediaQuery.matches);
  } catch (error) {
    console.warn('shell: unable to evaluate responsive sidebar media query', error);
    return false;
  }
}

function setupResponsiveSidebarObserver() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return;
  }
  try {
    const mediaQuery = window.matchMedia(SIDEBAR_RESPONSIVE_QUERY);
    const handler = event => {
      const storedPreference = getStoredSidebarPreference();
      if (event.matches) {
        setSidebarCollapsed(true, { persist: false, skipFocus: true });
        return;
      }
      if (storedPreference !== null) {
        setSidebarCollapsed(storedPreference, { persist: false, skipFocus: true });
      } else {
        setSidebarCollapsed(false, { persist: false, skipFocus: true });
      }
    };
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handler);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handler);
    }
  } catch (error) {
    console.warn('shell: unable to setup responsive sidebar observer', error);
  }
}

function refreshSidebarNavigationLabels() {
  const controls = getSidebarControls();
  if (!controls) return;
  const { shell } = controls;
  const isCollapsed = shell.classList.contains('is-collapsed');
  updateSidebarNavigationLabels(isCollapsed);
}

function updateSidebarNavigationLabels(collapsed) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const interactive = sidebar.querySelectorAll(
    'nav > ul > li > a, nav > ul > li > button.submenu-toggle'
  );
  interactive.forEach(control => {
    const label = getSidebarItemLabel(control);
    if (!label) {
      return;
    }
    if (collapsed) {
      control.setAttribute('aria-label', label);
      control.title = label;
      control.dataset.sidebarAutoLabel = 'true';
    } else if (control.dataset.sidebarAutoLabel === 'true') {
      control.removeAttribute('aria-label');
      control.removeAttribute('title');
      delete control.dataset.sidebarAutoLabel;
    }
  });
}

function getSidebarItemLabel(control) {
  if (!control) return '';
  const labelNode = control.querySelector('[data-sidebar-label]');
  if (labelNode && labelNode.textContent) {
    return labelNode.textContent.trim();
  }
  const srOnly = control.querySelector('.sr-only');
  if (srOnly && srOnly.textContent) {
    return srOnly.textContent.trim();
  }
  if (typeof control.getAttribute === 'function') {
    const existing = control.getAttribute('aria-label');
    if (existing) {
      return existing.trim();
    }
    const title = control.getAttribute('title');
    if (title) {
      return title.trim();
    }
  }
  return control.textContent ? control.textContent.trim() : '';
}

function setupSidebarKeyboardNavigation() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar || sidebar.dataset.sidebarKeyboard === 'true') {
    return;
  }
  const handleKeydown = event => {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) {
      return;
    }
    const focusable = getSidebarFocusableItems();
    if (!focusable.length) return;
    const currentIndex = focusable.indexOf(document.activeElement);
    if (currentIndex === -1) return;
    event.preventDefault();
    let nextIndex = currentIndex;
    switch (event.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % focusable.length;
        break;
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = focusable.length - 1;
        break;
      default:
        break;
    }
    const nextItem = focusable[nextIndex];
    if (nextItem && typeof nextItem.focus === 'function') {
      nextItem.focus();
    }
  };
  sidebar.addEventListener('keydown', handleKeydown);
  sidebar.dataset.sidebarKeyboard = 'true';
}

function getSidebarFocusableItems() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return [];
  const selector = 'a[href], button:not([disabled])';
  return Array.from(sidebar.querySelectorAll(selector)).filter(element => {
    if (element.hasAttribute('hidden')) {
      return false;
    }
    const isHidden = element.closest('[hidden]');
    return !isHidden;
  });
}

function setupHomeNavigation() {
  const shell = document.querySelector('.app-shell');
  if (!shell) return;
  const homeLinks = Array.from(shell.querySelectorAll('[data-nav-action="home"]'));
  if (!homeLinks.length) return;
  homeNavigationControls = { homeLinks };
  homeLinks.forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const wasActive = Boolean(miniAppState.activeId);
      setActiveMiniApp(null);
      closeMiniAppMenu();
      if (wasActive) {
        focusPanel();
      }
    });
  });
  updateNavigationState();
}

function updateNavigationState() {
  if (!homeNavigationControls || !Array.isArray(homeNavigationControls.homeLinks)) {
    return;
  }
  const isHomeActive = !miniAppState.activeId;
  homeNavigationControls.homeLinks.forEach(link => {
    if (isHomeActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function setupMiniAppMenu(items) {
  const toggle = document.getElementById('miniapp-toggle');
  const submenu = document.getElementById('miniapp-submenu');
  if (!toggle || !submenu) return;
  const container = toggle.closest('.has-submenu');
  miniAppMenuControls = { toggle, submenu, container, shouldRestoreSettings: false };
  toggle.setAttribute('aria-expanded', 'false');
  submenu.hidden = true;
  miniAppState.items = Array.isArray(items) ? [...items] : [];
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    const next = !expanded;
    if (next) {
      const wasOpen =
        settingsMenuControls &&
        settingsMenuControls.toggle &&
        settingsMenuControls.toggle.getAttribute('aria-expanded') === 'true';
      if (miniAppMenuControls) {
        miniAppMenuControls.shouldRestoreSettings = Boolean(wasOpen);
      }
      if (wasOpen) {
        closeSettingsMenu();
      }
      closeActiveMenu();
    }
    toggle.setAttribute('aria-expanded', String(next));
    submenu.hidden = !next;
    if (next) {
      renderMiniAppMenu();
    } else if (miniAppMenuControls && miniAppMenuControls.shouldRestoreSettings) {
      openSettingsMenu();
      miniAppMenuControls.shouldRestoreSettings = false;
    }
  });
  renderMiniAppMenu();
  updateMiniAppPanel();
}

function renderMiniAppMenu() {
  if (!miniAppMenuControls) return;
  const { toggle, submenu } = miniAppMenuControls;
  const items = Array.isArray(miniAppState.items) ? miniAppState.items : [];
  submenu.innerHTML = '';
  toggle.disabled = items.length === 0;
  toggle.setAttribute('aria-disabled', items.length === 0 ? 'true' : 'false');
  if (!items.length) {
    toggle.setAttribute('aria-expanded', 'false');
    submenu.hidden = true;
    updateMiniAppToggleLabel();
    return;
  }
  items.forEach(item => {
    const listItem = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('submenu-action');
    button.dataset.miniappId = item.id;
    const isActive = item.id === miniAppState.activeId;
    if (isActive) {
      button.classList.add('is-active');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.setAttribute('aria-pressed', 'false');
    }
    const icon = document.createElement('span');
    icon.className = 'submenu-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon || '🧩';
    const label = document.createElement('span');
    label.className = 'submenu-label';
    label.setAttribute('aria-hidden', 'true');
    label.dataset.i18n = item.labelKey;
    label.dataset.sidebarLabel = 'true';
    label.textContent = item.labelKey;
    const srOnly = document.createElement('span');
    srOnly.className = 'sr-only';
    srOnly.dataset.i18n = item.labelKey;
    srOnly.textContent = item.labelKey;
    button.append(icon, label, srOnly);
    button.addEventListener('click', () => {
      setActiveMiniApp(item.id);
      closeMiniAppMenu();
    });
    listItem.appendChild(button);
    submenu.appendChild(listItem);
  });
  applyTranslations();
  submenu.querySelectorAll('.submenu-action').forEach(button => {
    const srOnly = button.querySelector('.sr-only');
    if (srOnly) {
      const label = srOnly.textContent.trim();
      button.setAttribute('aria-label', label);
      button.title = label;
    }
  });
  refreshSidebarNavigationLabels();
  updateMiniAppToggleLabel();
}

function setActiveMiniApp(id, options = {}) {
  const items = Array.isArray(miniAppState.items) ? miniAppState.items : [];
  const next = items.some(item => item.id === id) ? id : null;
  if (miniAppState.activeId === next) {
    updateNavigationState();
    updateMiniAppPanel();
    return;
  }
  miniAppState.activeId = next;
  if (!options.skipHistory) {
    updateMiniAppHistory(next);
  }
  renderMiniAppMenu();
  updateMiniAppPanel();
  updateNavigationState();
}

function closeMiniAppMenu() {
  if (!miniAppMenuControls) return;
  const { toggle, submenu } = miniAppMenuControls;
  if (!toggle || !submenu) return;
  toggle.setAttribute('aria-expanded', 'false');
  submenu.hidden = true;
  if (miniAppMenuControls.shouldRestoreSettings) {
    const restore = () => {
      openSettingsMenu();
    };
    miniAppMenuControls.shouldRestoreSettings = false;
    setTimeout(restore, 0);
  }
}

function updateMiniAppPanel() {
  const controls = getStageHost();
  if (!controls) return;
  const { fallback } = controls;
  const titleNode = fallback ? fallback.querySelector('[data-miniapp-title]') : null;
  const messageNode = fallback ? fallback.querySelector('[data-miniapp-message]') : null;
  const items = Array.isArray(miniAppState.items) ? miniAppState.items : [];
  const active = items.find(item => item.id === miniAppState.activeId);
  const titleKey = active ? active.welcomeTitleKey : DEFAULT_MINI_APP_CONTENT.titleKey;
  const messageKey = active ? active.welcomeMessageKey : DEFAULT_MINI_APP_CONTENT.messageKey;
  if (titleNode) {
    titleNode.dataset.i18n = titleKey;
    delete titleNode.dataset.i18nParams;
    const titleLabel = t(titleKey);
    titleNode.textContent = titleLabel === titleKey ? t(DEFAULT_MINI_APP_CONTENT.titleKey) : titleLabel;
  }
  if (messageNode) {
    messageNode.dataset.i18n = messageKey;
    delete messageNode.dataset.i18nParams;
    const messageLabel = t(messageKey);
    messageNode.textContent = messageLabel === messageKey ? t(DEFAULT_MINI_APP_CONTENT.messageKey) : messageLabel;
  }
  applyTranslations();
  renderMiniAppStage(active ? active.id : null);
}

function updateMiniAppToggleLabel() {
  if (!miniAppMenuControls) return;
  const { toggle } = miniAppMenuControls;
  if (!toggle) return;
  const labelNode = toggle.querySelector('.label');
  const labelText = labelNode ? labelNode.textContent.trim() : '';
  const text = labelText || t('nav.miniapps');
  toggle.setAttribute('aria-label', text);
  toggle.title = text;
}

function getStageHost() {
  if (stageControls.host && document.body.contains(stageControls.host)) {
    return stageControls;
  }
  const host = document.querySelector('[data-stage-host]');
  if (!host) {
    stageControls.host = null;
    stageControls.fallback = null;
    return null;
  }
  stageControls.host = host;
  stageControls.fallback = document.querySelector('[data-stage-fallback]');
  return stageControls;
}

function clearStage() {
  const controls = getStageHost();
  if (!controls) return;
  const { host, fallback } = controls;
  if (host) {
    host.replaceChildren();
    host.dataset.state = 'idle';
    host.setAttribute('aria-busy', 'false');
  }
  if (fallback) {
    fallback.hidden = false;
    fallback.removeAttribute('aria-hidden');
    fallback.classList.remove('is-loading');
  }
}

function renderMiniAppStage(id) {
  const controls = getStageHost();
  if (!controls || !controls.host) return;
  const { host, fallback } = controls;
  stageRenderToken += 1;
  const token = stageRenderToken;
  if (!id) {
    clearStage();
    return;
  }
  const items = Array.isArray(miniAppState.items) ? miniAppState.items : [];
  const active = items.find(item => item.id === id);
  if (!active) {
    clearStage();
    return;
  }
  const url = resolveMiniAppStageUrl(active);
  if (!url) {
    console.warn('mini-app stage: unable to resolve URL', active);
    clearStage();
    return;
  }
  host.replaceChildren();
  host.dataset.state = 'loading';
  host.setAttribute('aria-busy', 'true');
  if (fallback) {
    fallback.hidden = false;
    fallback.removeAttribute('aria-hidden');
    fallback.classList.add('is-loading');
  }
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.dataset.miniappId = active.id;
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'same-origin';
  iframe.setAttribute('title', t(active.labelKey) || active.labelKey);
  iframe.setAttribute('role', 'presentation');
  iframe.addEventListener('load', () => {
    if (stageRenderToken !== token) return;
    host.dataset.state = 'ready';
    host.setAttribute('aria-busy', 'false');
    if (fallback) {
      fallback.hidden = true;
      fallback.setAttribute('aria-hidden', 'true');
      fallback.classList.remove('is-loading');
    }
  });
  iframe.addEventListener('error', () => {
    if (stageRenderToken !== token) return;
    host.replaceChildren();
    host.dataset.state = 'error';
    host.setAttribute('aria-busy', 'false');
    if (fallback) {
      fallback.hidden = false;
      fallback.removeAttribute('aria-hidden');
      fallback.classList.remove('is-loading');
    }
  });
  host.appendChild(iframe);
}

function resolveMiniAppStageUrl(item) {
  if (!item) return null;
  if (item.route) {
    try {
      return new URL(item.route, document.baseURI).href;
    } catch (error) {
      console.warn('mini-app stage: invalid route', item.route, error);
    }
  }
  try {
    return new URL(`../${item.id}/index.html`, import.meta.url).href;
  } catch (error) {
    try {
      const normalized = String(item.id).replace(/-/g, '_');
      return new URL(`../${normalized}/index.html`, import.meta.url).href;
    } catch (fallbackError) {
      console.warn('mini-app stage: unable to infer URL', item, error, fallbackError);
      return null;
    }
  }
}

function getInitialMiniAppId(items) {
  const list = Array.isArray(items) ? items : [];
  const stateId = typeof history?.state?.miniapp === 'string' ? history.state.miniapp : null;
  if (stateId && list.some(item => item.id === stateId)) {
    return stateId;
  }
  try {
    const url = new URL(window.location.href);
    const paramId = url.searchParams.get('miniapp');
    if (paramId && list.some(item => item.id === paramId)) {
      return paramId;
    }
  } catch (error) {
    console.warn('mini-app stage: unable to read location', error);
  }
  return null;
}

function updateMiniAppHistory(id, options = {}) {
  try {
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set('miniapp', id);
    } else {
      url.searchParams.delete('miniapp');
    }
    const method = options.replace ? 'replaceState' : 'pushState';
    window.history[method]({ miniapp: id }, '', url);
  } catch (error) {
    console.warn('mini-app stage: unable to update history', error);
  }
}

function handleHistoryNavigation() {
  const next = getInitialMiniAppId(miniAppState.items);
  setActiveMiniApp(next, { skipHistory: true });
}

function focusPanel() {
  const panel = document.getElementById('panel');
  if (panel && typeof panel.focus === 'function') {
    panel.focus();
  }
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
    if (next) {
      closeActiveMenu();
      closeMiniAppMenu();
    }
    toggle.setAttribute('aria-expanded', String(next));
    submenu.hidden = !next;
  });
}

function closeSettingsMenu() {
  if (!settingsMenuControls) return;
  const { toggle, submenu } = settingsMenuControls;
  if (!toggle || !submenu) return;
  toggle.setAttribute('aria-expanded', 'false');
  submenu.hidden = true;
}

function openSettingsMenu() {
  if (!settingsMenuControls) return;
  const { toggle, submenu } = settingsMenuControls;
  if (!toggle || !submenu) return;
  toggle.setAttribute('aria-expanded', 'true');
  submenu.hidden = false;
}

function setupLanguageToggle() {
  const button = document.getElementById('btnLang');
  const dialog = document.getElementById('language-dialog');
  if (!button || !dialog) return;
  const optionsContainer = dialog.querySelector('[data-language-options]');
  const cancelButton = dialog.querySelector('[data-language-cancel]');
  if (!optionsContainer) return;
  languageDialogControls = {
    trigger: button,
    dialog,
    optionsContainer,
    cancelButton,
    optionButtons: [],
    lastTrigger: null,
    suppressDocumentClose: false
  };
  dialog.setAttribute('aria-hidden', 'true');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'language-dialog');
  renderLanguageOptions();
  button.addEventListener('click', event => {
    event.preventDefault();
    openLanguageDialog(button);
  });
  if (cancelButton) {
    cancelButton.addEventListener('click', event => {
      event.preventDefault();
      closeLanguageDialog({ suppressDocumentClose: true });
    });
  }
  dialog.addEventListener('click', event => {
    if (dialog.hidden) return;
    if (event.target === dialog) {
      event.preventDefault();
      event.stopPropagation();
      closeLanguageDialog({ suppressDocumentClose: true });
    }
  });
  dialog.addEventListener('keydown', event => {
    if (dialog.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLanguageDialog();
    }
  });
}

function renderLanguageOptions() {
  if (!languageDialogControls) return;
  const { optionsContainer } = languageDialogControls;
  if (!optionsContainer) return;
  optionsContainer.innerHTML = '';
  const current = getLang();
  const buttons = LANG_RESOURCES.map(resource => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'language-option';
    button.dataset.languageOption = resource.lang;
    button.setAttribute('aria-pressed', String(resource.lang === current));
    const label = document.createElement('span');
    label.className = 'language-option__label';
    const icon = document.createElement('span');
    icon.className = 'language-option__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = LANG_ICON_MAP[resource.lang] || '🌐';
    const text = document.createElement('span');
    text.textContent = t(resource.labelKey);
    label.append(icon, text);
    button.append(label);
    button.addEventListener('click', () => handleLanguageSelection(resource.lang));
    optionsContainer.append(button);
    return button;
  });
  languageDialogControls.optionButtons = buttons;
}

function openLanguageDialog(trigger) {
  if (!languageDialogControls) return;
  const { dialog } = languageDialogControls;
  if (!dialog || !dialog.hidden) return;
  languageDialogControls.lastTrigger = trigger || languageDialogControls.trigger;
  languageDialogControls.suppressDocumentClose = false;
  renderLanguageOptions();
  dialog.hidden = false;
  dialog.setAttribute('aria-hidden', 'false');
  const triggerButton = languageDialogControls.trigger;
  if (triggerButton) {
    triggerButton.setAttribute('aria-expanded', 'true');
  }
  const { optionButtons = [] } = languageDialogControls;
  const active = optionButtons.find(button => button.getAttribute('aria-pressed') === 'true');
  const focusTarget = active || optionButtons[0];
  if (focusTarget && typeof focusTarget.focus === 'function') {
    window.requestAnimationFrame(() => focusTarget.focus());
  }
}

function closeLanguageDialog(options = {}) {
  const { suppressDocumentClose = false } = options;
  if (!languageDialogControls) return false;
  const { dialog, lastTrigger } = languageDialogControls;
  if (!dialog || dialog.hidden) return false;
  dialog.hidden = true;
  dialog.setAttribute('aria-hidden', 'true');
  const triggerButton = languageDialogControls.trigger;
  if (triggerButton) {
    triggerButton.setAttribute('aria-expanded', 'false');
  }
  if (lastTrigger && typeof lastTrigger.focus === 'function') {
    window.requestAnimationFrame(() => lastTrigger.focus());
  }
  languageDialogControls.lastTrigger = null;
  languageDialogControls.suppressDocumentClose = suppressDocumentClose;
  return true;
}

function handleLanguageSelection(lang) {
  const current = getLang();
  if (current !== lang) {
    try {
      setLang(lang);
    } catch (error) {
      console.warn('shell: unable to switch language', error);
    }
  }
  closeLanguageDialog();
  closeSettingsMenu();
  focusPanel();
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
    const handled = handleUserPanelShortcutClick();
    if (!handled) {
      handleUserAction('profile');
    }
    closeSettingsMenu();
    closeMiniAppMenu();
  });
}

function showUserPanelShortcut(options = {}) {
  if (!settingsMenuControls) return;
  const { toggle, submenu } = settingsMenuControls;
  if (!toggle || !submenu) return;
  const button = document.getElementById('btnUserPanel');
  if (!button) return;
  toggle.setAttribute('aria-expanded', 'true');
  submenu.hidden = false;
  if (options.focus !== false && typeof button.focus === 'function') {
    window.requestAnimationFrame(() => button.focus());
  }
}

function handleUserPanelShortcutClick() {
  if (!isOnUserPanelRoute()) {
    return false;
  }
  const user = currentUser();
  const managementSection = userManagementControls?.section || document.getElementById('user-management');
  if (managementSection && !managementSection.hidden && user && user.role === 'owner') {
    highlightElement(managementSection);
    return true;
  }
  const profileCard = document.getElementById('profile-card');
  if (profileCard) {
    highlightElement(profileCard);
    if (managementSection && (!user || user.role !== 'owner')) {
      managementSection.hidden = true;
    }
    const feedback = document.getElementById('profile-feedback');
    if (feedback) {
      let message = '';
      if (!user) {
        message = t('auth.profile.userPanelLoginRequired');
      } else if (!managementSection || managementSection.hidden || user.role !== 'owner') {
        message = t('auth.profile.userPanelOwnerOnly');
      }
      if (message) {
        announceTo(feedback, message);
        scheduleFeedbackClear(feedback);
      }
    }
  }
  return true;
}

function isOnUserPanelRoute() {
  try {
    const current = new URL(window.location.href);
    const target = new URL(USER_PANEL_URL.href);
    return current.pathname === target.pathname;
  } catch (error) {
    return Boolean(document.getElementById('profile-card'));
  }
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
    closeActiveMenu();
    announce(t('actions.logout'));
    performLogout();
  }
}

function performLogout() {
  isRedirectingHome = true;
  logout();
  window.setTimeout(() => {
    window.location.href = LOGIN_URL.href;
  }, HOME_REDIRECT_DELAY);
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
  const suppressSettingsClose = languageDialogControls?.suppressDocumentClose === true;
  let shouldResetSuppression = false;
  if (settingsMenuControls && settingsMenuControls.container) {
    const { container } = settingsMenuControls;
    const sidebar = document.getElementById('sidebar');
    const insideSidebar = sidebar ? sidebar.contains(event.target) : false;
    if (suppressSettingsClose) {
      shouldResetSuppression = true;
    } else if (!container.contains(event.target) && !insideSidebar) {
      closeSettingsMenu();
    }
  } else if (suppressSettingsClose) {
    shouldResetSuppression = true;
  }
  if (shouldResetSuppression && languageDialogControls) {
    languageDialogControls.suppressDocumentClose = false;
  }
  if (miniAppMenuControls && miniAppMenuControls.container) {
    const { container } = miniAppMenuControls;
    if (!container.contains(event.target)) {
      closeMiniAppMenu();
    }
  }
  if (!activeMenu) return;
  const { button, menu } = activeMenu;
  if (button.contains(event.target) || menu.contains(event.target)) return;
  closeActiveMenu();
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    if (closeLanguageDialog()) {
      return;
    }
    closeSettingsMenu();
    closeActiveMenu();
    closeMiniAppMenu();
  }
}

function getStoredSidebarPreference() {
  try {
    const stored = preferenceStorage.get(SIDEBAR_STORAGE_KEY);
    if (stored === 'collapsed') {
      return true;
    }
    if (stored === 'expanded') {
      return false;
    }
    return null;
  } catch (error) {
    console.warn('shell: unable to read sidebar preference', error);
    return null;
  }
}

function persistSidebarPreference(collapsed) {
  const value = collapsed ? 'collapsed' : 'expanded';
  try {
    preferenceStorage.set(SIDEBAR_STORAGE_KEY, value);
  } catch (error) {
    console.warn('shell: unable to persist sidebar preference', error);
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
        showUserPanelShortcut({ focus: true });
      } catch (error) {
        const message = error.message === 'auth:invalid-credentials'
          ? t('auth.feedback.invalid')
          : t('auth.feedback.invalid');
        announceTo(feedback, message);
      }
    });
    const registerHint = document.getElementById('login-register-hint');
    if (registerHint) {
      registerHint.hidden = !shouldAllowPublicRegistration();
    }
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    const feedback = document.getElementById('register-feedback');
    const allowRegistration = shouldAllowPublicRegistration();
    if (!allowRegistration) {
      const owner = currentUser();
      if (owner && owner.role === 'owner') {
        window.location.replace(USER_PANEL_URL.href);
      } else {
        window.location.replace(LOGIN_URL.href);
      }
      return;
    }
    const roleField = registerForm.querySelector('#register-role');
    if (roleField) {
      roleField.value = 'owner';
      roleField.disabled = false;
    }
    registerForm.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(registerForm);
      try {
        const name = String(data.get('name') || '').trim();
        const email = String(data.get('email') || '').trim();
        const password = String(data.get('password') || '');
        if (!name || !email || !password) {
          announceTo(feedback, t('auth.feedback.required'));
          return;
        }
        const user = register({
          name,
          email,
          password,
          role: 'owner'
        });
        announceTo(feedback, t('auth.feedback.registered'));
        updateUserDisplay(user);
        registerForm.reset();
        if (roleField) {
          roleField.value = 'owner';
        }
        window.setTimeout(() => {
          window.location.replace(USER_PANEL_URL.href);
        }, 300);
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
      if (feedback) {
        announceTo(feedback, t('actions.logout'));
      }
      performLogout();
    });
  }

  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    const feedback = document.getElementById('profile-form-feedback');
    profileForm.addEventListener('submit', event => {
      event.preventDefault();
      const user = currentUser();
      if (!user) {
        announceTo(feedback, t('auth.feedback.userNotFound'));
        return;
      }
      const data = new FormData(profileForm);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const role = String(data.get('role') || '');
      if (!name || !email || !role) {
        announceTo(feedback, t('auth.feedback.required'));
        return;
      }
      try {
        const updated = updateUserProfile(user.id, { name, email, role });
        announceTo(feedback, t('auth.feedback.profileUpdated', { name: updated.name }));
        scheduleFeedbackClear(feedback);
      } catch (error) {
        if (error.message === 'auth:user-exists') {
          announceTo(feedback, t('auth.feedback.exists'));
        } else if (error.message === 'auth:user-not-found') {
          announceTo(feedback, t('auth.feedback.userNotFound'));
        } else {
          announceTo(feedback, t('auth.feedback.generic'));
        }
      }
    });
    profileForm.addEventListener('reset', event => {
      setTimeout(() => updateProfileView(currentUser()), 0);
      const delay = event.isTrusted ? 0 : FEEDBACK_CLEAR_DELAY;
      scheduleFeedbackClear(feedback, delay);
    });
  }

  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    const feedback = document.getElementById('password-form-feedback');
    passwordForm.addEventListener('submit', event => {
      event.preventDefault();
      const user = currentUser();
      if (!user) {
        announceTo(feedback, t('auth.feedback.userNotFound'));
        return;
      }
      const data = new FormData(passwordForm);
      const currentPassword = String(data.get('currentPassword') || '');
      const newPassword = String(data.get('newPassword') || '');
      const confirmPassword = String(data.get('confirmPassword') || '');
      if (!currentPassword || !newPassword || !confirmPassword) {
        announceTo(feedback, t('auth.feedback.required'));
        return;
      }
      if (newPassword !== confirmPassword) {
        announceTo(feedback, t('auth.feedback.passwordMismatch'));
        return;
      }
      try {
        changePassword(user.id, { currentPassword, newPassword });
        passwordForm.reset();
        announceTo(feedback, t('auth.feedback.passwordChanged'));
        scheduleFeedbackClear(feedback);
      } catch (error) {
        if (error.message === 'auth:invalid-password') {
          announceTo(feedback, t('auth.feedback.invalidCurrentPassword'));
        } else if (error.message === 'auth:user-not-found') {
          announceTo(feedback, t('auth.feedback.userNotFound'));
        } else {
          announceTo(feedback, t('auth.feedback.generic'));
        }
      }
    });
    passwordForm.addEventListener('reset', event => {
      const delay = event.isTrusted ? 0 : FEEDBACK_CLEAR_DELAY;
      scheduleFeedbackClear(feedback, delay);
    });
  }

  const deleteButton = document.getElementById('delete-account');
  if (deleteButton) {
    const feedback = document.getElementById('profile-feedback');
    deleteButton.addEventListener('click', () => {
      const user = currentUser();
      if (!user) {
        announceTo(feedback, t('auth.feedback.userNotFound'));
        return;
      }
      const confirmation = window.confirm(t('auth.profile.deleteConfirm', { name: user.name }));
      if (!confirmation) return;
      try {
        deleteUser(user.id);
        announceTo(feedback, t('auth.feedback.userDeleted'));
        window.setTimeout(() => {
          window.location.href = LOGIN_URL.href;
        }, 300);
      } catch (error) {
        if (error.message === 'auth:user-not-found') {
          announceTo(feedback, t('auth.feedback.userNotFound'));
        } else {
          announceTo(feedback, t('auth.feedback.generic'));
        }
      }
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
  const profileForm = document.getElementById('profile-form');
  const passwordForm = document.getElementById('password-form');
  const logoutButton = document.getElementById('profile-logout');
  const deleteButton = document.getElementById('delete-account');
  const profileFeedback = document.getElementById('profile-form-feedback');
  const passwordFeedback = document.getElementById('password-form-feedback');

  if (profileForm) {
    const nameField = profileForm.querySelector('#profile-name');
    const emailField = profileForm.querySelector('#profile-email');
    const roleField = profileForm.querySelector('#profile-role');
    const profileButtons = profileForm.querySelectorAll('button');
    const enabled = Boolean(user);
    if (nameField) {
      nameField.disabled = !enabled;
      nameField.value = enabled ? user.name : '';
      nameField.defaultValue = enabled ? user.name : '';
    }
    if (emailField) {
      emailField.disabled = !enabled;
      emailField.value = enabled ? user.email : '';
      emailField.defaultValue = enabled ? user.email : '';
    }
    if (roleField) {
      roleField.disabled = !enabled;
      roleField.value = enabled ? user.role : '';
      roleField.defaultValue = enabled ? user.role : '';
    }
    profileButtons.forEach(button => {
      button.disabled = !enabled;
    });
    if (!enabled && profileFeedback) {
      announceTo(profileFeedback, '');
    }
  }

  if (passwordForm) {
    const passwordFields = passwordForm.querySelectorAll('input, button');
    const enabled = Boolean(user);
    passwordFields.forEach(field => {
      field.disabled = !enabled;
    });
    if (!enabled) {
      passwordForm.reset();
      if (passwordFeedback) {
        announceTo(passwordFeedback, '');
      }
    }
  }

  if (logoutButton) {
    logoutButton.disabled = !user;
  }

  if (deleteButton) {
    deleteButton.disabled = !user;
  }

  if (!user && !isRedirectingHome) {
    const generalFeedback = document.getElementById('profile-feedback');
    if (generalFeedback) {
      announceTo(generalFeedback, '');
    }
  }

  refreshUserManagement();
}

function announce(message) {
  const feedback = document.querySelector('.feedback');
  announceTo(feedback, message);
}

function setupUserManagement() {
  const section = document.getElementById('user-management');
  if (!section) return;
  const list = document.getElementById('user-management-list');
  const createButton = document.getElementById('user-management-create');
  const form = document.getElementById('user-management-form');
  const feedback = document.getElementById('user-management-feedback');
  const title = document.getElementById('user-management-form-title');
  const submitButton = document.getElementById('user-management-submit');
  const cancelButton = document.getElementById('user-management-cancel');
  const nameField = document.getElementById('manage-name');
  const emailField = document.getElementById('manage-email');
  const passwordField = document.getElementById('manage-password');
  const roleField = document.getElementById('manage-role');
  if (!list || !createButton || !form || !feedback || !title || !submitButton || !cancelButton || !nameField || !emailField || !passwordField || !roleField) {
    return;
  }
  userManagementControls = {
    section,
    list,
    createButton,
    form,
    feedback,
    title,
    submitButton,
    cancelButton,
    nameField,
    emailField,
    passwordField,
    roleField
  };
  createButton.addEventListener('click', () => openUserManagementForm('create'));
  cancelButton.addEventListener('click', event => {
    event.preventDefault();
    announceTo(feedback, '');
    closeUserManagementForm();
  });
  form.addEventListener('submit', handleUserManagementSubmit);
  refreshUserManagement();
}

function refreshUserManagement() {
  if (!userManagementControls) return;
  const owner = currentUser();
  if (!owner || owner.role !== 'owner') {
    userManagementControls.section.hidden = true;
    announceTo(userManagementControls.feedback, '');
    closeUserManagementForm();
    return;
  }
  userManagementControls.section.hidden = false;
  renderUserManagementTable();
}

function renderUserManagementTable() {
  if (!userManagementControls) return;
  const { list } = userManagementControls;
  const users = listUsers();
  list.innerHTML = '';
  if (!users || users.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = t('auth.profile.userEmpty');
    row.appendChild(cell);
    list.appendChild(row);
    return;
  }
  users.forEach(user => {
    const row = document.createElement('tr');
    row.dataset.userId = user.id;
    const nameCell = document.createElement('td');
    nameCell.textContent = user.name || '—';
    row.appendChild(nameCell);
    const emailCell = document.createElement('td');
    emailCell.textContent = user.email;
    row.appendChild(emailCell);
    const roleCell = document.createElement('td');
    roleCell.textContent = user.role === 'owner' ? t('auth.form.owner') : t('auth.form.member');
    row.appendChild(roleCell);
    const createdCell = document.createElement('td');
    createdCell.textContent = formatUserDate(user.createdAt);
    row.appendChild(createdCell);
    const actionsCell = document.createElement('td');
    actionsCell.className = 'user-management-actions';
    actionsCell.appendChild(createUserManagementActionButton('edit', t('auth.profile.userEdit'), () => {
      openUserManagementForm('edit', user);
    }));
    actionsCell.appendChild(createUserManagementActionButton('duplicate', t('auth.profile.userDuplicate'), () => {
      openUserManagementForm('duplicate', user);
    }));
    actionsCell.appendChild(createUserManagementActionButton('delete', t('auth.profile.userDelete'), () => {
      handleUserDelete(user);
    }));
    row.appendChild(actionsCell);
    list.appendChild(row);
  });
}

function createUserManagementActionButton(action, label, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ghost';
  button.dataset.action = action;
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function openUserManagementForm(mode, user) {
  if (!userManagementControls) return;
  userManagementState.mode = mode;
  userManagementState.targetId = user?.id || null;
  const {
    form,
    feedback,
    title,
    submitButton,
    nameField,
    emailField,
    passwordField,
    roleField
  } = userManagementControls;
  const titleKey = mode === 'edit'
    ? 'auth.profile.userForm.title.edit'
    : mode === 'duplicate'
      ? 'auth.profile.userForm.title.duplicate'
      : 'auth.profile.userForm.title.create';
  const submitKey = mode === 'edit'
    ? 'auth.profile.userForm.submit.edit'
    : mode === 'duplicate'
      ? 'auth.profile.userForm.submit.duplicate'
      : 'auth.profile.userForm.submit.create';
  title.textContent = t(titleKey);
  submitButton.textContent = t(submitKey);
  nameField.value = user?.name || '';
  emailField.value = mode === 'duplicate' ? '' : user?.email || '';
  emailField.placeholder = mode === 'duplicate' ? t('auth.profile.userForm.emailPlaceholderDuplicate', { email: user?.email || '' }) : '';
  passwordField.value = '';
  roleField.value = user?.role || 'member';
  passwordField.required = mode !== 'edit';
  passwordField.placeholder = mode === 'edit'
    ? t('auth.profile.userForm.passwordOptional')
    : '';
  announceTo(feedback, '');
  form.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  nameField.focus();
}

function closeUserManagementForm() {
  if (!userManagementControls) return;
  const {
    form,
    nameField,
    emailField,
    passwordField,
    roleField
  } = userManagementControls;
  form.hidden = true;
  nameField.value = '';
  emailField.value = '';
  emailField.placeholder = '';
  passwordField.value = '';
  passwordField.placeholder = '';
  passwordField.required = true;
  roleField.value = 'member';
  userManagementState.mode = null;
  userManagementState.targetId = null;
}

function handleUserManagementSubmit(event) {
  event.preventDefault();
  if (!userManagementControls) return;
  const { feedback, nameField, emailField, passwordField, roleField } = userManagementControls;
  const mode = userManagementState.mode || 'create';
  const name = nameField.value.trim();
  const email = emailField.value.trim();
  const role = roleField.value || 'member';
  const password = passwordField.value;
  if (!name || !email || (mode !== 'edit' && !password)) {
    announceTo(feedback, t('auth.feedback.required'));
    return;
  }
  try {
    if (mode === 'edit') {
      const targetId = userManagementState.targetId;
      if (!targetId) {
        announceTo(feedback, t('auth.feedback.userNotFound'));
        return;
      }
      const updated = updateUserProfile(targetId, { name, email, role });
      if (password) {
        setUserPassword(targetId, password);
      }
      announceTo(feedback, t('auth.profile.userUpdated', { name: updated.name }));
    } else {
      register({ name, email, password, role }, { autoLogin: false });
      const key = mode === 'duplicate'
        ? 'auth.profile.userDuplicated'
        : 'auth.profile.userCreated';
      announceTo(feedback, t(key, { name }));
    }
    scheduleFeedbackClear(feedback);
    closeUserManagementForm();
    renderUserManagementTable();
  } catch (error) {
    if (error.message === 'auth:user-exists') {
      announceTo(feedback, t('auth.feedback.exists'));
    } else if (error.message === 'auth:user-not-found') {
      announceTo(feedback, t('auth.feedback.userNotFound'));
    } else if (error.message === 'auth:missing-password') {
      announceTo(feedback, t('auth.feedback.required'));
    } else {
      announceTo(feedback, t('auth.feedback.generic'));
    }
  }
}

function handleUserDelete(user) {
  if (!userManagementControls) return;
  const { feedback } = userManagementControls;
  const confirmation = window.confirm(t('auth.profile.userDeleteConfirm', { name: user.name }));
  if (!confirmation) return;
  try {
    deleteUser(user.id);
    announceTo(feedback, t('auth.profile.userDeleted', { name: user.name }));
    scheduleFeedbackClear(feedback);
    renderUserManagementTable();
  } catch (error) {
    if (error.message === 'auth:user-not-found') {
      announceTo(feedback, t('auth.feedback.userNotFound'));
    } else {
      announceTo(feedback, t('auth.feedback.generic'));
    }
  }
}

function shouldAllowPublicRegistration() {
  return listUsers().length === 0;
}

function updateRegistrationAccess() {
  const allowRegistration = shouldAllowPublicRegistration();
  document.querySelectorAll('[data-register-guard]').forEach(node => {
    node.hidden = !allowRegistration;
  });
}

function formatUserDate(timestamp) {
  if (!timestamp) return '—';
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat(getLang() || document.documentElement.lang || 'pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  } catch (error) {
    return '—';
  }
}

function createPreferenceStorage(getStorage) {
  const resolveStorage = () => {
    if (typeof getStorage === 'function') {
      try {
        return getStorage() || null;
      } catch (error) {
        console.warn('shell: preference storage unavailable', error);
        return null;
      }
    }
    return getStorage || null;
  };
  return {
    get(key) {
      const storage = resolveStorage();
      if (!storage || typeof storage.getItem !== 'function') {
        return null;
      }
      return storage.getItem(key);
    },
    set(key, value) {
      const storage = resolveStorage();
      if (!storage || typeof storage.setItem !== 'function') {
        return;
      }
      storage.setItem(key, value);
    },
    remove(key) {
      const storage = resolveStorage();
      if (!storage || typeof storage.removeItem !== 'function') {
        return;
      }
      storage.removeItem(key);
    }
  };
}

function scheduleFeedbackClear(element, delay = FEEDBACK_CLEAR_DELAY) {
  if (!element) return;
  const existingTimeout = feedbackTimers.get(element);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }
  const timeout = setTimeout(() => {
    feedbackTimers.delete(element);
    announceTo(element, '');
  }, delay);
  feedbackTimers.set(element, timeout);
}

function announceTo(element, message) {
  if (!element) return;
  element.textContent = message;
}

function highlightElement(element) {
  if (!element) return;
  element.classList.add('is-highlighted');
  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const existingTimeout = highlightTimers.get(element);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }
  const timeout = window.setTimeout(() => {
    element.classList.remove('is-highlighted');
    highlightTimers.delete(element);
  }, PANEL_HIGHLIGHT_DURATION);
  highlightTimers.set(element, timeout);
}
