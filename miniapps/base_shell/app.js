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

const LANG_RESOURCES = [
  { lang: 'pt-BR', file: 'pt-br.json', labelKey: 'lang.pt' },
  { lang: 'en-US', file: 'en-us.json', labelKey: 'lang.en' },
  { lang: 'es-419', file: 'es-419.json', labelKey: 'lang.es' }
];

const THEME_OPTIONS = [
  { value: 'light', labelKey: 'theme.light' },
  { value: 'dark', labelKey: 'theme.dark' },
  { value: 'system', labelKey: 'theme.system' }
];

let activeMenu = null;

bootstrap();

async function bootstrap() {
  await loadDictionaries();
  const initialLang = initI18n('pt-BR');
  document.documentElement.lang = initialLang;
  applyTranslations();
  initTheme(getTheme().mode);
  updateLanguageButton();
  updateThemeButton();
  updateUserDisplay(currentUser());
  updateProfileView(currentUser());
  setupSidebar();
  setupLanguageMenu();
  setupThemeMenu();
  setupUserMenu();
  setupAuthForms();
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
  onLanguageChange(lang => {
    document.documentElement.lang = lang;
    applyTranslations();
    updateLanguageButton();
    refreshLanguageMenu();
    refreshThemeMenu();
    refreshUserMenu();
  });
  onThemeChange(() => {
    updateThemeButton();
  });
  onAuthChange(user => {
    updateUserDisplay(user);
    updateProfileView(user);
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
    const message = t(key);
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
    });
  });
}

function setupLanguageMenu() {
  const button = document.getElementById('btnLang');
  if (!button) return;
  const menu = ensureMenu('lang-menu', button);
  button.addEventListener('click', event => {
    event.stopPropagation();
    toggleMenu(button, menu, renderLanguageMenu);
  });
}

function renderLanguageMenu(menu) {
  menu.innerHTML = '';
  const current = getLang();
  LANG_RESOURCES.forEach(resource => {
    const item = document.createElement('li');
    const option = document.createElement('button');
    option.type = 'button';
    option.textContent = t(resource.labelKey);
    option.dataset.lang = resource.lang;
    if (resource.lang === current) {
      option.setAttribute('aria-current', 'true');
    }
    option.addEventListener('click', () => {
      setLang(resource.lang);
      closeActiveMenu();
    });
    item.appendChild(option);
    menu.appendChild(item);
  });
}

function refreshLanguageMenu() {
  const menu = document.getElementById('lang-menu');
  if (menu) {
    renderLanguageMenu(menu);
  }
}

function setupThemeMenu() {
  const button = document.getElementById('btnTheme');
  if (!button) return;
  const menu = ensureMenu('theme-menu', button);
  button.addEventListener('click', event => {
    event.stopPropagation();
    toggleMenu(button, menu, renderThemeMenu);
  });
}

function renderThemeMenu(menu) {
  menu.innerHTML = '';
  const current = getTheme().mode;
  THEME_OPTIONS.forEach(option => {
    const item = document.createElement('li');
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = t(option.labelKey);
    control.dataset.theme = option.value;
    if (option.value === current) {
      control.setAttribute('aria-current', 'true');
    }
    control.addEventListener('click', () => {
      setTheme(option.value);
      closeActiveMenu();
    });
    item.appendChild(control);
    menu.appendChild(item);
  });
}

function refreshThemeMenu() {
  const menu = document.getElementById('theme-menu');
  if (menu) {
    renderThemeMenu(menu);
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
    window.location.href = new URL('../auth/profile.html', window.location.href);
  }
  if (action === 'logout') {
    logout();
    announce(t('actions.logout'));
    closeActiveMenu();
  }
}

function updateLanguageButton() {
  const button = document.querySelector('#btnLang span');
  if (!button) return;
  const current = getLang();
  const resource = LANG_RESOURCES.find(item => item.lang === current);
  button.textContent = resource ? t(resource.labelKey) : current;
}

function updateThemeButton() {
  const button = document.querySelector('#btnTheme span');
  if (!button) return;
  const current = getTheme().mode;
  const option = THEME_OPTIONS.find(item => item.value === current);
  button.textContent = option ? t(option.labelKey) : current;
}

function ensureMenu(id, button) {
  let menu = document.getElementById(id);
  if (!menu) {
    menu = document.createElement('ul');
    menu.id = id;
    menu.className = 'menu';
    menu.hidden = true;
    button.insertAdjacentElement('afterend', menu);
  }
  return menu;
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
  if (!activeMenu) return;
  const { button, menu } = activeMenu;
  if (button.contains(event.target) || menu.contains(event.target)) return;
  closeActiveMenu();
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
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
