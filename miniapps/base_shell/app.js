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
import { EMBEDDED_DICTIONARIES } from './i18n/embedded.js';
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
  setUserPassword,
  resetAuth,
  transferOwnership
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

const LANG_ICON_SOURCE_MAP = {
  'pt-BR': new URL('./assets/flags/pt-BR.svg', import.meta.url).href,
  'en-US': new URL('./assets/flags/en-US.svg', import.meta.url).href,
  'es-419': new URL('./assets/flags/es-419.svg', import.meta.url).href
};

const FOOTER_COMPLIANCE = {
  companyName: '5Horas Tecnologia Ltda.',
  companyDocument: 'CNPJ 48.321.654/0001-10',
  companyAddress: 'Av. Paulista, 1000 - São Paulo, Brasil',
  supportEmail: 'suporte@5horas.com.br',
  dpoEmail: 'privacidade@5horas.com.br',
  supportHours: 'Seg–Sex, das 9h às 18h (BRT)',
  appStoreUrl: 'https://5horas.com.br/app-store',
  googlePlayUrl: 'https://5horas.com.br/google-play'
};

const I18N_STORAGE_KEY = 'miniapp.base.lang';

const NORMALIZED_LANG_RESOURCE_MAP = new Map();
const PRIMARY_LANG_RESOURCE_MAP = new Map();

for (const resource of LANG_RESOURCES) {
  const normalized = normalizeLangVariant(resource.lang);
  NORMALIZED_LANG_RESOURCE_MAP.set(normalized, resource.lang);
  const primary = normalized.split('-')[0];
  if (!PRIMARY_LANG_RESOURCE_MAP.has(primary)) {
    PRIMARY_LANG_RESOURCE_MAP.set(primary, resource.lang);
  }
}

function normalizeLangVariant(value) {
  if (!value) return '';
  return String(value).replace(/_/g, '-').replace(/\s+/g, '').toLowerCase();
}

function resolveSupportedLang(candidate) {
  const normalized = normalizeLangVariant(candidate);
  if (!normalized) return null;
  if (NORMALIZED_LANG_RESOURCE_MAP.has(normalized)) {
    return NORMALIZED_LANG_RESOURCE_MAP.get(normalized);
  }
  const primary = normalized.split('-')[0];
  if (PRIMARY_LANG_RESOURCE_MAP.has(primary)) {
    return PRIMARY_LANG_RESOURCE_MAP.get(primary);
  }
  return null;
}

function getEmbeddedDictionary(lang) {
  if (!lang) return undefined;
  const resolved = resolveSupportedLang(lang) || lang;
  if (resolved && Object.prototype.hasOwnProperty.call(EMBEDDED_DICTIONARIES, resolved)) {
    return EMBEDDED_DICTIONARIES[resolved];
  }
  const normalized = normalizeLangVariant(resolved);
  if (normalized && NORMALIZED_LANG_RESOURCE_MAP.has(normalized)) {
    const canonical = NORMALIZED_LANG_RESOURCE_MAP.get(normalized);
    if (canonical && Object.prototype.hasOwnProperty.call(EMBEDDED_DICTIONARIES, canonical)) {
      return EMBEDDED_DICTIONARIES[canonical];
    }
  }
  if (Object.prototype.hasOwnProperty.call(EMBEDDED_DICTIONARIES, lang)) {
    return EMBEDDED_DICTIONARIES[lang];
  }
  return undefined;
}

function detectPreferredLanguage() {
  if (typeof navigator === 'undefined') return null;
  const candidates = [];
  if (Array.isArray(navigator.languages)) {
    candidates.push(...navigator.languages);
  }
  const fallbackProperties = ['language', 'userLanguage', 'browserLanguage', 'systemLanguage'];
  for (const property of fallbackProperties) {
    const value = navigator[property];
    if (value) {
      candidates.push(value);
    }
  }
  const seen = new Set();
  for (const candidate of candidates) {
    const normalized = normalizeLangVariant(candidate);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const supported = resolveSupportedLang(candidate);
    if (supported) {
      return supported;
    }
  }
  return null;
}

function readStoredLanguagePreference() {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    return storage ? storage.getItem(I18N_STORAGE_KEY) : null;
  } catch (error) {
    console.warn('app: unable to read stored language preference', error);
    return null;
  }
}

function isFramedWindow() {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.self !== window.top;
  } catch (error) {
    return true;
  }
}

const SYSTEM_DASHBOARD_MINI_APP_ID = 'base.shell.panel.system';
const SYSTEM_DASHBOARD_MINI_APP = {
  id: SYSTEM_DASHBOARD_MINI_APP_ID,
  labelKey: 'miniapps.systemDashboard.label',
  welcomeTitleKey: 'miniapps.systemDashboard.title',
  welcomeMessageKey: 'miniapps.systemDashboard.message',
  icon: '🖥️',
  route: './sys/system-panel.html'
};

const USER_DASHBOARD_MINI_APP_ID = 'base.shell.panel.user';
const USER_DASHBOARD_MINI_APP = {
  id: USER_DASHBOARD_MINI_APP_ID,
  labelKey: 'miniapps.userDashboard.label',
  welcomeTitleKey: 'miniapps.userDashboard.title',
  welcomeMessageKey: 'miniapps.userDashboard.message',
  icon: '👤',
  route: './sys/user-panel.html'
};

const MINI_APP_CATALOG = [
  { ...SYSTEM_DASHBOARD_MINI_APP, order: 10 },
  { ...USER_DASHBOARD_MINI_APP, order: 20 }
];

const MINI_APP_CATALOG_MAP = new Map(MINI_APP_CATALOG.map(item => [item.id, item]));

const NAVIGATION_ITEMS = [
  { id: 'nav-home', labelKey: 'nav.dashboard', icon: '🏠', action: 'home' },
  {
    id: 'nav-system-panel',
    labelKey: 'settings.systemPanel',
    icon: '🖥️',
    action: 'system-panel'
  },
  {
    id: 'nav-user-panel',
    labelKey: 'settings.userPanel',
    icon: '👤',
    action: 'user-panel'
  },
  { id: 'nav-activity', labelKey: 'nav.activity', icon: '🗂', action: 'placeholder' },
  { id: 'nav-analytics', labelKey: 'nav.analytics', icon: '📊', action: 'placeholder' }
];

const DEFAULT_MINI_APP_CONTENT = {
  titleKey: 'panel.welcomeTitle',
  messageKey: 'panel.welcomeMessage'
};

const ADMIN_ACCESS_CODE = 'adm0000';
const ADMIN_SATISFACTION_SCORE = 94;
const ADMIN_SATISFACTION_DELTA = 4;
const ADMIN_UPTIME_PERCENT = 99.97;

const SHELL_APP_ID = 'base.shell';

const USER_PANEL_EMBED_ROUTE = './auth/profile.html?embed=panel';
const USER_PANEL_STANDALONE_ROUTE = './auth/profile.html';
const USER_PANEL_URL = new URL(USER_PANEL_STANDALONE_ROUTE, import.meta.url);
const SHELL_HOME_URL = new URL('./index.html', import.meta.url);
const USER_PANEL_MINI_APP_ID = 'base.shell.user-panel';
const USER_PANEL_MINI_APP = {
  id: USER_PANEL_MINI_APP_ID,
  labelKey: 'auth.profile.panelTitle',
  welcomeTitleKey: 'auth.profile.panelTitle',
  welcomeMessageKey: 'auth.profile.panelMessage',
  icon: '👤',
  route: USER_PANEL_EMBED_ROUTE,
  hidden: true
};
const LOGIN_PANEL_EMBED_ROUTE = './auth/login.html?embed=panel';
const LOGIN_PANEL_MINI_APP_ID = 'base.shell.login';
const LOGIN_PANEL_MINI_APP = {
  id: LOGIN_PANEL_MINI_APP_ID,
  labelKey: 'auth.login.panelTitle',
  welcomeTitleKey: 'auth.login.panelTitle',
  welcomeMessageKey: 'auth.login.panelMessage',
  icon: '🔐',
  route: LOGIN_PANEL_EMBED_ROUTE,
  hidden: true
};
const REGISTER_PANEL_EMBED_ROUTE = './auth/register.html?embed=panel';
const REGISTER_PANEL_MINI_APP_ID = 'base.shell.register';
const REGISTER_PANEL_MINI_APP = {
  id: REGISTER_PANEL_MINI_APP_ID,
  labelKey: 'auth.register.panelTitle',
  welcomeTitleKey: 'auth.register.panelTitle',
  welcomeMessageKey: 'auth.register.panelMessage',
  icon: '📝',
  route: REGISTER_PANEL_EMBED_ROUTE,
  hidden: true
};
const LOGIN_URL = new URL('./auth/login.html', import.meta.url);
const REGISTER_URL = new URL('./auth/register.html', import.meta.url);
const HOME_REDIRECT_DELAY = 500;
const SHELL_NAVIGATION_MESSAGE_TYPE = 'miniapp.shell.navigate';
const SHELL_NAVIGATION_ACTIONS = Object.freeze({
  OPEN_HOME: 'open-home'
});

const DEFERRED_FEEDBACK_KEY = 'miniapp.base.deferredFeedback';

const FEEDBACK_CLEAR_DELAY = 3000;
const PANEL_HIGHLIGHT_DURATION = 1600;
const feedbackTimers = new WeakMap();
const highlightTimers = new WeakMap();

const PASSWORD_STRENGTH_LEVELS = Object.freeze({
  WEAK: 'weak',
  MEDIUM: 'medium',
  STRONG: 'strong'
});

const PASSWORD_STRENGTH_PROGRESS = {
  [PASSWORD_STRENGTH_LEVELS.WEAK]: 33,
  [PASSWORD_STRENGTH_LEVELS.MEDIUM]: 66,
  [PASSWORD_STRENGTH_LEVELS.STRONG]: 100
};

function storeDeferredFeedback(message) {
  if (typeof window === 'undefined') return;
  try {
    const storage = window.sessionStorage;
    if (!storage) return;
    if (!message) {
      storage.removeItem(DEFERRED_FEEDBACK_KEY);
    } else {
      storage.setItem(DEFERRED_FEEDBACK_KEY, message);
    }
  } catch (error) {
    console.warn('app: unable to persist deferred feedback', error);
  }
}

function consumeDeferredFeedback() {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.sessionStorage;
    if (!storage) return null;
    const message = storage.getItem(DEFERRED_FEEDBACK_KEY);
    if (message) {
      storage.removeItem(DEFERRED_FEEDBACK_KEY);
      return message;
    }
  } catch (error) {
    console.warn('app: unable to consume deferred feedback', error);
  }
  return null;
}

let revisionInfo = null;
let activeMenu = null;
let languageDialogControls = null;
let isRedirectingHome = false;
let userManagementControls = null;

function renderLanguageIcon(target, lang) {
  if (!target) return;
  const source = LANG_ICON_SOURCE_MAP[lang];
  if (!source) {
    const existingImage = target.querySelector('img[data-lang-flag]');
    if (existingImage) {
      existingImage.remove();
    }
    target.textContent = '🌐';
    return;
  }
  let image = target.querySelector('img[data-lang-flag]');
  if (!image) {
    target.textContent = '';
    image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'lazy';
    image.draggable = false;
    image.setAttribute('aria-hidden', 'true');
    image.dataset.langFlag = 'true';
    target.append(image);
  }
  image.src = source;
}

let navigationOverlayControls = null;
let miniAppMenuControls = null;
let homeNavigationControls = null;
const userMenuElements = {
  menu: null,
  panel: null,
  skipClose: false
};

let adminGatewayControls = null;
let adminDashboardControls = null;

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

export function evaluatePasswordStrength(password) {
  const value = String(password || '');
  const length = value.length;
  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);

  let score = 0;
  if (length >= 12) {
    score += 2;
  } else if (length >= 8) {
    score += 1;
  } else if (length >= 6) {
    score += 1;
  }
  if (hasLower && hasUpper) score += 1;
  if (hasNumber) score += 1;
  if (hasSymbol) score += 1;

  let level = PASSWORD_STRENGTH_LEVELS.WEAK;
  if (score >= 4) {
    level = PASSWORD_STRENGTH_LEVELS.STRONG;
  } else if (score >= 2) {
    level = PASSWORD_STRENGTH_LEVELS.MEDIUM;
  }

  return {
    level,
    score
  };
}

