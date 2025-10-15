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
  onAuthChange,
  updateUserProfile,
  changePassword,
  deleteUser
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

const USER_PANEL_URL = new URL('./auth/profile.html', import.meta.url);
const HOME_URL = new URL('./index.html', import.meta.url);
const HOME_REDIRECT_DELAY = 500;

const FEEDBACK_CLEAR_DELAY = 3000;
const feedbackTimers = new WeakMap();

let revisionInfo = null;
let activeMenu = null;
let settingsMenuControls = null;
let isRedirectingHome = false;

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
  setupSettingsMenu();
  setupUserMenu();
  setupAuthForms();
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
  onLanguageChange(lang => {
    document.documentElement.lang = lang;
    updateRevisionMetadata();
    applyTranslations();
    updateLanguageToggle();
    updateThemeToggle();
    updateUserPanelShortcut();
    refreshUserMenu();
  });
  onThemeChange(() => {
    updateThemeToggle();
  });
  onAuthChange(user => {
    updateUserDisplay(user);
    updateProfileView(user);
    updateUserPanelShortcut();
    refreshUserMenu();
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
    closeActiveMenu();
    announce(t('actions.logout'));
    performLogout();
  }
}

function performLogout() {
  isRedirectingHome = true;
  logout();
  window.setTimeout(() => {
    window.location.href = HOME_URL.href;
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
    const loginUrl = new URL('./auth/login.html', import.meta.url);
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
          window.location.href = loginUrl.href;
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
}

function announce(message) {
  const feedback = document.querySelector('.feedback');
  announceTo(feedback, message);
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