async function bootstrap() {
  initTheme(getTheme().mode);
  await loadDictionaries();
  const storedLanguage = readStoredLanguagePreference();
  let initialLanguageCandidate = storedLanguage;
  if (!initialLanguageCandidate) {
    const detectedLanguage = detectPreferredLanguage();
    if (detectedLanguage && detectedLanguage !== 'en-US') {
      initialLanguageCandidate = detectedLanguage;
    }
  }
  const initialLang = initI18n(initialLanguageCandidate || 'pt-BR');
  document.documentElement.lang = initialLang;
  revisionInfo = await loadRevisionInfo();
  updateRevisionMetadata();
  applyTranslations();
  updateEmbeddedAuthLayout();
  setupFooterToggle();
  setupLanguageToggle();
  updateLanguageToggle();
  setupThemeToggle();
  updateThemeToggle();
  setupAdminDashboard();
  setupAdminGateway();
  setupSystemPanelShortcut();
  setupUserPanelShortcut();
  updateUserPanelShortcut();
  updateUserDisplay(currentUser());
  updateProfileView(currentUser());
  setupNavigationOverlay();
  updateNavigationVisibility(currentUser());
  const miniApps = withShellMiniApps(await loadActiveMiniApps());
  const initialMiniAppId = getInitialMiniAppId(miniApps);
  if (initialMiniAppId) {
    miniAppState.activeId = initialMiniAppId;
  }
  updateNavigationState();
  setupMiniAppMenu(miniApps);
  setupLoginPanelShortcut();
  setupRegisterPanelShortcut();
  updateAdminDashboardMetrics();
  updateAdminDashboardStatus();
  updateAdminDashboardActivity();
  updateAdminDashboardHealth();
  if (initialMiniAppId) {
    updateMiniAppHistory(initialMiniAppId, { replace: true });
  }
  setupUserMenu();
  setupAuthForms();
  setupUserManagement();
  updateRegistrationAccess();
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('popstate', handleHistoryNavigation);
  window.addEventListener('message', handleShellMessage);
  onLanguageChange(lang => {
    document.documentElement.lang = lang;
    updateRevisionMetadata();
    applyTranslations();
    updateEmbeddedAuthLayout();
    updateLanguageToggle();
    renderLanguageOptions();
    updateThemeToggle();
    updateUserPanelShortcut();
    refreshUserMenu();
    renderMiniAppMenu();
    updateMiniAppPanel();
    refreshSidebarNavigationLabels();
    updateAdminDashboardMetrics();
    updateAdminDashboardStatus();
    updateAdminDashboardActivity();
    updateAdminDashboardHealth();
  });
  onThemeChange(() => {
    updateThemeToggle();
    updateAdminDashboardStatus();
  });
  onAuthChange(user => {
    updateUserDisplay(user);
    updateProfileView(user);
    updateUserPanelShortcut();
    refreshUserMenu();
    refreshUserManagement();
    updateRegistrationAccess();
    updateNavigationVisibility(user);
    redirectIfAuthenticationRequired(user);
    updateAdminDashboardMetrics();
    updateAdminDashboardActivity();
    updateAdminDashboardHealth();
  });
  redirectIfAuthenticationRequired(currentUser());
  displayDeferredFeedback();
}

async function loadDictionaries() {
  const results = await Promise.allSettled(
    LANG_RESOURCES.map(async resource => {
      try {
        const dictionary = await readDictionary(resource);
        return { resource, dictionary };
      } catch (error) {
        throw { resource, error };
      }
    })
  );

  const registered = new Set();
  const failures = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { resource, dictionary } = result.value;
      registerDictionary(resource.lang, dictionary);
      registered.add(resource.lang);
    } else {
      const { resource, error } = result.reason;
      const fallback = getEmbeddedDictionary(resource.lang);
      if (fallback) {
        console.warn('i18n: registering embedded dictionary fallback', resource.lang, error);
        registerDictionary(resource.lang, fallback);
        registered.add(resource.lang);
      } else {
        failures.push({ resource, error });
      }
    }
  }

  for (const resource of LANG_RESOURCES) {
    if (!registered.has(resource.lang)) {
      const fallback = getEmbeddedDictionary(resource.lang);
      if (fallback) {
        console.warn('i18n: ensuring embedded dictionary registration', resource.lang);
        registerDictionary(resource.lang, fallback);
        registered.add(resource.lang);
      } else {
        failures.push({ resource, error: new Error(`i18n: missing embedded dictionary for ${resource.lang}`) });
      }
    }
  }

  if (failures.length) {
    throw new AggregateError(
      failures.map(entry => entry.error),
      'i18n: unable to register dictionaries'
    );
  }
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
      const fallbackHidden = fallback?.hidden === true;
      let hidden = fallbackHidden;
      if (entry.hidden === true) {
        hidden = true;
      } else if (entry.hidden === false) {
        hidden = false;
      }
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
        hidden,
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

function withUserPanelMiniApp(items) {
  const list = Array.isArray(items) ? [...items] : [];
  const existingIndex = list.findIndex(item => item && item.id === USER_PANEL_MINI_APP_ID);
  if (existingIndex >= 0) {
    const existing = list[existingIndex] || {};
    const merged = {
      ...USER_PANEL_MINI_APP,
      ...existing
    };
    merged.labelKey = existing.labelKey || USER_PANEL_MINI_APP.labelKey;
    merged.route = existing.route || USER_PANEL_MINI_APP.route;
    merged.icon = existing.icon || USER_PANEL_MINI_APP.icon;
    merged.welcomeTitleKey = existing.welcomeTitleKey || USER_PANEL_MINI_APP.welcomeTitleKey;
    merged.welcomeMessageKey = existing.welcomeMessageKey || USER_PANEL_MINI_APP.welcomeMessageKey;
    if (typeof existing.hidden === 'boolean') {
      merged.hidden = existing.hidden;
    }
    list[existingIndex] = merged;
    return list;
  }
  return [...list, { ...USER_PANEL_MINI_APP }];
}

function withLoginMiniApp(items) {
  const list = Array.isArray(items) ? [...items] : [];
  const existingIndex = list.findIndex(item => item && item.id === LOGIN_PANEL_MINI_APP_ID);
  if (existingIndex >= 0) {
    const existing = list[existingIndex] || {};
    const merged = {
      ...LOGIN_PANEL_MINI_APP,
      ...existing
    };
    merged.labelKey = existing.labelKey || LOGIN_PANEL_MINI_APP.labelKey;
    merged.route = existing.route || LOGIN_PANEL_MINI_APP.route;
    merged.icon = existing.icon || LOGIN_PANEL_MINI_APP.icon;
    merged.welcomeTitleKey = existing.welcomeTitleKey || LOGIN_PANEL_MINI_APP.welcomeTitleKey;
    merged.welcomeMessageKey = existing.welcomeMessageKey || LOGIN_PANEL_MINI_APP.welcomeMessageKey;
    if (typeof existing.hidden === 'boolean') {
      merged.hidden = existing.hidden;
    }
    list[existingIndex] = merged;
    return list;
  }
  return [...list, { ...LOGIN_PANEL_MINI_APP }];
}

function withRegisterMiniApp(items) {
  const list = Array.isArray(items) ? [...items] : [];
  const existingIndex = list.findIndex(item => item && item.id === REGISTER_PANEL_MINI_APP_ID);
  const allowRegistration = shouldAllowPublicRegistration();
  if (!allowRegistration) {
    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
    }
    return list;
  }
  if (existingIndex >= 0) {
    const existing = list[existingIndex] || {};
    const merged = {
      ...REGISTER_PANEL_MINI_APP,
      ...existing
    };
    merged.labelKey = existing.labelKey || REGISTER_PANEL_MINI_APP.labelKey;
    merged.route = existing.route || REGISTER_PANEL_MINI_APP.route;
    merged.icon = existing.icon || REGISTER_PANEL_MINI_APP.icon;
    merged.welcomeTitleKey = existing.welcomeTitleKey || REGISTER_PANEL_MINI_APP.welcomeTitleKey;
    merged.welcomeMessageKey = existing.welcomeMessageKey || REGISTER_PANEL_MINI_APP.welcomeMessageKey;
    if (typeof existing.hidden === 'boolean') {
      merged.hidden = existing.hidden;
    }
    list[existingIndex] = merged;
    return list;
  }
  return [...list, { ...REGISTER_PANEL_MINI_APP }];
}

function withShellMiniApps(items) {
  return withRegisterMiniApp(withLoginMiniApp(withUserPanelMiniApp(items)));
}

function refreshShellMiniApps(allowRegistrationOverride) {
  const allowRegistration =
    typeof allowRegistrationOverride === 'boolean'
      ? allowRegistrationOverride
      : shouldAllowPublicRegistration();
  const wasRegisterActive = miniAppState.activeId === REGISTER_PANEL_MINI_APP_ID;
  miniAppState.items = withShellMiniApps(miniAppState.items);
  if (!allowRegistration && wasRegisterActive) {
    setActiveMiniApp(null);
    return;
  }
  renderMiniAppMenu();
  updateMiniAppPanel();
  updateNavigationState();
  updateAdminDashboardMetrics();
  updateAdminDashboardStatus();
  updateAdminDashboardActivity();
  updateAdminDashboardHealth();
}

function hasRegisterMiniApp() {
  const items = Array.isArray(miniAppState.items) ? miniAppState.items : [];
  return items.some(item => item?.id === REGISTER_PANEL_MINI_APP_ID);
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
    const reasons = [error];
    if (error instanceof TypeError) {
      const embedded = getEmbeddedDictionary(resource.lang);
      if (embedded) {
        console.warn('i18n: using embedded dictionary due to network failure', resource.lang, error);
        return embedded;
      }
    }
    try {
      const module = await import(/* @vite-ignore */ url.href, { assert: { type: 'json' } });
      return module?.default ?? module;
    } catch (fallbackError) {
      reasons.push(fallbackError);
      const embedded = getEmbeddedDictionary(resource.lang);
      if (embedded) {
        console.warn('i18n: falling back to embedded dictionary', resource.lang, ...reasons);
        return embedded;
      }
      console.error('i18n: unable to load dictionary', resource.lang, ...reasons);
      throw new AggregateError(reasons, `i18n: unable to load dictionary for ${resource.lang}`);
    }
  }
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.dataset.i18n;
    const params = parseI18nParams(node.dataset.i18nParams);
    const message = t(key, params);
    const hasTranslation = typeof message === 'string' && message !== key;

    if (node.tagName === 'TITLE') {
      if (!node.dataset.i18nOriginalText) {
        node.dataset.i18nOriginalText = node.textContent || '';
      }
      const value = hasTranslation ? message : node.dataset.i18nOriginalText;
      node.textContent = value;
      document.title = value;
      return;
    }

    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      if (!node.dataset.i18nOriginalPlaceholder) {
        node.dataset.i18nOriginalPlaceholder = node.getAttribute('placeholder') || '';
      }
      if (hasTranslation) {
        node.placeholder = message;
      } else {
        node.placeholder = node.dataset.i18nOriginalPlaceholder;
      }
      return;
    }

    if (node instanceof HTMLOptionElement) {
      if (!node.dataset.i18nOriginalText) {
        node.dataset.i18nOriginalText = node.textContent || '';
      }
      node.textContent = hasTranslation ? message : node.dataset.i18nOriginalText;
      return;
    }

    if (!node.dataset.i18nOriginalText) {
      node.dataset.i18nOriginalText = node.textContent || '';
    }
    node.textContent = hasTranslation ? message : node.dataset.i18nOriginalText;
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

function updateFooterComplianceMetadata() {
  const year = String(new Date().getFullYear());
  const footer = document.getElementById('app-footer');
  if (!footer) return;

  const footerParams = {
    year,
    company: FOOTER_COMPLIANCE.companyName,
    document: FOOTER_COMPLIANCE.companyDocument,
    address: FOOTER_COMPLIANCE.companyAddress,
    hours: FOOTER_COMPLIANCE.supportHours
  };

  footer.querySelectorAll('[data-footer-copyright]').forEach(node => {
    node.dataset.i18n = 'footer.copyright';
    node.dataset.i18nParams = JSON.stringify({
      year,
      company: FOOTER_COMPLIANCE.companyName
    });
  });

  footer.querySelectorAll('[data-footer-param]').forEach(node => {
    const rawKeys = node.dataset.footerParam;
    if (!rawKeys) return;
    const keys = rawKeys
      .split(',')
      .map(key => key.trim())
      .filter(Boolean);
    if (!keys.length) return;
    const params = parseI18nParams(node.dataset.i18nParams) || {};
    let changed = false;
    keys.forEach(key => {
      if (footerParams[key]) {
        params[key] = footerParams[key];
        changed = true;
      }
    });
    if (changed) {
      node.dataset.i18nParams = JSON.stringify(params);
    }
  });

  footer.querySelectorAll('[data-footer-support-email]').forEach(node => {
    node.textContent = FOOTER_COMPLIANCE.supportEmail;
    node.setAttribute('href', `mailto:${FOOTER_COMPLIANCE.supportEmail}`);
  });

  footer.querySelectorAll('[data-footer-dpo-email]').forEach(node => {
    node.textContent = FOOTER_COMPLIANCE.dpoEmail;
    node.setAttribute('href', `mailto:${FOOTER_COMPLIANCE.dpoEmail}`);
  });

  footer.querySelectorAll('[data-footer-store]').forEach(anchor => {
    const store = anchor.dataset.footerStore;
    if (store === 'app-store') {
      anchor.setAttribute('href', FOOTER_COMPLIANCE.appStoreUrl);
    }
    if (store === 'google-play') {
      anchor.setAttribute('href', FOOTER_COMPLIANCE.googlePlayUrl);
    }
  });
}

function updateRevisionMetadata() {
  updateFooterComplianceMetadata();
  const nodes = document.querySelectorAll('[data-revision]');
  if (!nodes.length) return;
  let appName = t('app.title');
  if (!appName || appName === 'app.title') {
    appName = (revisionInfo && revisionInfo.name) || 'MiniAppBase';
  }
  if (revisionInfo && (revisionInfo.revision || revisionInfo.version)) {
    const revisionLabel = String(revisionInfo.revision || revisionInfo.version || '—');
    const versionLabel = String(revisionInfo.version || revisionInfo.revision || '—');
    nodes.forEach(node => {
      node.dataset.i18n = 'footer.revision';
      node.dataset.i18nParams = JSON.stringify({
        appName,
        revision: revisionLabel,
        version: versionLabel
      });
    });
  } else {
    nodes.forEach(node => {
      node.dataset.i18n = 'footer.revisionFallback';
      node.dataset.i18nParams = JSON.stringify({ appName });
    });
  }
}

function setupNavigationOverlay() {
  const trigger = document.getElementById('btnMiniapps');
  const host = document.getElementById('nav-overlay-root');
  if (!trigger || !host) {
    navigationOverlayControls = null;
    return;
  }
  if (navigationOverlayControls && navigationOverlayControls.overlay && host.contains(navigationOverlayControls.overlay)) {
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'navigation-overlay';
  overlay.id = 'navigation-overlay';
  overlay.hidden = true;
  overlay.dataset.navigationOverlay = 'true';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'navigation-overlay-title');
  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      closeNavigationOverlay({ restoreFocus: false });
    }
  });

  const panel = document.createElement('div');
  panel.className = 'navigation-overlay__panel';
  panel.dataset.navigationPanel = 'true';
  panel.setAttribute('role', 'document');

  const header = document.createElement('header');
  header.className = 'navigation-overlay__header';

  const title = document.createElement('h2');
  title.id = 'navigation-overlay-title';
  title.className = 'navigation-overlay__title';
  title.dataset.i18n = 'nav.overlay.title';
  title.textContent = 'Navigation';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'navigation-overlay__close ghost';
  closeButton.dataset.navigationClose = 'true';
  closeButton.dataset.i18n = 'actions.close';
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', () => closeNavigationOverlay({ restoreFocus: true }));

  header.append(title, closeButton);

  const primarySection = document.createElement('section');
  primarySection.className = 'navigation-overlay__section';

  const primaryList = document.createElement('ul');
  primaryList.className = 'navigation-overlay__list';
  primaryList.dataset.navigationList = 'true';
  primarySection.append(primaryList);

  const miniAppSection = document.createElement('section');
  miniAppSection.className = 'navigation-overlay__section navigation-overlay__section--miniapps';
  miniAppSection.dataset.navigationMiniapps = 'true';

  const miniAppTitle = document.createElement('h3');
  miniAppTitle.className = 'navigation-overlay__subtitle';
  miniAppTitle.dataset.i18n = 'nav.overlay.miniapps';
  miniAppTitle.textContent = 'Mini-apps';

  const miniAppList = document.createElement('ul');
  miniAppList.className = 'navigation-overlay__miniapps';
  miniAppList.dataset.navigationMiniappList = 'true';
  miniAppSection.append(miniAppTitle, miniAppList);

  panel.append(header, primarySection, miniAppSection);
  overlay.append(panel);
  host.append(overlay);

  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', overlay.id);
  trigger.setAttribute('aria-expanded', 'false');

  trigger.addEventListener('click', event => {
    event.preventDefault();
    if (overlay.hidden) {
      openNavigationOverlay();
    } else {
      closeNavigationOverlay({ restoreFocus: true });
    }
  });

  navigationOverlayControls = {
    trigger,
    overlay,
    panel,
    navList: primaryList,
    miniAppSection,
    miniAppList,
    closeButton,
    title,
    miniAppTitle,
    previousFocus: null
  };

  miniAppMenuControls = { list: miniAppList, section: miniAppSection, title: miniAppTitle };

  renderNavigationItems();
  applyTranslations();
  refreshSidebarNavigationLabels();
}

function renderNavigationItems() {
  if (!navigationOverlayControls) return;
  const { navList } = navigationOverlayControls;
  if (!navList) return;
  navList.innerHTML = '';
  const homeButtons = [];
  NAVIGATION_ITEMS.forEach((item, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'navigation-overlay__item';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'navigation-overlay__action';
    button.dataset.navAction = item.action;
    button.dataset.navigationAction = item.action;
    button.dataset.navigationLabel = 'true';
    if (index === 0) {
      button.dataset.navigationFocus = 'true';
    }
    const icon = document.createElement('span');
    icon.className = 'navigation-overlay__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon || '•';
    const label = document.createElement('span');
    label.className = 'navigation-overlay__label';
    label.dataset.i18n = item.labelKey;
    label.dataset.navigationText = 'true';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = item.labelKey;
    const srOnly = document.createElement('span');
    srOnly.className = 'sr-only';
    srOnly.dataset.i18n = item.labelKey;
    srOnly.textContent = item.labelKey;
    button.append(icon, label, srOnly);
    button.addEventListener('click', () => {
      handleNavigationAction(item.action);
    });
    if (item.action === 'home') {
      homeButtons.push(button);
    }
    listItem.appendChild(button);
    navList.appendChild(listItem);
  });
  homeNavigationControls = { homeLinks: homeButtons };
  applyTranslations();
  refreshSidebarNavigationLabels();
  updateNavigationState();
}

function handleNavigationAction(action) {
  if (action === 'home') {
    const wasActive = Boolean(miniAppState.activeId);
    setActiveMiniApp(null);
    closeNavigationOverlay({ restoreFocus: false });
    if (wasActive) {
      focusPanel();
    }
    return;
  }
  if (action === 'system-panel') {
    closeNavigationOverlay({ restoreFocus: false });
    const handled = activateMiniAppShortcut(SYSTEM_DASHBOARD_MINI_APP_ID);
    if (!handled) {
      focusPanel();
    }
    return;
  }
  if (action === 'user-panel') {
    closeNavigationOverlay({ restoreFocus: false });
    const handled = handleUserPanelShortcutClick();
    if (!handled) {
      handleUserAction('profile');
    }
    return;
  }
  closeNavigationOverlay({ restoreFocus: false });
  focusPanel();
}

function openNavigationOverlay() {
  if (!navigationOverlayControls) return;
  const { overlay, trigger } = navigationOverlayControls;
  if (!overlay || !overlay.hidden) return;
  navigationOverlayControls.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  navigationOverlayControls.restoreMenu = activeMenu ? { ...activeMenu } : null;
  if (activeMenu) {
    closeActiveMenu();
  }
  renderNavigationItems();
  renderMiniAppMenu();
  setUserMenuPointerInteractivity(false);
  overlay.hidden = false;
  overlay.classList.add('is-open');
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'true');
  }
  const focusTarget = overlay.querySelector('[data-navigation-focus]') || overlay.querySelector('button');
  if (focusTarget && typeof focusTarget.focus === 'function') {
    window.requestAnimationFrame(() => focusTarget.focus());
  }
}

function closeNavigationOverlay(options = {}) {
  const { restoreFocus = true } = options;
  if (!navigationOverlayControls) return false;
  const { overlay, trigger } = navigationOverlayControls;
  if (!overlay || overlay.hidden) {
    return false;
  }
  overlay.hidden = true;
  overlay.classList.remove('is-open');
  setUserMenuPointerInteractivity(true);
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
  }
  const restoreMenu = navigationOverlayControls.restoreMenu;
  navigationOverlayControls.restoreMenu = null;
  if (restoreMenu && restoreMenu.button && restoreMenu.menu) {
    userMenuElements.skipClose = true;
    openMenu(restoreMenu.button, restoreMenu.menu, () => focusFirstUserMenuItem(restoreMenu.menu));
  }
  const focusTarget = restoreFocus
    ? navigationOverlayControls.previousFocus && typeof navigationOverlayControls.previousFocus.focus === 'function'
      ? navigationOverlayControls.previousFocus
      : trigger
    : null;
  navigationOverlayControls.previousFocus = null;
  if (focusTarget) {
    window.requestAnimationFrame(() => focusTarget.focus());
  }
  return true;
}

function refreshSidebarNavigationLabels() {
  if (!navigationOverlayControls) return;
  const { navList, miniAppList } = navigationOverlayControls;
  const controls = [];
  if (navList) {
    controls.push(...navList.querySelectorAll('[data-navigation-label]'));
  }
  if (miniAppList) {
    controls.push(...miniAppList.querySelectorAll('[data-navigation-label]'));
  }
  controls.forEach(control => {
    const label = getNavigationControlLabel(control);
    if (!label) {
      return;
    }
    control.setAttribute('aria-label', label);
    control.title = label;
  });
}

function getNavigationControlLabel(control) {
  if (!control) return '';
  const textNode = control.querySelector('[data-navigation-text]');
  if (textNode && textNode.textContent) {
    return textNode.textContent.trim();
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

function updateNavigationState() {
  if (!homeNavigationControls || !Array.isArray(homeNavigationControls.homeLinks)) {
    return;
  }
  const isHomeActive = !miniAppState.activeId;
  homeNavigationControls.homeLinks.forEach(link => {
    if (isHomeActive) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('is-active');
    } else {
      link.removeAttribute('aria-current');
      link.classList.remove('is-active');
    }
  });
}

function setupMiniAppMenu(items) {
  miniAppState.items = withShellMiniApps(items);
  renderMiniAppMenu();
  updateMiniAppPanel();
  updateAdminDashboardMetrics();
  updateAdminDashboardStatus();
  updateAdminDashboardActivity();
  updateAdminDashboardHealth();
}

function renderMiniAppMenu() {
  if (!miniAppMenuControls) return;
  const { list, section, title } = miniAppMenuControls;
  if (!list || !section) return;
  const items = Array.isArray(miniAppState.items) ? miniAppState.items : [];
  const visibleItems = items.filter(item => !item?.hidden);
  list.innerHTML = '';
  if (!visibleItems.length) {
    if (title) {
      title.hidden = true;
      title.setAttribute('aria-hidden', 'true');
    }
    list.hidden = true;
    list.setAttribute('aria-hidden', 'true');
    section.hidden = true;
    section.setAttribute('aria-hidden', 'true');
    section.style.display = 'none';
    refreshSidebarNavigationLabels();
    return;
  }
  if (title) {
    title.hidden = false;
    title.removeAttribute('aria-hidden');
  }
  list.hidden = false;
  list.removeAttribute('aria-hidden');
  section.hidden = false;
  section.removeAttribute('aria-hidden');
  section.style.display = '';
  visibleItems.forEach(item => {
    const listItem = document.createElement('li');
    listItem.className = 'navigation-overlay__miniapp-item';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'navigation-overlay__miniapp';
    button.dataset.miniappId = item.id;
    button.dataset.navigationLabel = 'true';
    if (item.id === miniAppState.activeId) {
      button.classList.add('is-active');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.setAttribute('aria-pressed', 'false');
    }
    const icon = document.createElement('span');
    icon.className = 'navigation-overlay__miniapp-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon || '🧩';
    const label = document.createElement('span');
    label.className = 'navigation-overlay__miniapp-label';
    label.dataset.i18n = item.labelKey;
    label.dataset.navigationText = 'true';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = item.labelKey;
    const srOnly = document.createElement('span');
    srOnly.className = 'sr-only';
    srOnly.dataset.i18n = item.labelKey;
    srOnly.textContent = item.labelKey;
    button.append(icon, label, srOnly);
    button.addEventListener('click', () => {
      setActiveMiniApp(item.id);
      closeNavigationOverlay({ restoreFocus: false });
      focusPanel();
    });
    listItem.appendChild(button);
    list.appendChild(listItem);
  });
  applyTranslations();
  refreshSidebarNavigationLabels();
  updateNavigationState();
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
  updateAdminDashboardActivity();
}

function getMiniAppDefinition(id) {
  if (!id) return null;
  const items = Array.isArray(miniAppState.items) ? miniAppState.items : [];
  const existing = items.find(item => item && item.id === id);
  if (existing) {
    return existing;
  }
  if (MINI_APP_CATALOG_MAP.has(id)) {
    return MINI_APP_CATALOG_MAP.get(id);
  }
  return null;
}

function ensureMiniAppEntry(id) {
  if (!id) return null;
  const items = Array.isArray(miniAppState.items) ? miniAppState.items : [];
  if (items.some(item => item && item.id === id)) {
    return items.find(item => item && item.id === id) || null;
  }
  const fallback = MINI_APP_CATALOG_MAP.get(id);
  if (!fallback) {
    return null;
  }
  const nextItems = [...items, { ...fallback }];
  miniAppState.items = withShellMiniApps(nextItems);
  const updatedItems = Array.isArray(miniAppState.items) ? miniAppState.items : [];
  return updatedItems.find(item => item && item.id === id) || { ...fallback };
}

function activateMiniAppShortcut(id, options = {}) {
  if (!id) return false;
  const controls = getStageHost();
  if (!controls || !controls.host) {
    const definition = getMiniAppDefinition(id);
    if (definition) {
      const url = resolveMiniAppStageUrl(definition);
      if (url) {
        window.location.href = url;
        return true;
      }
    }
    return false;
  }
  const definition = ensureMiniAppEntry(id);
  if (!definition) {
    return false;
  }
  const historyOptions = options.skipHistory ? { skipHistory: true } : {};
  setActiveMiniApp(id, historyOptions);
  if (options.focus !== false) {
    focusPanel();
  }
  return true;
}

function activateUserPanelMiniApp(options = {}) {
  const controls = getStageHost();
  if (!controls || !controls.host) {
    return false;
  }
  miniAppState.items = withShellMiniApps(miniAppState.items);
  const historyOptions = options.skipHistory ? { skipHistory: true } : {};
  setActiveMiniApp(USER_PANEL_MINI_APP_ID, historyOptions);
  if (options.focus !== false) {
    focusPanel();
  }
  return true;
}

function closeMiniAppMenu() {
  closeNavigationOverlay({ restoreFocus: false });
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
  const panelRoot = document.getElementById('panel');
  const isRegisterActive = Boolean(active && active.id === REGISTER_PANEL_MINI_APP_ID);
  if (panelRoot) {
    if (isRegisterActive) {
      panelRoot.dataset.panelMode = 'register';
    } else {
      delete panelRoot.dataset.panelMode;
    }
  }
  if (titleNode) {
    titleNode.dataset.i18n = titleKey;
    delete titleNode.dataset.i18nParams;
    const titleLabel = t(titleKey);
    titleNode.textContent = titleLabel === titleKey ? t(DEFAULT_MINI_APP_CONTENT.titleKey) : titleLabel;
  }
  if (messageNode) {
    if (!messageNode.dataset.panelOriginalI18n) {
      messageNode.dataset.panelOriginalI18n = messageNode.dataset.i18n || DEFAULT_MINI_APP_CONTENT.messageKey;
    }
    if (isRegisterActive) {
      if (messageNode.dataset.i18n) {
        messageNode.dataset.panelActiveI18n = messageNode.dataset.i18n;
      }
      delete messageNode.dataset.i18n;
      delete messageNode.dataset.i18nParams;
      messageNode.hidden = true;
      messageNode.setAttribute('aria-hidden', 'true');
      messageNode.textContent = '';
    } else {
      const nextKey = messageKey || messageNode.dataset.panelActiveI18n || messageNode.dataset.panelOriginalI18n;
      messageNode.dataset.i18n = nextKey;
      delete messageNode.dataset.panelActiveI18n;
      delete messageNode.dataset.i18nParams;
      messageNode.hidden = false;
      messageNode.removeAttribute('aria-hidden');
      const messageLabel = t(nextKey);
      messageNode.textContent = messageLabel === nextKey ? t(DEFAULT_MINI_APP_CONTENT.messageKey) : messageLabel;
    }
  }
  applyTranslations();
  renderMiniAppStage(active ? active.id : null);
}

function updateEmbeddedAuthLayout() {
  const titleNode = document.getElementById('page-title');
  if (!titleNode) return;
  const registerForm = document.getElementById('register-form');
  if (!titleNode.dataset.panelOriginalI18n) {
    titleNode.dataset.panelOriginalI18n = titleNode.dataset.i18n || '';
  }
  if (!registerForm) {
    const originalKey = titleNode.dataset.panelOriginalI18n || titleNode.dataset.i18n;
    if (originalKey) {
      titleNode.dataset.i18n = originalKey;
      const originalLabel = t(originalKey);
      if (originalLabel && originalLabel !== originalKey) {
        titleNode.textContent = originalLabel;
      }
    }
    return;
  }
  const isPanelEmbed = document.documentElement.dataset.embedMode === 'panel';
  const nextKey = isPanelEmbed ? 'auth.register.panelTitle' : titleNode.dataset.panelOriginalI18n || 'auth.register.title';
  titleNode.dataset.i18n = nextKey;
  delete titleNode.dataset.i18nParams;
  const nextLabel = t(nextKey);
  if (nextLabel && nextLabel !== nextKey) {
    titleNode.textContent = nextLabel;
    return;
  }
  const fallbackKey = isPanelEmbed ? 'auth.register.title' : nextKey;
  const fallbackLabel = t(fallbackKey);
  if (fallbackLabel && fallbackLabel !== fallbackKey) {
    titleNode.textContent = fallbackLabel;
    return;
  }
  if (titleNode.dataset.i18nOriginalText) {
    titleNode.textContent = titleNode.dataset.i18nOriginalText;
  }
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

function setupFooterToggle() {
  const footer = document.getElementById('app-footer');
  if (!footer) return;

  const root = document.documentElement;
  const toggle = footer.querySelector('[data-footer-toggle]');
  const extras = footer.querySelectorAll('[data-footer-extra]');
  const condensed = footer.querySelectorAll('[data-footer-condensed]');
  const revisionNode = footer.querySelector('.footer-revision');
  const revisionTargets = {
    condensed: footer.querySelector('[data-footer-revision-target="condensed"]'),
    expanded: footer.querySelector('[data-footer-revision-target="expanded"]')
  };

  const getSafeAreaBottom = () => {
    const value = getComputedStyle(root).getPropertyValue('--viewport-safe-area-bottom');
    const numeric = Number.parseFloat(value);
    return Number.isNaN(numeric) ? 0 : numeric;
  };

  const updateFooterOffset = () => {
    const safeAreaBottom = getSafeAreaBottom();
    const offset = Math.max(0, footer.offsetHeight - safeAreaBottom);
    root.style.setProperty('--footer-offset', `${offset}px`);
  };

  const scheduleFooterOffsetUpdate = () => {
    window.requestAnimationFrame(updateFooterOffset);
  };

  updateFooterOffset();

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(scheduleFooterOffsetUpdate);
    resizeObserver.observe(footer);
  }

  window.addEventListener('resize', scheduleFooterOffsetUpdate);

  if (!toggle || extras.length === 0) {
    return;
  }

  const moveRevisionTo = targetKey => {
    if (!revisionNode) return;
    const target = revisionTargets[targetKey];
    if (!target) return;
    if (typeof target.prepend === 'function') {
      target.prepend(revisionNode);
      return;
    }
    const firstChild = target.firstChild;
    if (firstChild && typeof target.insertBefore === 'function') {
      target.insertBefore(revisionNode, firstChild);
      return;
    }
    if (typeof target.appendChild === 'function') {
      target.appendChild(revisionNode);
    }
  };

  const setExpanded = next => {
    const targetKey = next ? 'expanded' : 'condensed';
    moveRevisionTo(targetKey);
    toggle.setAttribute('aria-expanded', String(next));
    footer.classList.toggle('is-expanded', next);
    extras.forEach(extra => {
      if (next) {
        extra.removeAttribute('hidden');
        extra.setAttribute('aria-hidden', 'false');
      } else {
        extra.setAttribute('hidden', '');
        extra.setAttribute('aria-hidden', 'true');
      }
    });
    condensed.forEach(summary => {
      if (next) {
        summary.setAttribute('hidden', '');
      } else {
        summary.removeAttribute('hidden');
      }
    });
  };

  setExpanded(toggle.getAttribute('aria-expanded') === 'true');

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    const next = !expanded;
    setExpanded(next);
    scheduleFooterOffsetUpdate();
  });
}

function setupLanguageToggle() {
  const button = document.getElementById('btnLang');
  if (!button) return;
  const dialog = document.getElementById('language-dialog');
  const handleClick = event => {
    event.preventDefault();
    const isPlainActivation = event.detail === 0 || event.detail === 1;
    if (
      !dialog ||
      !languageDialogControls ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      isPlainActivation
    ) {
      cycleLanguage();
      return;
    }
    if (dialog.hidden) {
      userMenuElements.skipClose = true;
      openLanguageDialog(button);
    } else {
      userMenuElements.skipClose = true;
      closeLanguageDialog({ suppressDocumentClose: true });
    }
  };
  button.addEventListener('click', handleClick);
  if (!dialog) {
    button.removeAttribute('aria-controls');
    button.setAttribute('aria-haspopup', 'false');
    button.setAttribute('aria-expanded', 'false');
    return;
  }
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
  if (cancelButton) {
    cancelButton.addEventListener('click', event => {
      event.preventDefault();
      userMenuElements.skipClose = true;
      closeLanguageDialog({ suppressDocumentClose: true });
    });
  }
  dialog.addEventListener('click', event => {
    if (dialog.hidden) return;
    if (event.target === dialog) {
      event.preventDefault();
      event.stopPropagation();
      userMenuElements.skipClose = true;
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
    renderLanguageIcon(icon, resource.lang);
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
  setUserMenuPointerInteractivity(false);
  userMenuElements.skipClose = true;
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
  setUserMenuPointerInteractivity(true);
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

function handleLanguageSelection(lang, options = {}) {
  const { closeMenu = false, focusPanelAfter = true } = options;
  const current = getLang();
  if (current !== lang) {
    try {
      setLang(lang);
    } catch (error) {
      console.warn('shell: unable to switch language', error);
    }
  }
  userMenuElements.skipClose = true;
  closeLanguageDialog();
  if (closeMenu) {
    closeActiveMenu();
  }
  if (focusPanelAfter) {
    focusPanel();
  }
}

function cycleLanguage(options = {}) {
  if (!Array.isArray(LANG_RESOURCES) || !LANG_RESOURCES.length) {
    return;
  }
  const current = getLang();
  const currentIndex = LANG_RESOURCES.findIndex(resource => resource.lang === current);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % LANG_RESOURCES.length : 0;
  const next = LANG_RESOURCES[nextIndex];
  if (next) {
    handleLanguageSelection(next.lang, {
      closeMenu: options.closeMenu ?? false,
      focusPanelAfter: options.focusPanelAfter ?? false
    });
  }
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
    renderLanguageIcon(icon, current);
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

function setupAdminGateway() {
  const trigger = document.querySelector('[data-admin-trigger]');
  const overlay = document.querySelector('[data-admin-gateway]');
  const panel = overlay?.querySelector('[data-admin-gateway-panel]');
  const input = overlay?.querySelector('[data-admin-gateway-input]');
  if (!trigger || !overlay || !input || !panel) {
    adminGatewayControls = null;
    return;
  }
  adminGatewayControls = {
    trigger,
    overlay,
    panel,
    input,
    previousFocus: null
  };
  trigger.addEventListener('click', () => {
    if (overlay.hidden) {
      openAdminGateway();
    } else {
      closeAdminGateway({ restoreFocus: false });
    }
  });
  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      closeAdminGateway({ restoreFocus: true });
    }
  });
  input.addEventListener('input', () => {
    handleAdminGatewayAttempt(input.value);
  });
}

function handleAdminGatewayAttempt(value) {
  if (!adminGatewayControls) return;
  const normalized = normalizeAccessCode(value);
  if (normalized !== ADMIN_ACCESS_CODE) {
    return;
  }
  closeAdminGateway({ restoreFocus: false });
  openAdminDashboard();
  if (adminGatewayControls.input) {
    adminGatewayControls.input.value = '';
  }
}

function openAdminGateway() {
  if (!adminGatewayControls) return false;
  const { overlay, trigger, input } = adminGatewayControls;
  if (!overlay || !overlay.hidden) {
    return false;
  }
  adminGatewayControls.previousFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  overlay.hidden = false;
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'true');
  }
  if (input) {
    input.value = '';
    window.requestAnimationFrame(() => input.focus());
  }
  return true;
}

function closeAdminGateway(options = {}) {
  if (!adminGatewayControls) return false;
  const { overlay, trigger, input } = adminGatewayControls;
  if (!overlay || overlay.hidden) {
    return false;
  }
  overlay.hidden = true;
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'false');
  }
  if (input) {
    input.value = '';
  }
  const { restoreFocus = true } = options;
  const previous = adminGatewayControls.previousFocus;
  adminGatewayControls.previousFocus = null;
  if (restoreFocus) {
    const fallback = trigger && typeof trigger.focus === 'function' ? trigger : null;
    const target = previous && typeof previous.focus === 'function' ? previous : fallback;
    if (target) {
      window.requestAnimationFrame(() => target.focus());
    }
  }
  return true;
}

function setupAdminDashboard() {
  const overlay = document.querySelector('[data-admin-dashboard]');
  const panel = overlay?.querySelector('[data-admin-dashboard-panel]');
  if (!overlay || !panel) {
    adminDashboardControls = null;
    return;
  }
  const closeButton = overlay.querySelector('[data-admin-dashboard-close]');
  const status = {
    language: overlay.querySelector('[data-admin-status="language"]'),
    theme: overlay.querySelector('[data-admin-status="theme"]'),
    miniapps: overlay.querySelector('[data-admin-status="miniapps"]')
  };
  const metrics = new Map();
  overlay.querySelectorAll('[data-admin-metric]').forEach(card => {
    const key = card?.dataset?.adminMetric;
    if (!key || metrics.has(key)) return;
    metrics.set(key, {
      value: card.querySelector('[data-admin-value]'),
      trend: card.querySelector('[data-admin-trend]')
    });
  });
  const activityList = overlay.querySelector('[data-admin-activity]');
  const capacityBar = overlay.querySelector('[data-admin-capacity-bar]');
  const capacityLabel = overlay.querySelector('[data-admin-capacity-label]');
  const capacityAria = overlay.querySelector('[data-admin-capacity-aria]');
  adminDashboardControls = {
    overlay,
    panel,
    closeButton,
    status,
    metrics,
    activityList,
    capacity: {
      bar: capacityBar,
      label: capacityLabel,
      aria: capacityAria
    },
    previousFocus: null
  };
  if (closeButton) {
    closeButton.addEventListener('click', () => closeAdminDashboard({ restoreFocus: true }));
  }
  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      closeAdminDashboard({ restoreFocus: true });
    }
  });
  overlay.querySelectorAll('[data-admin-action]').forEach(button => {
    button.addEventListener('click', () => {
      handleAdminDashboardAction(button.dataset.adminAction, button);
    });
  });
}

function openAdminDashboard() {
  if (!adminDashboardControls) return false;
  const { overlay, closeButton, panel } = adminDashboardControls;
  if (!overlay || !overlay.hidden) {
    return false;
  }
  adminDashboardControls.previousFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  updateAdminDashboardMetrics();
  updateAdminDashboardStatus();
  updateAdminDashboardActivity();
  updateAdminDashboardHealth();
  overlay.hidden = false;
  document.body.classList.add('is-admin-dashboard-open');
  const focusTarget = closeButton || panel;
  if (focusTarget && typeof focusTarget.focus === 'function') {
    window.requestAnimationFrame(() => focusTarget.focus());
  }
  return true;
}

function closeAdminDashboard(options = {}) {
  if (!adminDashboardControls) return false;
  const { overlay } = adminDashboardControls;
  if (!overlay || overlay.hidden) {
    return false;
  }
  overlay.hidden = true;
  document.body.classList.remove('is-admin-dashboard-open');
  const { restoreFocus = true } = options;
  const previous = adminDashboardControls.previousFocus;
  adminDashboardControls.previousFocus = null;
  if (restoreFocus) {
    const fallback = adminGatewayControls?.trigger;
    const target =
      previous && typeof previous.focus === 'function'
        ? previous
        : fallback && typeof fallback.focus === 'function'
          ? fallback
          : null;
    if (target) {
      window.requestAnimationFrame(() => target.focus());
    }
  }
  return true;
}

function handleAdminDashboardAction(action, button) {
  if (!action) return;
  if (action === 'refresh') {
    updateAdminDashboardMetrics();
    updateAdminDashboardStatus();
    updateAdminDashboardActivity();
    updateAdminDashboardHealth();
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      window.setTimeout(() => {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }, 600);
    }
    return;
  }
  if (action === 'logs') {
    const logsUrl = new URL('./REVISION_LOG.md', import.meta.url);
    if (typeof window !== 'undefined') {
      window.open(logsUrl.href, '_blank', 'noopener');
    }
    return;
  }
  if (action === 'miniapps') {
    closeAdminDashboard({ restoreFocus: false });
    openNavigationOverlay();
  }
}

function setupLoginPanelShortcut() {
  const trigger = document.querySelector('[data-action="open-login"]');
  if (!trigger) return;
  trigger.addEventListener('click', event => {
    event.preventDefault();
    const controls = getStageHost();
    if (!controls || !controls.host) {
      window.location.href = LOGIN_URL.href;
      return;
    }
    miniAppState.items = withShellMiniApps(miniAppState.items);
    setActiveMiniApp(LOGIN_PANEL_MINI_APP_ID);
    focusPanel();
  });
}

function setupRegisterPanelShortcut() {
  const trigger = document.querySelector('[data-action="open-register"]');
  if (!trigger) return;
  trigger.addEventListener('click', event => {
    event.preventDefault();
    const controls = getStageHost();
    if (!controls || !controls.host) {
      window.location.href = REGISTER_URL.href;
      return;
    }
    miniAppState.items = withShellMiniApps(miniAppState.items);
    setActiveMiniApp(REGISTER_PANEL_MINI_APP_ID);
    focusPanel();
  });
}

function setupSystemPanelShortcut() {
  const button = document.getElementById('btnSystemPanel');
  if (!button) return;
  button.addEventListener('click', () => {
    activateMiniAppShortcut(SYSTEM_DASHBOARD_MINI_APP_ID);
    closeActiveMenu();
    closeMiniAppMenu();
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
    closeActiveMenu();
    closeMiniAppMenu();
  });
}

function handleUserPanelShortcutClick() {
  return activateMiniAppShortcut(USER_DASHBOARD_MINI_APP_ID);
}

function displayDeferredFeedback() {
  const message = consumeDeferredFeedback();
  if (!message) return;
  announce(message);
  const feedbackElement = document.querySelector('.feedback');
  if (feedbackElement) {
    scheduleFeedbackClear(feedbackElement);
  }
}

function updateUserPanelShortcut() {
  const button = document.getElementById('btnUserPanel');
  if (!button) return;
  const srOnly = button.querySelector('.sr-only');
  const user = currentUser();
  const baseLabel = t('actions.openUserPanel');
  const label = baseLabel;
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
  menu.setAttribute('aria-hidden', 'true');
  const panel = menu.querySelector('[data-user-menu-panel]');
  userMenuElements.menu = menu;
  userMenuElements.panel = panel || null;
  setUserMenuPointerInteractivity(true);
  if (!button.hasAttribute('aria-controls')) {
    button.setAttribute('aria-controls', menu.id);
  }
  button.setAttribute('aria-haspopup', 'dialog');

  const closeButton = menu.querySelector('[data-user-menu-close]');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      closeMenu(button, menu, { restoreFocus: true });
    });
  }

  menu.addEventListener('click', event => {
    if (event.target === menu) {
      closeMenu(button, menu, { restoreFocus: true });
    }
  });

  button.addEventListener('click', event => {
    event.stopPropagation();
    toggleMenu(button, menu, () => focusFirstUserMenuItem(menu));
  });

  menu.querySelectorAll('button[data-action]').forEach(actionButton => {
    const action = actionButton.dataset.action;
    if (!action) return;
    actionButton.addEventListener('click', () => handleUserAction(action));
  });

  refreshUserMenu();
}

function setUserMenuPointerInteractivity(interactive) {
  const { menu, panel } = userMenuElements;
  if (!menu || !panel) {
    return;
  }
  menu.style.pointerEvents = 'none';
  panel.style.pointerEvents = interactive ? 'auto' : 'none';
}

function focusFirstUserMenuItem(menu) {
  if (!menu) return;
  const items = Array.from(menu.querySelectorAll('.menu .menu-item')).filter(item => {
    const parent = item.closest('li');
    const hiddenParent = parent && parent.hidden;
    return !hiddenParent && !item.hasAttribute('disabled');
  });
  const target = items[0];
  if (target && typeof target.focus === 'function') {
    window.requestAnimationFrame(() => target.focus());
  }
}

function refreshUserMenu() {
  const menu = document.getElementById('user-menu');
  if (!menu) return;
  const user = currentUser();
  const isAuthenticated = Boolean(user);
  const userPanelButton = document.getElementById('btnUserPanel');
  const profileButton = menu.querySelector('button[data-action="profile"]');
  const logoutButton = menu.querySelector('button[data-action="logout"]');
  const divider = menu.querySelector('.menu-divider');
  setMenuItemVisibility(userPanelButton, true);
  setMenuItemVisibility(profileButton, isAuthenticated);
  setMenuItemVisibility(logoutButton, isAuthenticated);
  if (divider) {
    divider.hidden = !isAuthenticated;
    divider.setAttribute('aria-hidden', isAuthenticated ? 'false' : 'true');
  }
}

function setMenuItemVisibility(button, visible) {
  if (!button) return;
  const item = button.closest('li');
  const showItem = Boolean(visible);
  if (item) {
    item.hidden = !showItem;
  }
  if (showItem) {
    button.removeAttribute('aria-hidden');
  } else {
    button.setAttribute('aria-hidden', 'true');
  }
}

function handleUserAction(action) {
  if (action === 'reset-data') {
    closeActiveMenu();
    const confirmed = window.confirm(t('actions.resetDataConfirm'));
    if (!confirmed) {
      return;
    }
    isRedirectingHome = true;
    const successMessage = t('auth.feedback.dataReset');
    storeDeferredFeedback(successMessage);
    closeMiniAppMenu();
    resetApplicationData();
    const feedbackElement = document.querySelector('.feedback');
    if (feedbackElement) {
      announceTo(feedbackElement, successMessage);
      scheduleFeedbackClear(feedbackElement);
    } else {
      announce(successMessage);
    }
    window.setTimeout(() => {
      window.location.href = LOGIN_URL.href;
    }, HOME_REDIRECT_DELAY);
    return;
  }
  if (action === 'profile') {
    closeActiveMenu();
    window.location.href = USER_PANEL_URL.href;
    return;
  }
  if (action === 'logout') {
    closeActiveMenu();
    announce(t('actions.logout'));
    performLogout();
  }
}

function resetApplicationData() {
  resetAuth();
  if (typeof window === 'undefined') return;
  try {
    const { localStorage, sessionStorage } = window;
    localStorage?.removeItem('miniapp.base.lang');
    localStorage?.removeItem('miniapp.base.theme');
    localStorage?.removeItem('miniapp.base.session');
    localStorage?.removeItem('miniapp.base.users');
    sessionStorage?.removeItem('miniapp.base.session');
  } catch (error) {
    console.warn('app: unable to reset stored data', error);
  }
}

function performLogout() {
  isRedirectingHome = true;
  logout();
  window.setTimeout(() => {
    window.location.href = LOGIN_URL.href;
  }, HOME_REDIRECT_DELAY);
}

function redirectIfAuthenticationRequired(user) {
  if (typeof window === 'undefined') return;
  const activeUser = user ?? currentUser();
  if (activeUser) {
    return;
  }
  if (isRedirectingHome) {
    return;
  }
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    return;
  }
  const registerForm = document.getElementById('register-form');
  const allowRegistration = shouldAllowPublicRegistration();
  const registerMiniAppAvailable = allowRegistration && hasRegisterMiniApp();
  let registerMiniAppRequested = false;
  if (registerMiniAppAvailable) {
    if (miniAppState.activeId === REGISTER_PANEL_MINI_APP_ID) {
      registerMiniAppRequested = true;
    } else {
      try {
        const url = new URL(window.location.href);
        registerMiniAppRequested = url.searchParams.get('miniapp') === REGISTER_PANEL_MINI_APP_ID;
      } catch (error) {
        console.warn('auth: unable to inspect mini-app location', error);
      }
    }
  }
  if (registerForm && allowRegistration) {
    return;
  }
  if (registerMiniAppRequested) {
    return;
  }
  if (allowRegistration && window.location.href === REGISTER_URL.href) {
    return;
  }
  if (window.location.href === LOGIN_URL.href) {
    return;
  }
  window.location.replace(LOGIN_URL.href);
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
  openMenu(button, menu, renderer);
}

function openMenu(button, menu, renderer) {
  if (!button || !menu) return;
  menu.hidden = false;
  menu.setAttribute('aria-hidden', 'false');
  button.setAttribute('aria-expanded', 'true');
  activeMenu = { button, menu };
  if (typeof renderer === 'function') {
    renderer(menu);
  }
}

function closeMenu(button, menu, options = {}) {
  if (!menu) return;
  menu.hidden = true;
  menu.setAttribute('aria-hidden', 'true');
  if (button) {
    button.setAttribute('aria-expanded', 'false');
  }
  if (activeMenu && activeMenu.menu === menu) {
    activeMenu = null;
  }
  const shouldRestoreFocus = options.restoreFocus ?? menu.getAttribute('role') === 'dialog';
  if (shouldRestoreFocus && button && typeof button.focus === 'function') {
    window.requestAnimationFrame(() => button.focus());
  }
}

function closeActiveMenu() {
  if (!activeMenu) return;
  closeMenu(activeMenu.button, activeMenu.menu);
}

function updateAdminDashboardMetrics() {
  if (!adminDashboardControls || !(adminDashboardControls.metrics instanceof Map)) {
    return;
  }
  const metrics = adminDashboardControls.metrics;
  if (!metrics.size) return;
  const users = listUsers();
  const owners = users.filter(user => user?.role === 'owner');
  const visibleMiniApps = getVisibleMiniApps();
  const userCount = users.length;
  const ownerCount = owners.length;
  const ownerShare = userCount ? Math.round((ownerCount / userCount) * 100) : 0;
  const uptimeFormatted = `${formatDecimal(ADMIN_UPTIME_PERCENT, 2)}%`;
  const satisfactionScore = `${formatNumber(ADMIN_SATISFACTION_SCORE)}%`;
  const satisfactionDelta = formatNumber(Math.abs(ADMIN_SATISFACTION_DELTA));
  const data = {
    users: {
      value: formatNumber(userCount),
      trend: t('admin.dashboard.metric.users.trend', {
        count: formatNumber(userCount)
      })
    },
    owners: {
      value: formatNumber(ownerCount),
      trend: t('admin.dashboard.metric.owners.trend', {
        percentage: formatNumber(ownerShare)
      })
    },
    miniapps: {
      value: formatNumber(visibleMiniApps.length),
      trend: t('admin.dashboard.metric.miniapps.trend', {
        count: formatNumber(visibleMiniApps.length)
      })
    },
    uptime: {
      value: uptimeFormatted,
      trend: t('admin.dashboard.metric.uptime.trend', {
        value: formatDecimal(ADMIN_UPTIME_PERCENT, 2)
      })
    },
    satisfaction: {
      value: satisfactionScore,
      trend: t('admin.dashboard.metric.satisfaction.trend', {
        points: satisfactionDelta
      })
    }
  };
  metrics.forEach((refs, key) => {
    const metric = data[key];
    if (!metric) return;
    if (refs.value) {
      refs.value.textContent = metric.value;
    }
    if (refs.trend) {
      refs.trend.textContent = metric.trend;
    }
  });
}

function updateAdminDashboardStatus() {
  if (!adminDashboardControls || !adminDashboardControls.status) return;
  const { status } = adminDashboardControls;
  const currentLang = getLang();
  const langResource = LANG_RESOURCES.find(resource => resource.lang === currentLang);
  const langLabel = langResource ? t(langResource.labelKey) : currentLang;
  const themeState = getTheme();
  const themeKey = `theme.${themeState.mode ?? themeState.resolved ?? 'light'}`;
  let themeLabel = t(themeKey);
  if (!themeLabel || themeLabel === themeKey) {
    themeLabel = themeState.mode ?? themeState.resolved ?? 'light';
  }
  const miniApps = getVisibleMiniApps();
  if (status.language) {
    status.language.textContent = t('admin.dashboard.status.language', {
      lang: langLabel
    });
  }
  if (status.theme) {
    status.theme.textContent = t('admin.dashboard.status.theme', {
      theme: themeLabel
    });
  }
  if (status.miniapps) {
    status.miniapps.textContent = t('admin.dashboard.status.miniapps', {
      count: formatNumber(miniApps.length)
    });
  }
}

function updateAdminDashboardActivity() {
  if (!adminDashboardControls || !adminDashboardControls.activityList) return;
  const list = adminDashboardControls.activityList;
  list.innerHTML = '';
  const items = [];
  const user = currentUser();
  if (user) {
    const displayName = user.name || user.email || t('admin.dashboard.activity.anonymous');
    items.push({
      icon: '✅',
      text: t('admin.dashboard.activity.session', { name: displayName })
    });
  }
  const users = listUsers();
  if (users.length) {
    const latest = [...users].sort((a, b) => {
      const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })[0];
    const latestName = latest?.name || latest?.email;
    if (latestName) {
      items.push({
        icon: '🆕',
        text: t('admin.dashboard.activity.userCreated', { name: latestName })
      });
    }
  }
  if (miniAppState.activeId) {
    const active = (Array.isArray(miniAppState.items) ? miniAppState.items : []).find(
      item => item?.id === miniAppState.activeId
    );
    if (active) {
      const label = active.labelKey ? t(active.labelKey) : active.id;
      items.push({
        icon: '🧭',
        text: t('admin.dashboard.activity.activeMiniApp', { name: label })
      });
    }
  }
  items.push({ icon: '🛰', text: t('admin.dashboard.activity.environmentReady') });
  if (!items.length) {
    const placeholder = document.createElement('li');
    placeholder.className = 'admin-dashboard__list-item is-empty';
    placeholder.textContent = t('admin.dashboard.activity.placeholder');
    list.appendChild(placeholder);
    return;
  }
  items.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'admin-dashboard__list-item';
    const icon = document.createElement('span');
    icon.className = 'admin-dashboard__list-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = entry.icon;
    const text = document.createElement('span');
    text.className = 'admin-dashboard__list-text';
    text.textContent = entry.text;
    item.append(icon, text);
    list.appendChild(item);
  });
}

function updateAdminDashboardHealth() {
  if (!adminDashboardControls || !adminDashboardControls.capacity) return;
  const { bar, label, aria } = adminDashboardControls.capacity;
  if (!bar && !label && !aria) return;
  const users = listUsers();
  const miniApps = getVisibleMiniApps();
  const load = Math.min(92, Math.max(28, 42 + users.length * 9 + miniApps.length * 7));
  const formattedLoad = formatNumber(Math.round(load));
  if (bar) {
    bar.style.setProperty('--progress', `${Math.round(load)}%`);
  }
  if (aria) {
    aria.setAttribute('aria-label', t('admin.dashboard.health.capacity.aria', { value: formattedLoad }));
  }
  if (label) {
    label.textContent = t('admin.dashboard.health.capacity.note', { value: formattedLoad });
  }
}

function getVisibleMiniApps() {
  const items = Array.isArray(miniAppState.items) ? miniAppState.items : [];
  return items.filter(item => !item?.hidden);
}

function normalizeAccessCode(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function formatNumber(value) {
  const lang = document.documentElement.lang || 'pt-BR';
  const number = Number(value ?? 0);
  try {
    return new Intl.NumberFormat(lang).format(number);
  } catch (error) {
    return String(number);
  }
}

function getInitials(name = '') {
  const safeName = String(name ?? '').trim();
  if (!safeName) {
    return '—';
  }
  const parts = safeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) {
    return safeName.slice(0, 1).toUpperCase();
  }
  return parts
    .map(part => part.slice(0, 1).toUpperCase())
    .join('');
}

function formatDecimal(value, fractionDigits = 1) {
  const lang = document.documentElement.lang || 'pt-BR';
  const number = Number(value ?? 0);
  try {
    return new Intl.NumberFormat(lang, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(number);
  } catch (error) {
    return number.toFixed(fractionDigits);
  }
}

function handleShellMessage(event) {
  if (!event || event.origin !== window.location.origin) {
    return;
  }
  const data = event.data;
  if (!data || typeof data !== 'object') {
    return;
  }
  if (data.type !== SHELL_NAVIGATION_MESSAGE_TYPE) {
    return;
  }
  const payload = data.payload || {};
  const action = payload.action || data.action;
  if (action === SHELL_NAVIGATION_ACTIONS.OPEN_HOME) {
    closeMiniAppMenu();
    setActiveMiniApp(null, { skipHistory: true });
    focusPanel();
    if (payload.highlight !== false) {
      window.requestAnimationFrame(() => {
        highlightElement(document.getElementById('panel'));
      });
    }
    window.requestAnimationFrame(() => {
      displayDeferredFeedback();
    });
  }
}

function handleDocumentClick(event) {
  if (adminGatewayControls && adminGatewayControls.overlay && !adminGatewayControls.overlay.hidden) {
    const { overlay, panel } = adminGatewayControls;
    if (overlay.contains(event.target) && panel && panel.contains(event.target)) {
      return;
    }
  }
  if (adminDashboardControls && adminDashboardControls.overlay && !adminDashboardControls.overlay.hidden) {
    const { overlay, panel } = adminDashboardControls;
    if (overlay.contains(event.target) && panel && panel.contains(event.target)) {
      return;
    }
  }
  if (languageDialogControls && languageDialogControls.dialog && !languageDialogControls.dialog.hidden) {
    const { dialog } = languageDialogControls;
    if (dialog.contains(event.target)) {
      return;
    }
  }
  const shouldResetDialogSuppression = languageDialogControls?.suppressDocumentClose === true;
  if (shouldResetDialogSuppression && languageDialogControls) {
    languageDialogControls.suppressDocumentClose = false;
  }
  if (navigationOverlayControls && navigationOverlayControls.overlay && !navigationOverlayControls.overlay.hidden) {
    const { panel, trigger } = navigationOverlayControls;
    const isOutsidePanel = panel && !panel.contains(event.target);
    const isOutsideTrigger = !trigger || !trigger.contains(event.target);
    if (isOutsidePanel && isOutsideTrigger) {
      closeNavigationOverlay({ restoreFocus: false });
    }
  }
  if (userMenuElements.skipClose) {
    userMenuElements.skipClose = false;
    return;
  }
  if (!activeMenu) return;
  const { button, menu } = activeMenu;
  const navTrigger = document.getElementById('btnMiniapps');
  if (navTrigger && navTrigger.contains(event.target)) {
    return;
  }
  const navigationOverlay = document.getElementById('navigation-overlay');
  if (navigationOverlay && !navigationOverlay.hidden && navigationOverlay.contains(event.target)) {
    return;
  }
  if (button.contains(event.target) || menu.contains(event.target)) return;
  closeActiveMenu();
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    if (closeAdminDashboard({ restoreFocus: true })) {
      event.stopPropagation();
      return;
    }
    if (closeAdminGateway({ restoreFocus: true })) {
      event.stopPropagation();
      return;
    }
    if (closeLanguageDialog()) {
      return;
    }
    if (closeNavigationOverlay({ restoreFocus: true })) {
      return;
    }
    closeActiveMenu();
  }
}

function setupAuthForms() {
  const passwordToggleRefreshers = [];

  function setupPasswordToggle({ input, button, showLabelKey, hideLabelKey }) {
    if (!input || !button) return null;
    const icon = button.querySelector('[data-password-visibility-icon]');
    const label = button.querySelector('[data-password-visibility-label]');
    let isVisible = false;

    const renderState = () => {
      const labelKey = isVisible ? hideLabelKey : showLabelKey;
      if (label) {
        label.dataset.i18n = labelKey;
        const labelText = t(labelKey);
        label.textContent = labelText && labelText !== labelKey ? labelText : labelKey;
      }
      if (icon) {
        icon.textContent = isVisible ? '🙈' : '👁️';
      }
    };

    const applyVisibility = visible => {
      isVisible = Boolean(visible);
      input.type = isVisible ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(isVisible));
      renderState();
    };

    button.addEventListener('click', () => {
      applyVisibility(!isVisible);
    });

    passwordToggleRefreshers.push(renderState);
    applyVisibility(false);

    return {
      setVisibility: applyVisibility
    };
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const feedback = document.getElementById('login-feedback');
    const passwordInput = loginForm.querySelector('#login-password');
    const togglePasswordButton = loginForm.querySelector('[data-action="toggle-password"]');
    const rememberCheckbox = loginForm.querySelector('#login-remember');
    const forgotPasswordButtons = Array.from(
      document.querySelectorAll('[data-action="forgot-password"]')
    );
    const switchUserButton = document.querySelector('[data-action="switch-user"]');
    const loginPasswordToggle = setupPasswordToggle({
      input: passwordInput,
      button: togglePasswordButton,
      showLabelKey: 'auth.login.showPassword',
      hideLabelKey: 'auth.login.hidePassword'
    });

    if (forgotPasswordButtons.length > 0) {
      const handleForgotPassword = () => {
        closeActiveMenu();
        const emailField = loginForm.querySelector('#login-email');
        const email = String(emailField?.value || '').trim();
        const key = email ? 'auth.login.recoveryMessageWithEmail' : 'auth.login.recoveryMessage';
        const message = email ? t(key, { email }) : t(key);
        announceTo(feedback, message);
        scheduleFeedbackClear(feedback);
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          window.alert(message);
        }
      };

      forgotPasswordButtons.forEach(button => {
        button.addEventListener('click', handleForgotPassword);
      });
    }

    if (switchUserButton) {
      switchUserButton.addEventListener('click', () => {
        closeActiveMenu();
        logout();
        loginForm.reset();
        loginPasswordToggle?.setVisibility(false);
        const emailField = loginForm.querySelector('#login-email');
        emailField?.focus();
        const message = t('auth.login.switchUserSuccess');
        announceTo(feedback, message);
        scheduleFeedbackClear(feedback);
      });
    }

    loginForm.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(loginForm);
      try {
        const remember = rememberCheckbox ? rememberCheckbox.checked : true;
        const user = login(
          {
            email: data.get('email'),
            password: data.get('password')
          },
          { remember }
        );
        const successMessage = t('auth.feedback.loggedIn', { name: user.name });
        announceTo(feedback, successMessage);
        scheduleFeedbackClear(feedback);
        const shouldReturnToShell =
          document.documentElement?.dataset.embedMode === 'panel' || isFramedWindow();
        if (shouldReturnToShell) {
          window.setTimeout(() => {
            navigateToShellHome({ feedbackMessage: successMessage });
          }, HOME_REDIRECT_DELAY);
        } else {
          const menuButton = document.getElementById('btnUser');
          const menu = userMenuElements.menu || document.getElementById('user-menu');
          if (menu && menuButton && menu.hidden) {
            openMenu(menuButton, menu, () => focusFirstUserMenuItem(menu));
          }
        }
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
    const phoneRegionField = registerForm.querySelector('[data-phone-region]');
    const passwordField = registerForm.querySelector('#register-password');
    const togglePasswordButton = registerForm.querySelector('[data-action="toggle-password"]');
    const passwordStrengthMeter = registerForm.querySelector('[data-password-meter]');
    const passwordStrengthBar = passwordStrengthMeter?.querySelector('[data-password-bar]');
    const passwordStrengthStatus = passwordStrengthMeter?.querySelector('[data-password-status]');
    const registerSubmitButton = registerForm.querySelector('button[type="submit"]');
    const registerState = {
      passwordLevel: PASSWORD_STRENGTH_LEVELS.WEAK,
      passwordLength: 0
    };
    function renderPasswordStrength(level) {
      if (!passwordStrengthMeter) return;
      const resolvedLevel = level || PASSWORD_STRENGTH_LEVELS.WEAK;
      passwordStrengthMeter.dataset.strength = resolvedLevel;
      const baseProgress = PASSWORD_STRENGTH_PROGRESS[resolvedLevel] ?? 0;
      const progress = registerState.passwordLength ? baseProgress : 0;
      if (passwordStrengthBar) {
        passwordStrengthBar.style.width = `${progress}%`;
      }
      if (passwordStrengthStatus) {
        const statusKey = `auth.passwordStrength.level.${resolvedLevel}`;
        passwordStrengthStatus.dataset.i18n = statusKey;
        const statusText = t(statusKey);
        passwordStrengthStatus.textContent = statusText && statusText !== statusKey ? statusText : statusKey;
      }
    }

    function applyPasswordStrength(level) {
      const resolvedLevel = level || PASSWORD_STRENGTH_LEVELS.WEAK;
      registerState.passwordLevel = resolvedLevel;
      renderPasswordStrength(resolvedLevel);
      if (registerSubmitButton) {
        registerSubmitButton.disabled = resolvedLevel === PASSWORD_STRENGTH_LEVELS.WEAK;
      }
      return resolvedLevel;
    }

    function setPasswordStrength(value) {
      const normalized = String(value || '');
      registerState.passwordLength = normalized.length;
      const { level } = evaluatePasswordStrength(normalized);
      return applyPasswordStrength(level);
    }

    function clearPasswordStrengthFeedback() {
      if (!feedback) return;
      if (feedback.dataset.feedbackType === 'passwordStrength') {
        feedback.textContent = '';
        delete feedback.dataset.feedbackType;
      }
    }

    function announceFeedback(message, type = null) {
      if (!feedback) return;
      if (type) {
        feedback.dataset.feedbackType = type;
      } else {
        delete feedback.dataset.feedbackType;
      }
      announceTo(feedback, message);
    }

    applyPasswordStrength(registerState.passwordLevel);

    let registerPasswordToggle = null;
    const emailField = registerForm.querySelector('#register-email');
    if (passwordField) {
      registerPasswordToggle = setupPasswordToggle({
        input: passwordField,
        button: togglePasswordButton,
        showLabelKey: 'auth.register.showPassword',
        hideLabelKey: 'auth.register.hidePassword'
      });
      setPasswordStrength(passwordField.value);
      passwordField.addEventListener('input', () => {
        const level = setPasswordStrength(passwordField.value);
        if (level !== PASSWORD_STRENGTH_LEVELS.WEAK) {
          clearPasswordStrengthFeedback();
        }
      });
    }

    onLanguageChange(() => {
      renderPasswordStrength(registerState.passwordLevel);
      if (feedback && feedback.dataset.feedbackType === 'passwordStrength') {
        announceFeedback(t('auth.feedback.passwordWeak'), 'passwordStrength');
      }
    });

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

    let isProcessingRegistration = false;
    registerForm.addEventListener('submit', () => {
      window.requestAnimationFrame(() => {
        if (!feedback || (feedback.textContent && feedback.textContent.trim())) {
          return;
        }
        if (emailField?.classList.contains('is-invalid')) {
          announceFeedback(t('auth.feedback.invalidEmail'), 'error');
        }
      });
    });

    registerForm.addEventListener('register:completed', event => {
      if (event.target !== registerForm) {
        return;
      }
      if (isProcessingRegistration) {
        return;
      }
      const detail = event.detail || {};
      const userDetail = detail.user || {};
      const credentials = detail.credentials || {};
      const name = String(userDetail.fullName || userDetail.name || '').trim();
      const email = String(userDetail.email || '').trim();
      const phoneNumber = String(userDetail.phoneNumber || userDetail.phone || '').trim();
      const phoneCountry = String(detail.phoneCountry || userDetail.countryCode || '').replace(/\D+/g, '');
      const password = String(credentials.password || '');
      if (!phoneNumber || !password) {
        return;
      }

      const normalizedDigits = phoneNumber.replace(/\D+/g, '');
      const fallbackEmail = email
        || (normalizedDigits ? `${normalizedDigits}@phone.local` : '');
      const existingUsers = listUsers();
      const emailCandidate = 'alice@example.com';
      const candidateLower = emailCandidate.toLowerCase();
      const hasOwner = existingUsers.some(user => user?.role === 'owner');
      const emailTaken = existingUsers.some(
        user => (user?.email || '').trim().toLowerCase() === candidateLower
      );
      const shouldUseCandidate = !hasOwner && !emailTaken;
      const fallbackMatchesCandidate = (fallbackEmail || '').trim().toLowerCase() === candidateLower;
      let resolvedEmail = fallbackEmail || `user_${Date.now()}@phone.local`;
      if (shouldUseCandidate && !fallbackMatchesCandidate) {
        resolvedEmail = emailCandidate;
      }
      const resolvedName = name || phoneNumber;

      isProcessingRegistration = true;
      try {
        const phoneRegionValue = detail.phoneRegion === 'INTL' ? 'INTL' : 'BR';
        const user = register({
          name: resolvedName,
          email: resolvedEmail,
          phone: phoneNumber,
          password,
          role: 'owner',
          phoneRegion: phoneRegionValue,
          phoneCountry: phoneCountry || null
        });
        const successMessage = t('auth.feedback.registered');
        detail.feedbackMessage = successMessage;
        const isPanelEmbed = document.documentElement.dataset.embedMode === 'panel';
        detail.redirectUrl = isPanelEmbed
          ? new URL(USER_PANEL_EMBED_ROUTE, import.meta.url).href
          : USER_PANEL_URL.href;
        detail.navigationHandled = true;
        announceFeedback(successMessage, 'success');
        if (feedback) {
          feedback.textContent = successMessage;
        }
        updateUserDisplay(user);
        registerForm.reset();
        registerPasswordToggle?.setVisibility(false);
        setPasswordStrength('');
        if (phoneRegionField) {
          phoneRegionField.value = 'BR';
        }
        const phoneCountryInput = registerForm.querySelector('#register-phone-country');
        if (phoneCountryInput) {
          phoneCountryInput.value = '55';
        }
        window.setTimeout(() => {
          if (detail.redirectUrl) {
            window.location.replace(detail.redirectUrl);
          } else {
            navigateToShellHome({
              feedbackMessage: successMessage
            });
          }
        }, 300);
      } catch (error) {
        const message = error.message === 'auth:user-exists'
          ? t('auth.feedback.exists')
          : error.message;
        announceFeedback(message);
      } finally {
        isProcessingRegistration = false;
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
        } else if (error.message === 'auth:owner-delete-forbidden') {
          announceTo(feedback, t('auth.feedback.ownerDeleteSelf'));
        } else {
          announceTo(feedback, t('auth.feedback.generic'));
        }
      }
    });
  }
}

function updateUserDisplay(user) {
  const display = document.getElementById('current-user');
  const button = document.getElementById('btnUser');
  const hasName = Boolean(user && user.name);
  const baseLabel = t('actions.openUserMenu');
  let label = baseLabel;
  if (hasName) {
    const contextualKey = 'actions.openUserMenuWithName';
    const contextual = t(contextualKey, { name: user.name });
    label = contextual === contextualKey ? `${baseLabel} (${user.name})` : contextual;
  }
  if (display) {
    display.textContent = hasName ? user.name : baseLabel;
  }
  if (button) {
    button.setAttribute('aria-label', label);
    button.title = label;
  }
}

function updateNavigationVisibility(user) {
  const isAuthenticated = Boolean(user);
  const trigger = navigationOverlayControls?.trigger || document.getElementById('btnMiniapps');
  if (trigger) {
    trigger.hidden = !isAuthenticated;
    if (!isAuthenticated) {
      trigger.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
    } else {
      trigger.removeAttribute('aria-hidden');
    }
  }
  if (!isAuthenticated) {
    closeNavigationOverlay({ restoreFocus: false });
    closeActiveMenu();
  }
}

function updateProfileView(user) {
  const profileForm = document.getElementById('profile-form');
  const passwordForm = document.getElementById('password-form');
  const logoutButton = document.getElementById('profile-logout');
  const deleteButton = document.getElementById('delete-account');
  const profileFeedback = document.getElementById('profile-form-feedback');
  const passwordFeedback = document.getElementById('password-form-feedback');
  const identityName = document.querySelector('[data-profile-identity-name]');
  const identityEmail = document.querySelector('[data-profile-identity-email]');
  const identityRole = document.querySelector('[data-profile-identity-role]');
  const identityAvatar = document.querySelector('[data-profile-avatar]');
  const statsTotal = document.querySelector('[data-profile-total-users]');
  const statsDependents = document.querySelector('[data-profile-dependent-users]');
  const statsOwnerSince = document.querySelector('[data-profile-owner-since]');

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

  const users = listUsers();
  const totalUsers = users.length;
  const dependentCount = Math.max(totalUsers - 1, 0);
  if (identityName) {
    identityName.textContent = user ? user.name : '—';
  }
  if (identityEmail) {
    identityEmail.textContent = user ? user.email : '—';
  }
  if (identityRole) {
    identityRole.textContent = user ? t(user.role === 'owner' ? 'auth.form.owner' : 'auth.form.member') : '—';
    identityRole.dataset.role = user ? user.role : 'none';
  }
  if (identityAvatar) {
    identityAvatar.textContent = user ? getInitials(user.name) : '—';
  }
  if (statsTotal) {
    statsTotal.textContent = String(totalUsers);
  }
  if (statsDependents) {
    statsDependents.textContent = String(dependentCount);
  }
  if (statsOwnerSince) {
    statsOwnerSince.textContent = user && user.createdAt ? formatUserDate(user.createdAt) : '—';
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
  const phoneField = document.getElementById('manage-phone');
  const passwordField = document.getElementById('manage-password');
  const roleField = document.getElementById('manage-role');
  if (!list || !createButton || !form || !feedback || !title || !submitButton || !cancelButton || !nameField || !emailField || !phoneField || !passwordField || !roleField) {
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
    phoneField,
    passwordField,
    roleField
  };
  roleField.value = 'member';
  const ownerOption = roleField.querySelector('option[value="owner"]');
  if (ownerOption) {
    ownerOption.disabled = true;
    ownerOption.hidden = true;
  }
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
    cell.colSpan = 6;
    cell.textContent = t('auth.profile.userEmpty');
    row.appendChild(cell);
    list.appendChild(row);
    return;
  }
  users.forEach(user => {
    const row = document.createElement('tr');
    row.dataset.userId = user.id;
    if (user.role === 'owner') {
      row.classList.add('is-owner');
    }
    const nameCell = document.createElement('td');
    nameCell.textContent = user.name || '—';
    row.appendChild(nameCell);
    const emailCell = document.createElement('td');
    emailCell.textContent = user.email;
    row.appendChild(emailCell);
    const phoneCell = document.createElement('td');
    phoneCell.textContent = user.phone || '—';
    row.appendChild(phoneCell);
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
    if (user.role !== 'owner') {
      actionsCell.appendChild(createUserManagementActionButton('transfer', t('auth.profile.userTransfer'), () => {
        handleOwnershipTransfer(user);
      }));
      actionsCell.appendChild(createUserManagementActionButton('delete', t('auth.profile.userDelete'), () => {
        handleUserDelete(user);
      }, 'danger'));
    }
    row.appendChild(actionsCell);
    list.appendChild(row);
  });
}

function createUserManagementActionButton(action, label, handler, variant) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `ghost${variant ? ` ${variant}` : ''}`;
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
    phoneField,
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
  phoneField.value = mode === 'duplicate' ? '' : user?.phone || '';
  passwordField.value = '';
  const isOwner = user?.role === 'owner';
  const ownerOption = roleField.querySelector('option[value="owner"]');
  if (ownerOption) {
    ownerOption.disabled = !isOwner;
    ownerOption.hidden = !isOwner;
  }
  roleField.value = isOwner ? 'owner' : 'member';
  roleField.disabled = isOwner;
  phoneField.required = true;
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
    phoneField,
    passwordField,
    roleField
  } = userManagementControls;
  form.hidden = true;
  nameField.value = '';
  emailField.value = '';
  emailField.placeholder = '';
  phoneField.value = '';
  passwordField.value = '';
  passwordField.placeholder = '';
  passwordField.required = true;
  roleField.value = 'member';
  roleField.disabled = false;
  const ownerOption = roleField.querySelector('option[value="owner"]');
  if (ownerOption) {
    ownerOption.disabled = true;
    ownerOption.hidden = true;
  }
  userManagementState.mode = null;
  userManagementState.targetId = null;
}

function handleUserManagementSubmit(event) {
  event.preventDefault();
  if (!userManagementControls) return;
  const { feedback, nameField, emailField, phoneField, passwordField, roleField } = userManagementControls;
  const mode = userManagementState.mode || 'create';
  const name = nameField.value.trim();
  const email = emailField.value.trim();
  const phone = phoneField.value.trim();
  const role = mode === 'edit' ? roleField.value || 'member' : 'member';
  const password = passwordField.value;
  if (!name || !email || !phone || (mode !== 'edit' && !password)) {
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
      const updated = updateUserProfile(targetId, { name, email, role, phone });
      if (password) {
        setUserPassword(targetId, password);
      }
      announceTo(feedback, t('auth.profile.userUpdated', { name: updated.name }));
    } else {
      register({ name, email, password, role, phone }, { autoLogin: false });
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
    } else if (error.message === 'auth:owner-exists') {
      announceTo(feedback, t('auth.feedback.ownerExists'));
    } else if (error.message === 'auth:owner-required') {
      announceTo(feedback, t('auth.feedback.ownerRequired'));
    } else if (error.message === 'auth:missing-password') {
      announceTo(feedback, t('auth.feedback.required'));
    } else {
      announceTo(feedback, t('auth.feedback.generic'));
    }
  }

  if (passwordToggleRefreshers.length) {
    onLanguageChange(() => {
      passwordToggleRefreshers.forEach(renderState => {
        renderState();
      });
    });
  }
}

function handleOwnershipTransfer(user) {
  if (!userManagementControls) return;
  const { feedback } = userManagementControls;
  const confirmation = window.confirm(t('auth.profile.transferConfirm', { name: user.name }));
  if (!confirmation) return;
  try {
    transferOwnership(user.id);
    announceTo(feedback, t('auth.profile.transferSuccess', { name: user.name }));
    scheduleFeedbackClear(feedback);
    renderUserManagementTable();
  } catch (error) {
    if (error.message === 'auth:user-not-found') {
      announceTo(feedback, t('auth.feedback.userNotFound'));
    } else if (error.message === 'auth:owner-required') {
      announceTo(feedback, t('auth.feedback.ownerRequired'));
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
    } else if (error.message === 'auth:owner-delete-forbidden') {
      announceTo(feedback, t('auth.profile.ownerDeleteBlocked'));
    } else {
      announceTo(feedback, t('auth.feedback.generic'));
    }
  }
}

function hasOwnerAccount() {
  try {
    return listUsers().some(user => user?.role === 'owner');
  } catch (error) {
    console.warn('auth: unable to determine owner availability', error);
    return false;
  }
}

function shouldAllowPublicRegistration() {
  try {
    return !hasOwnerAccount();
  } catch (error) {
    console.warn('auth: unable to determine registration availability', error);
    return true;
  }
}

function updateRegistrationAccess() {
  const allowRegistration = shouldAllowPublicRegistration();
  document.querySelectorAll('[data-register-guard]').forEach(node => {
    node.hidden = !allowRegistration;
  });
  refreshShellMiniApps(allowRegistration);
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
  if (message) {
    const existingTimeout = feedbackTimers.get(element);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      feedbackTimers.delete(element);
    }
  }
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

function notifyShellNavigation(targetWindow, payload) {
  if (!targetWindow || targetWindow === window) {
    return false;
  }
  let sameOrigin = false;
  try {
    sameOrigin = targetWindow.location?.origin === window.location.origin;
  } catch (error) {
    sameOrigin = false;
  }
  if (!sameOrigin) {
    return false;
  }
  try {
    targetWindow.postMessage(
      {
        type: SHELL_NAVIGATION_MESSAGE_TYPE,
        payload
      },
      window.location.origin
    );
    return true;
  } catch (error) {
    console.warn('app: unable to notify parent shell after navigation', error);
    return false;
  }
}

function navigateToShellHome({ feedbackMessage, highlight = true } = {}) {
  if (feedbackMessage) {
    storeDeferredFeedback(feedbackMessage);
  }
  const payload = {
    action: SHELL_NAVIGATION_ACTIONS.OPEN_HOME,
    highlight: highlight !== false
  };
  let notifiedParent = false;
  if (window.parent && window.parent !== window) {
    notifiedParent = notifyShellNavigation(window.parent, payload);
  }
  if (
    !notifiedParent &&
    window.top &&
    window.top !== window &&
    window.top !== window.parent
  ) {
    notifiedParent = notifyShellNavigation(window.top, payload);
  }
  if (!notifiedParent) {
    window.location.replace(SHELL_HOME_URL.href);
  }
}

