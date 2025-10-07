import {
  loadState as loadPersistedState,
  saveState as persistState,
} from './storage/indexeddb.js';

(function () {
  const THEME_STORAGE_KEY = 'marco-appbase:theme';
  const FEEDBACK_TIMEOUT = 2200;
  const BUTTON_FEEDBACK_DURATION = 900;
  const BUTTON_FEEDBACK_CLASS = 'ac-feedback-active';
  const VALID_HISTORY_TYPES = ['login', 'logout', 'locale'];
  const THEMES = { LIGHT: 'light', DARK: 'dark' };
  const DEFAULT_TITLE_KEY = 'app.document.title.default';
  const TITLE_WITH_USER_KEY = 'app.document.title.user';
  const PANEL_ACCESS_LABEL_KEYS = {
    open: 'app.header.panel.trigger.open',
    close: 'app.header.panel.trigger.close',
  };
  const BRAND_ICONS = {
    [THEMES.LIGHT]: '../assets/app/brand/icon-light-500.png',
    [THEMES.DARK]: '../assets/app/brand/icon-dark-500.png',
  };
  const THEME_ICONS = { [THEMES.LIGHT]: '☀️', [THEMES.DARK]: '🌙' };
  const THEME_LABEL_KEYS = {
    [THEMES.LIGHT]: 'app.header.theme.light',
    [THEMES.DARK]: 'app.header.theme.dark',
  };
  const FULLSCREEN_LABEL_KEYS = {
    enter: 'app.header.fullscreen.enter',
    exit: 'app.header.fullscreen.exit',
  };
  const FULLSCREEN_ICONS = { enter: '⛶', exit: '🡼' };
  const FULLSCREEN_MESSAGE_KEYS = {
    unsupported: 'app.header.fullscreen.unsupported',
    failure: 'app.header.fullscreen.failure',
  };
  const STAGE_CLOSE_LABEL_KEY = 'app.panel.stage.close';
  const STAGE_EMPTY_KEYS = {
    empty: 'app.stage.empty.default',
    return: 'app.stage.empty.return',
  };
  const SUMMARY_EMPTY_KEY = 'app.panel.summary.empty';
  const PANEL_STATUS_LABEL_KEYS = {
    connected: 'app.panel.kpis.status.states.connected',
    disconnected: 'app.panel.kpis.status.states.disconnected',
  };
  const PANEL_STATUS_HINT_KEYS = {
    empty: 'app.panel.kpis.status.hint.empty',
    inactive: 'app.panel.kpis.status.hint.inactive',
    active: 'app.panel.kpis.status.hint.active',
  };
  const PANEL_LAST_LOGIN_HINT_KEYS = {
    empty: 'app.panel.kpis.last_login.hint.empty',
    inactive: 'app.panel.kpis.last_login.hint.inactive',
    active: 'app.panel.kpis.last_login.hint.active',
  };
  const PANEL_EVENTS_HINT_KEYS = {
    empty: 'app.panel.kpis.events.hint.empty',
    single: 'app.panel.kpis.events.hint.single',
    multiple: 'app.panel.kpis.events.hint.multiple',
  };
  const HISTORY_EMPTY_KEY = 'app.history.empty';
  const HISTORY_EVENT_KEYS = {
    login: 'app.history.event.login',
    logout: 'app.history.event.logout',
    logoutPreserve: 'app.history.event.logout_preserve',
    logoutClear: 'app.history.event.logout_clear',
    locale: 'app.history.event.locale_change',
  };
  const LOCALE_NAME_FALLBACKS = {
    'pt-BR': 'Brasil · Português',
    'en-US': 'Estados Unidos · Inglês',
    'es-ES': 'Espanha · Espanhol',
  };
  const FOOTER_STATUS_KEYS = {
    connected: 'app.footer.status.connected',
    disconnected: 'app.footer.status.disconnected',
  };
  const FOOTER_STATUS_LABEL_KEY = 'app.footer.status.label';
  const FOOTER_DIRTY_KEYS = {
    clean: 'app.footer.dirty.clean',
    dirty: 'app.footer.dirty.dirty',
    disabled: 'app.footer.dirty.disabled',
  };
  const FOOTER_DIRTY_LABEL_KEY = 'app.footer.dirty.label';
  const SESSION_ACTIONS_LABEL_KEY = 'app.panel.session.actions.label';
  const RAIL_LABEL_KEY = 'app.rail.label';
  const PANEL_KPIS_GROUP_LABEL_KEY = 'app.panel.kpis.group_label';
  const LOGIN_ERROR_FEEDBACK_KEY = 'app.panel.form.feedback.error';
  const LOGIN_SUCCESS_FEEDBACK_KEY = 'app.panel.form.feedback.success';
  const LOGIN_PHONE_INVALID_FEEDBACK_KEY = 'app.panel.form.feedback.phone_invalid';
  const LOGIN_PASSWORD_MISSING_FEEDBACK_KEY =
    'app.panel.form.feedback.password_missing';
  const FORM_PHONE_PLACEHOLDER_KEY = 'app.panel.form.fields.phone_placeholder';
  const PASSWORD_TOGGLE_LABEL_KEYS = {
    show: 'app.panel.form.fields.password_toggle.show',
    hide: 'app.panel.form.fields.password_toggle.hide',
  };
  const STAGE_PANEL_OPEN_CLASS = 'ac-stage--panel-open';
  const PHONE_MAX_LENGTH = 11;
  const PASSWORD_TOGGLE_ICONS = { show: '👁', hide: '🙈' };

  const FALLBACKS = {
    [DEFAULT_TITLE_KEY]: 'Projeto Marco — AppBase',
    [TITLE_WITH_USER_KEY]: 'Projeto Marco — {{user}}',
    [PANEL_ACCESS_LABEL_KEYS.open]: 'Abrir painel do usuário',
    [PANEL_ACCESS_LABEL_KEYS.close]: 'Fechar painel do usuário',
    [THEME_LABEL_KEYS[THEMES.LIGHT]]: 'Ativar modo escuro',
    [THEME_LABEL_KEYS[THEMES.DARK]]: 'Ativar modo claro',
    [FULLSCREEN_LABEL_KEYS.enter]: 'Ativar tela cheia',
    [FULLSCREEN_LABEL_KEYS.exit]: 'Sair da tela cheia',
    [FULLSCREEN_MESSAGE_KEYS.unsupported]:
      'Tela cheia não é suportada neste navegador.',
    [FULLSCREEN_MESSAGE_KEYS.failure]:
      'Não foi possível alternar o modo de tela cheia. Verifique as permissões do navegador.',
    [STAGE_CLOSE_LABEL_KEY]: 'Fechar painel de controle',
    [STAGE_EMPTY_KEYS.empty]:
      'Nenhum usuário cadastrado. Abra o painel pelo cabeçalho para iniciar o cadastro.',
    [STAGE_EMPTY_KEYS.return]: 'Sessão encerrada. Acesse novamente para visualizar o painel.',
    [SUMMARY_EMPTY_KEY]: 'Não configurado',
    [PANEL_STATUS_LABEL_KEYS.connected]: 'Conectado',
    [PANEL_STATUS_LABEL_KEYS.disconnected]: 'Desconectado',
    [PANEL_STATUS_HINT_KEYS.empty]: 'Cadastre um usuário para iniciar a sessão.',
    [PANEL_STATUS_HINT_KEYS.inactive]: 'Sessão encerrada. Abra o painel e salve para retomar.',
    [PANEL_STATUS_HINT_KEYS.active]: 'Sessão ativa neste navegador.',
    [PANEL_LAST_LOGIN_HINT_KEYS.empty]: 'Nenhum registro disponível.',
    [PANEL_LAST_LOGIN_HINT_KEYS.inactive]: 'Último acesso registrado localmente.',
    [PANEL_LAST_LOGIN_HINT_KEYS.active]: 'Atualizado automaticamente após o login.',
    [PANEL_EVENTS_HINT_KEYS.empty]: 'Aguardando primeiro registro.',
    [PANEL_EVENTS_HINT_KEYS.single]: '1 evento armazenado neste dispositivo.',
    [PANEL_EVENTS_HINT_KEYS.multiple]: '{{count}} eventos armazenados neste dispositivo.',
    [HISTORY_EMPTY_KEY]: 'Sem registros.',
    [HISTORY_EVENT_KEYS.login]: 'Login realizado',
    [HISTORY_EVENT_KEYS.logout]: 'Logoff',
    [HISTORY_EVENT_KEYS.logoutPreserve]: 'Logoff (dados mantidos)',
    [HISTORY_EVENT_KEYS.logoutClear]: 'Logoff (dados removidos)',
    [HISTORY_EVENT_KEYS.locale]: 'Idioma alterado para {{locale}}',
    'app.locale.menu.title': 'Idioma do AppBase',
    'app.locale.menu.options.pt-BR': 'Brasil · Português',
    'app.locale.menu.options.en-US': 'Estados Unidos · Inglês',
    'app.locale.menu.options.es-ES': 'Espanha · Espanhol',
    [FOOTER_STATUS_KEYS.connected]: 'Conectado',
    [FOOTER_STATUS_KEYS.disconnected]: 'Desconectado',
    [FOOTER_STATUS_LABEL_KEY]: 'Status:',
    [FOOTER_DIRTY_LABEL_KEY]: 'Alterações:',
    [FOOTER_DIRTY_KEYS.clean]: 'Sincronizado',
    [FOOTER_DIRTY_KEYS.dirty]: 'Alterações pendentes',
    [FOOTER_DIRTY_KEYS.disabled]: 'Indisponível offline',
    [SESSION_ACTIONS_LABEL_KEY]: 'Ações da sessão',
    [RAIL_LABEL_KEY]: 'Miniapps',
    [PANEL_KPIS_GROUP_LABEL_KEY]: 'Indicadores do painel',
    [LOGIN_ERROR_FEEDBACK_KEY]: 'Informe nome e e-mail para continuar.',
    [LOGIN_SUCCESS_FEEDBACK_KEY]: 'Cadastro atualizado com sucesso.',
    [LOGIN_PHONE_INVALID_FEEDBACK_KEY]:
      'Informe um telefone brasileiro com 10 ou 11 dígitos.',
    [LOGIN_PASSWORD_MISSING_FEEDBACK_KEY]: 'Informe uma senha para continuar.',
    [FORM_PHONE_PLACEHOLDER_KEY]: '(99) 99999-9999',
    [PASSWORD_TOGGLE_LABEL_KEYS.show]: 'Mostrar senha',
    [PASSWORD_TOGGLE_LABEL_KEYS.hide]: 'Ocultar senha',
  };

  const elements = {
    stageShell: document.querySelector('[data-stage-shell]'),
    railShell: document.querySelector('.ac-rail-shell'),
    stage: document.getElementById('painel-stage'),
    stageTitle: document.getElementById('painel-stage-title'),
    stageClose: document.querySelector('[data-stage-close]'),
    stageEmpty: document.querySelector('[data-stage-empty]'),
    stageEmptyMessage: document.querySelector('[data-stage-empty-message]'),
    loginUser: document.querySelector('[data-login-user]'),
    loginAccount: document.querySelector('[data-login-account]'),
    loginLast: document.querySelector('[data-login-last]'),
    loginForm: document.querySelector('[data-login-form]'),
    feedback: document.querySelector('[data-login-feedback]'),
    panelStatusDot: document.querySelector('[data-panel-status-dot]'),
    panelStatusLabel: document.querySelector('[data-panel-status-label]'),
    panelStatusHint: document.querySelector('[data-panel-status-hint]'),
    panelLastLogin: document.querySelector('[data-panel-last-login]'),
    panelLastLoginHint: document.querySelector('[data-panel-last-login-hint]'),
    panelLoginCount: document.querySelector('[data-panel-login-count]'),
    panelLoginHint: document.querySelector('[data-panel-login-hint]'),
    panelKpisGroup: document.querySelector('[data-panel-kpis-group]'),
    logTableWrap: document.querySelector('[data-login-log-table]'),
    logTableBody: document.querySelector('[data-login-log-body]'),
    logEmpty: Array.from(document.querySelectorAll('[data-login-log-empty]')),
    logoutButton: document.querySelector('[data-action="logout-preserve"]'),
    logoutClearButton: document.querySelector('[data-action="logout-clear"]'),
    sessionActions: document.querySelector('[data-session-actions]'),
    themeToggle: document.querySelector('[data-theme-toggle]'),
    themeToggleIcon: document.querySelector('[data-theme-toggle-icon]'),
    fullscreenToggle: document.querySelector('[data-fullscreen-toggle]'),
    fullscreenToggleIcon: document.querySelector('[data-fullscreen-toggle-icon]'),
    panelAccess: document.querySelector('[data-panel-access]'),
    brandIcon: document.querySelector('[data-brand-icon]'),
    footerStatusText: document.querySelector('[data-footer-status-text]'),
    footerStatusDot: document.querySelector('[data-footer-status-dot]'),
    footerStatusLabel: document.querySelector('[data-footer-status-label]'),
    footerDirtyText: document.querySelector('[data-footer-dirty-text]'),
    footerDirtyDot: document.querySelector('[data-footer-dirty-dot]'),
    footerDirtyLabel: document.querySelector('[data-footer-dirty-label]'),
    footerDirtyStatus: document.querySelector('[data-footer-dirty-status]'),
    phoneInput: document.querySelector('[data-phone-input]'),
    passwordInput: document.querySelector('[data-password-input]'),
    passwordToggle: document.querySelector('[data-password-toggle]'),
    passwordToggleIcon: document.querySelector('[data-password-toggle-icon]'),
  };

  function fallbackFor(key, defaultValue = '') {
    if (key && Object.prototype.hasOwnProperty.call(FALLBACKS, key)) {
      return FALLBACKS[key];
    }
    return defaultValue;
  }

  function translate(key, fallback) {
    if (!key) {
      return typeof fallback === 'string' ? fallback : '';
    }
    const resolvedFallback =
      typeof fallback === 'string' && fallback ? fallback : fallbackFor(key, '');
    if (window.AppBaseI18n && typeof window.AppBaseI18n.translate === 'function') {
      const value = window.AppBaseI18n.translate(key);
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
    const fallbackElement = document.querySelector(`[data-i18n="${key}"]`);
    if (fallbackElement) {
      const text = fallbackElement.textContent.trim();
      if (text) {
        return text;
      }
    }
    return resolvedFallback;
  }

  function formatMessage(template, replacements = {}) {
    if (typeof template !== 'string' || !template) {
      return '';
    }
    return Object.keys(replacements).reduce((accumulator, placeholder) => {
      const value = replacements[placeholder];
      const pattern = new RegExp(`{{\\s*${placeholder}\\s*}}`, 'g');
      return accumulator.replace(pattern, value);
    }, template);
  }

  function sanitisePhoneDigits(value) {
    return String(value || '')
      .replace(/\D+/g, '')
      .slice(0, PHONE_MAX_LENGTH);
  }

  function formatPhoneDigits(value) {
    const digits = sanitisePhoneDigits(value);
    if (!digits) {
      return '';
    }
    if (digits.length <= 2) {
      return `(${digits}`;
    }
    const area = digits.slice(0, 2);
    if (digits.length <= 6) {
      return `(${area}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
      const middle = digits.slice(2, digits.length - 4);
      const last = digits.slice(-4);
      return `(${area}) ${middle}-${last}`;
    }
    const middle = digits.slice(2, 7);
    const last = digits.slice(7, 11);
    return `(${area}) ${middle}-${last}`;
  }

  function isValidPhoneDigits(digits) {
    const numeric = sanitisePhoneDigits(digits);
    return numeric.length === 0 || numeric.length === 10 || numeric.length === 11;
  }

  function applyPhoneMaskToInput(input, digits) {
    if (!input) {
      return;
    }
    const numeric =
      typeof digits === 'string' ? sanitisePhoneDigits(digits) : sanitisePhoneDigits(input.value);
    const formatted = formatPhoneDigits(numeric);
    if (input.value !== formatted) {
      const cursorPosition = formatted.length;
      input.value = formatted;
      if (typeof input.setSelectionRange === 'function') {
        try {
          input.setSelectionRange(cursorPosition, cursorPosition);
        } catch (error) {
          // Alguns navegadores podem lançar se o campo não estiver focado.
        }
      }
    }
  }

  function updatePasswordToggle() {
    if (!elements.passwordToggle) {
      return;
    }
    const key = passwordVisible
      ? PASSWORD_TOGGLE_LABEL_KEYS.hide
      : PASSWORD_TOGGLE_LABEL_KEYS.show;
    const label = translate(key, fallbackFor(key));
    elements.passwordToggle.setAttribute('aria-label', label);
    elements.passwordToggle.setAttribute('title', label);
    elements.passwordToggle.setAttribute('aria-pressed', passwordVisible ? 'true' : 'false');
    if (elements.passwordToggleIcon) {
      const icon = passwordVisible
        ? PASSWORD_TOGGLE_ICONS.hide
        : PASSWORD_TOGGLE_ICONS.show;
      elements.passwordToggleIcon.textContent = icon;
    }
  }

  function setPasswordVisibility(visible) {
    passwordVisible = Boolean(visible);
    if (elements.passwordInput) {
      elements.passwordInput.setAttribute('type', passwordVisible ? 'text' : 'password');
    }
    updatePasswordToggle();
  }

  function togglePasswordVisibility() {
    setPasswordVisibility(!passwordVisible);
  }

  function setElementTextFromKey(element, key, options = {}) {
    if (!element) {
      return;
    }
    if (!key) {
      element.removeAttribute('data-i18n');
      return;
    }
    const { fallbackKey = key, replacements = {} } = options;
    element.setAttribute('data-i18n', key);
    const fallback = fallbackFor(fallbackKey, '');
    const template = translate(key, fallback);
    const value = formatMessage(template || fallback, replacements) || fallback;
    element.textContent = value;
  }

  function clearElementTranslation(element, text = '') {
    if (!element) {
      return;
    }
    element.removeAttribute('data-i18n');
    element.textContent = text;
  }

  let currentTheme = normaliseTheme(resolveInitialTheme());
  let state = getEmptyState();
  let panelOpen = false;
  let stateDirty = false;
  let feedbackTimer = null;
  let fullscreenSupported = isFullscreenSupported();
  let fullscreenActive = isFullscreenActive();
  let fullscreenNotice = '';
  const buttonFeedbackTimers = new WeakMap();
  let passwordVisible = false;
  let localeSyncInitialised = false;
  let lastLocaleSeen = null;

  function canUseStorage() {
    try {
      return typeof window !== 'undefined' && 'localStorage' in window;
    } catch (error) {
      return false;
    }
  }

  function normaliseTheme(theme) {
    return theme === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT;
  }

  function loadThemePreference() {
    if (!canUseStorage()) {
      return null;
    }
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === THEMES.DARK || stored === THEMES.LIGHT) {
        return stored;
      }
      return null;
    } catch (error) {
      console.warn('AppBase: falha ao carregar tema persistido', error);
      return null;
    }
  }

  function saveThemePreference(theme) {
    if (!canUseStorage()) {
      return;
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('AppBase: falha ao salvar tema persistido', error);
    }
  }

  function resolveInitialTheme() {
    const stored = loadThemePreference();
    if (stored) {
      return stored;
    }
    return detectSystemTheme();
  }

  function detectSystemTheme() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return THEMES.LIGHT;
    }
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? THEMES.DARK
        : THEMES.LIGHT;
    } catch (error) {
      return THEMES.LIGHT;
    }
  }

  function setTheme(theme, { persist = true } = {}) {
    const nextTheme = normaliseTheme(theme);
    currentTheme = nextTheme;
    document.documentElement.setAttribute('data-theme', nextTheme);
    updateThemeAssets(nextTheme);
    if (persist) {
      saveThemePreference(nextTheme);
    }
  }

  function updateThemeAssets(theme) {
    updateBrandIcon(theme);
    updateThemeToggle(theme);
  }

  function applyButtonFeedback(button, duration = BUTTON_FEEDBACK_DURATION) {
    if (!button || typeof window === 'undefined') {
      return;
    }
    const existingTimer = buttonFeedbackTimers.get(button);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      buttonFeedbackTimers.delete(button);
    }
    button.classList.add(BUTTON_FEEDBACK_CLASS);
    const timer = window.setTimeout(() => {
      button.classList.remove(BUTTON_FEEDBACK_CLASS);
      buttonFeedbackTimers.delete(button);
    }, duration);
    buttonFeedbackTimers.set(button, timer);
  }

  function updateBrandIcon(theme) {
    if (!elements.brandIcon) {
      return;
    }
    const source = BRAND_ICONS[theme] || BRAND_ICONS[THEMES.LIGHT];
    if (elements.brandIcon.getAttribute('src') !== source) {
      elements.brandIcon.setAttribute('src', source);
    }
  }

  function updateThemeToggle(theme) {
    if (!elements.themeToggle) {
      return;
    }
    const isDark = theme === THEMES.DARK;
    const labelKey = THEME_LABEL_KEYS[theme] || THEME_LABEL_KEYS[THEMES.LIGHT];
    const label = translate(labelKey, fallbackFor(labelKey));
    const icon = THEME_ICONS[theme] || THEME_ICONS[THEMES.LIGHT];
    elements.themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    elements.themeToggle.setAttribute('aria-label', label);
    elements.themeToggle.setAttribute('title', label);
    if (elements.themeToggleIcon) {
      elements.themeToggleIcon.textContent = icon;
    }
  }

  function getFullscreenTarget() {
    if (typeof document === 'undefined') {
      return null;
    }
    return (
      document.querySelector('.ac-app') ||
      document.documentElement ||
      document.body ||
      null
    );
  }

  function getFullscreenElement() {
    if (typeof document === 'undefined') {
      return null;
    }
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    );
  }

  function isFullscreenSupported() {
    if (typeof document === 'undefined') {
      return false;
    }
    const target = getFullscreenTarget();
    if (!target) {
      return false;
    }
    const request =
      target.requestFullscreen ||
      target.webkitRequestFullscreen ||
      target.mozRequestFullScreen ||
      target.msRequestFullscreen;
    const enabled =
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled;
    return Boolean(request && (enabled === undefined || enabled));
  }

  function isFullscreenActive() {
    return Boolean(getFullscreenElement());
  }

  function enterFullscreen(target = getFullscreenTarget()) {
    if (!target) {
      return Promise.reject(new Error('Elemento inválido.'));
    }
    const request =
      target.requestFullscreen ||
      target.webkitRequestFullscreen ||
      target.mozRequestFullScreen ||
      target.msRequestFullscreen;
    if (typeof request !== 'function') {
      return Promise.reject(new Error('Fullscreen API indisponível.'));
    }
    try {
      const result = request.call(target);
      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function exitFullscreen() {
    if (typeof document === 'undefined') {
      return Promise.reject(new Error('Fullscreen API indisponível.'));
    }
    const exit =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen;
    if (typeof exit !== 'function') {
      return Promise.reject(new Error('Fullscreen API indisponível.'));
    }
    try {
      const result = exit.call(document);
      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function notifyFullscreenIssue(message, { announce = false } = {}) {
    if (!message) {
      return;
    }
    if (message !== fullscreenNotice) {
      fullscreenNotice = message;
      if (announce && typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      } else {
        console.warn('AppBase:', message);
      }
    } else if (announce) {
      console.warn('AppBase:', message);
    }
  }

  function hideFullscreenToggle(message) {
    if (!elements.fullscreenToggle) {
      return;
    }
    elements.fullscreenToggle.hidden = true;
    elements.fullscreenToggle.setAttribute('aria-hidden', 'true');
    elements.fullscreenToggle.setAttribute('disabled', 'true');
    if (message) {
      elements.fullscreenToggle.setAttribute('title', message);
    }
  }

  function showFullscreenToggle() {
    if (!elements.fullscreenToggle) {
      return;
    }
    elements.fullscreenToggle.hidden = false;
    elements.fullscreenToggle.removeAttribute('aria-hidden');
    elements.fullscreenToggle.removeAttribute('disabled');
  }

  function updateFullscreenToggle(active = fullscreenActive) {
    if (!elements.fullscreenToggle) {
      return;
    }
    const mode = active ? 'exit' : 'enter';
    const labelKey = FULLSCREEN_LABEL_KEYS[mode];
    const label = translate(labelKey, fallbackFor(labelKey));
    elements.fullscreenToggle.setAttribute('aria-pressed', active ? 'true' : 'false');
    elements.fullscreenToggle.setAttribute('aria-label', label);
    elements.fullscreenToggle.setAttribute('title', label);
    if (elements.fullscreenToggleIcon) {
      const icon = FULLSCREEN_ICONS[mode] || FULLSCREEN_ICONS.enter;
      elements.fullscreenToggleIcon.textContent = icon;
    }
  }

  function syncFullscreenStateFromDocument() {
    fullscreenActive = isFullscreenActive();
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('is-fullscreen', fullscreenActive);
    }
    updateFullscreenToggle(fullscreenActive);
  }

  function initialiseFullscreenToggle() {
    if (!elements.fullscreenToggle) {
      return;
    }
    fullscreenSupported = isFullscreenSupported();
    if (!fullscreenSupported) {
      const message = translate(
        FULLSCREEN_MESSAGE_KEYS.unsupported,
        fallbackFor(FULLSCREEN_MESSAGE_KEYS.unsupported)
      );
      hideFullscreenToggle(message);
      notifyFullscreenIssue(message);
      return;
    }
    showFullscreenToggle();
    syncFullscreenStateFromDocument();
  }

  function handleFullscreenToggle(event) {
    event.preventDefault();
    applyButtonFeedback(event.currentTarget);
    if (!fullscreenSupported) {
      const unsupportedMessage = translate(
        FULLSCREEN_MESSAGE_KEYS.unsupported,
        fallbackFor(FULLSCREEN_MESSAGE_KEYS.unsupported)
      );
      notifyFullscreenIssue(unsupportedMessage, { announce: true });
      hideFullscreenToggle(unsupportedMessage);
      return;
    }
    const target = getFullscreenTarget();
    const togglePromise = fullscreenActive
      ? exitFullscreen()
      : enterFullscreen(target);
    Promise.resolve(togglePromise)
      .then(() => {
        syncFullscreenStateFromDocument();
      })
      .catch((error) => {
        console.warn('AppBase: falha ao alternar tela cheia', error);
        const failureMessage = translate(
          FULLSCREEN_MESSAGE_KEYS.failure,
          fallbackFor(FULLSCREEN_MESSAGE_KEYS.failure)
        );
        notifyFullscreenIssue(failureMessage, { announce: true });
        fullscreenSupported = false;
        hideFullscreenToggle(failureMessage);
        syncFullscreenStateFromDocument();
      });
  }

  function handleFullscreenError(event) {
    console.warn('AppBase: erro de tela cheia', event);
    const failureMessage = translate(
      FULLSCREEN_MESSAGE_KEYS.failure,
      fallbackFor(FULLSCREEN_MESSAGE_KEYS.failure)
    );
    notifyFullscreenIssue(failureMessage);
    fullscreenSupported = false;
    hideFullscreenToggle(failureMessage);
    syncFullscreenStateFromDocument();
  }

  function getEmptyState() {
    return {
      user: null,
      lastLogin: '',
      sessionActive: false,
      history: [],
    };
  }

  function normaliseState(raw) {
    const base = getEmptyState();
    if (!raw || typeof raw !== 'object') {
      return base;
    }
    const user = normaliseUser(raw.user);
    const lastLogin =
      typeof raw.lastLogin === 'string' && raw.lastLogin.trim()
        ? raw.lastLogin
        : '';
    const history = normaliseHistory(raw.history);
    const sessionActive = Boolean(raw.sessionActive) && Boolean(user);
    return { user, lastLogin, history, sessionActive };
  }

  function normaliseUser(rawUser) {
    if (!rawUser || typeof rawUser !== 'object') {
      return null;
    }
    const nomeCompleto =
      typeof rawUser.nomeCompleto === 'string'
        ? rawUser.nomeCompleto.trim()
        : '';
    const email =
      typeof rawUser.email === 'string' ? rawUser.email.trim() : '';
    const telefone = sanitisePhoneDigits(rawUser.telefone);
    const senha =
      typeof rawUser.senha === 'string'
        ? rawUser.senha
        : '';

    if (!nomeCompleto && !email && !telefone && !senha) {
      return null;
    }

    return { nomeCompleto, email, telefone, senha };
  }

  function normaliseHistory(rawHistory) {
    if (!Array.isArray(rawHistory)) {
      return [];
    }
    return rawHistory
      .map((entry) => normaliseHistoryEntry(entry))
      .filter(Boolean)
      .sort((a, b) => {
        if (a.timestamp === b.timestamp) {
          return 0;
        }
        return a.timestamp > b.timestamp ? -1 : 1;
      });
  }

  function normaliseHistoryEntry(rawEntry) {
    if (!rawEntry || typeof rawEntry !== 'object') {
      return null;
    }
    const type = VALID_HISTORY_TYPES.includes(rawEntry.type)
      ? rawEntry.type
      : null;
    const timestamp =
      typeof rawEntry.timestamp === 'string' && rawEntry.timestamp.trim()
        ? rawEntry.timestamp
        : '';
    if (!type || !timestamp) {
      return null;
    }
    const mode = rawEntry.mode === 'preserve' || rawEntry.mode === 'clear'
      ? rawEntry.mode
      : undefined;
    const locale =
      typeof rawEntry.locale === 'string' && rawEntry.locale.trim()
        ? rawEntry.locale.trim()
        : '';
    const localeLabel =
      typeof rawEntry.localeLabel === 'string' && rawEntry.localeLabel.trim()
        ? rawEntry.localeLabel.trim()
        : '';
    const entry = mode ? { type, timestamp, mode } : { type, timestamp };
    if (locale) {
      entry.locale = locale;
    }
    if (localeLabel) {
      entry.localeLabel = localeLabel;
    }
    return entry;
  }

  function hasUser(currentState = state) {
    return Boolean(
      currentState.user &&
        (currentState.user.nomeCompleto || currentState.user.email)
    );
  }

  function isLoggedIn(currentState = state) {
    return hasUser(currentState) && Boolean(currentState.sessionActive);
  }

  function createHistoryEntry(type, options = {}) {
    if (!VALID_HISTORY_TYPES.includes(type)) {
      return null;
    }
    const base = {
      type,
      timestamp: options.timestamp && typeof options.timestamp === 'string'
        ? options.timestamp
        : nowIso(),
    };
    if (options.mode === 'preserve' || options.mode === 'clear') {
      base.mode = options.mode;
    }
    if (options.locale && typeof options.locale === 'string') {
      base.locale = options.locale;
    }
    if (options.localeLabel && typeof options.localeLabel === 'string') {
      base.localeLabel = options.localeLabel;
    }
    return normaliseHistoryEntry(base);
  }

  function recordLocaleHistory(locale) {
    if (!locale) {
      return false;
    }
    const historyEntry = createHistoryEntry('locale', {
      locale,
      localeLabel: getLocaleLabel(locale),
    });
    if (!historyEntry) {
      return false;
    }
    setState((previous) => ({
      ...previous,
      history: [historyEntry, ...(previous.history || [])],
    }));
    return true;
  }

  function getDisplayName(user) {
    if (!user) {
      return translate(SUMMARY_EMPTY_KEY, fallbackFor(SUMMARY_EMPTY_KEY));
    }
    if (user.nomeCompleto) {
      return user.nomeCompleto;
    }
    if (user.email) {
      const [account] = user.email.split('@');
      return account || user.email;
    }
    return translate(SUMMARY_EMPTY_KEY, fallbackFor(SUMMARY_EMPTY_KEY));
  }

  function getFirstName(user) {
    if (!user) {
      return translate(SUMMARY_EMPTY_KEY, fallbackFor(SUMMARY_EMPTY_KEY));
    }
    if (user.nomeCompleto) {
      const [first] = user.nomeCompleto.split(/\s+/);
      const trimmed = first ? first.trim() : '';
      return trimmed || translate(SUMMARY_EMPTY_KEY, fallbackFor(SUMMARY_EMPTY_KEY));
    }
    return getDisplayName(user);
  }

  function getAccount(user) {
    if (!user || !user.email) {
      return '—';
    }
    const [account] = user.email.split('@');
    return account ? account : '—';
  }

  function formatDateTime(iso) {
    if (!iso) {
      return '—';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    const locale =
      (window.AppBaseI18n && typeof window.AppBaseI18n.getLocale === 'function'
        ? window.AppBaseI18n.getLocale()
        : null) || 'pt-BR';
    try {
      return date.toLocaleString(locale, {
        hour12: false,
      });
    } catch (error) {
      return date.toLocaleString('pt-BR', { hour12: false });
    }
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function setState(updater) {
    const nextRaw = typeof updater === 'function' ? updater(state) : updater;
    const next = normaliseState({ ...state, ...nextRaw });
    state = next;
    stateDirty = false;
    passwordVisible = false;
    updateUI();
    return persistState(state)
      .catch((error) => {
        console.warn('AppBase: falha ao persistir dados', error);
      })
      .then(() => state);
  }

  function updateUI() {
    updateThemeAssets(currentTheme);
    updateFullscreenToggle(fullscreenActive);
    updateDocumentTitle();
    updatePanelAccessControl();
    updateAriaLabels();
    updateStatusSummary();
    updateStage();
    updateLoginFormFields();
    updateLogHistory();
    updateLogControls();
  }

  function updateDocumentTitle() {
    const baseTitle = translate(DEFAULT_TITLE_KEY, fallbackFor(DEFAULT_TITLE_KEY));
    if (isLoggedIn()) {
      const firstName = getFirstName(state.user);
      const template = translate(
        TITLE_WITH_USER_KEY,
        fallbackFor(TITLE_WITH_USER_KEY)
      );
      const personalised = formatMessage(template || baseTitle, {
        user: firstName || '',
      }).trim();
      document.title = personalised || baseTitle;
      return;
    }
    document.title = baseTitle;
  }

  function updatePanelAccessControl() {
    if (!elements.panelAccess) {
      return;
    }
    const expanded = Boolean(panelOpen);
    const labelKey = expanded
      ? PANEL_ACCESS_LABEL_KEYS.close
      : PANEL_ACCESS_LABEL_KEYS.open;
    const label = translate(labelKey, fallbackFor(labelKey));
    elements.panelAccess.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    elements.panelAccess.setAttribute('aria-label', label);
    elements.panelAccess.setAttribute('title', label);
  }

  function updateAriaLabels() {
    if (elements.railShell) {
      elements.railShell.setAttribute(
        'aria-label',
        translate(RAIL_LABEL_KEY, fallbackFor(RAIL_LABEL_KEY))
      );
    }
    if (elements.panelKpisGroup) {
      elements.panelKpisGroup.setAttribute(
        'aria-label',
        translate(PANEL_KPIS_GROUP_LABEL_KEY, fallbackFor(PANEL_KPIS_GROUP_LABEL_KEY))
      );
    }
    if (elements.sessionActions) {
      elements.sessionActions.setAttribute(
        'aria-label',
        translate(SESSION_ACTIONS_LABEL_KEY, fallbackFor(SESSION_ACTIONS_LABEL_KEY))
      );
    }
    if (elements.stageClose) {
      const label = translate(STAGE_CLOSE_LABEL_KEY, fallbackFor(STAGE_CLOSE_LABEL_KEY));
      elements.stageClose.setAttribute('aria-label', label);
      elements.stageClose.setAttribute('title', label);
    }
  }

  function updateStatusSummary() {
    const loggedIn = isLoggedIn();
    const dirtyDisabled = !loggedIn;
    if (elements.footerStatusText) {
      setElementTextFromKey(elements.footerStatusText, FOOTER_STATUS_LABEL_KEY);
    }
    if (elements.footerStatusDot) {
      elements.footerStatusDot.classList.toggle('ac-dot--ok', loggedIn);
      elements.footerStatusDot.classList.toggle('ac-dot--crit', !loggedIn);
    }
    if (elements.footerStatusLabel) {
      const statusKey = loggedIn
        ? FOOTER_STATUS_KEYS.connected
        : FOOTER_STATUS_KEYS.disconnected;
      setElementTextFromKey(elements.footerStatusLabel, statusKey);
    }
    if (elements.footerDirtyText) {
      setElementTextFromKey(elements.footerDirtyText, FOOTER_DIRTY_LABEL_KEY);
    }
    if (elements.footerDirtyStatus) {
      elements.footerDirtyStatus.setAttribute('aria-disabled', dirtyDisabled ? 'true' : 'false');
    }
    if (elements.footerDirtyDot) {
      elements.footerDirtyDot.classList.toggle('ac-dot--ok', !dirtyDisabled && !stateDirty);
      elements.footerDirtyDot.classList.toggle('ac-dot--warn', !dirtyDisabled && stateDirty);
      elements.footerDirtyDot.classList.toggle('ac-dot--idle', dirtyDisabled);
    }
    if (elements.footerDirtyLabel) {
      const dirtyKey = dirtyDisabled
        ? FOOTER_DIRTY_KEYS.disabled
        : stateDirty
        ? FOOTER_DIRTY_KEYS.dirty
        : FOOTER_DIRTY_KEYS.clean;
      setElementTextFromKey(elements.footerDirtyLabel, dirtyKey);
    }
  }

  function updateStage() {
    const hasData = hasUser();
    const loggedIn = isLoggedIn();

    if (elements.stageEmpty) {
      elements.stageEmpty.hidden = panelOpen;
    }

    if (elements.stageEmptyMessage) {
      const messageKey = hasData
        ? STAGE_EMPTY_KEYS.return
        : STAGE_EMPTY_KEYS.empty;
      setElementTextFromKey(elements.stageEmptyMessage, messageKey);
    }

    if (elements.stage) {
      elements.stage.hidden = !panelOpen;
    }

    if (elements.stageShell) {
      elements.stageShell.classList.toggle(STAGE_PANEL_OPEN_CLASS, panelOpen);
    }

    if (elements.loginUser) {
      if (hasData) {
        clearElementTranslation(elements.loginUser, getDisplayName(state.user));
      } else {
        setElementTextFromKey(elements.loginUser, SUMMARY_EMPTY_KEY);
      }
    }
    if (elements.loginAccount) {
      const account = hasData ? getAccount(state.user) : '—';
      clearElementTranslation(elements.loginAccount, account);
    }
    if (elements.loginLast) {
      const value = hasData ? formatDateTime(state.lastLogin) : '—';
      clearElementTranslation(elements.loginLast, value);
    }

    updatePanelIndicators({ hasData, loggedIn });
  }

  function getHistoryCount() {
    const history = Array.isArray(state.history) ? state.history : [];
    return history.length;
  }

  function updatePanelIndicators({ hasData = hasUser(), loggedIn = isLoggedIn() } = {}) {
    const historyCount = getHistoryCount();
    const lastLoginValue = hasData ? formatDateTime(state.lastLogin) : '—';

    if (elements.panelStatusDot) {
      elements.panelStatusDot.classList.toggle('ac-dot--ok', loggedIn);
      elements.panelStatusDot.classList.toggle('ac-dot--crit', !loggedIn && !hasData);
      elements.panelStatusDot.classList.toggle('ac-dot--warn', hasData && !loggedIn);
    }

    if (elements.panelStatusLabel) {
      const statusKey = loggedIn
        ? PANEL_STATUS_LABEL_KEYS.connected
        : PANEL_STATUS_LABEL_KEYS.disconnected;
      setElementTextFromKey(elements.panelStatusLabel, statusKey);
    }

    if (elements.panelStatusHint) {
      let hintKey = PANEL_STATUS_HINT_KEYS.empty;
      if (hasData && !loggedIn) {
        hintKey = PANEL_STATUS_HINT_KEYS.inactive;
      } else if (loggedIn) {
        hintKey = PANEL_STATUS_HINT_KEYS.active;
      }
      setElementTextFromKey(elements.panelStatusHint, hintKey);
    }

    if (elements.panelLastLogin) {
      clearElementTranslation(elements.panelLastLogin, hasData ? lastLoginValue : '—');
    }

    if (elements.panelLastLoginHint) {
      let hintKey = PANEL_LAST_LOGIN_HINT_KEYS.empty;
      if (hasData && !loggedIn) {
        hintKey = PANEL_LAST_LOGIN_HINT_KEYS.inactive;
      } else if (loggedIn) {
        hintKey = PANEL_LAST_LOGIN_HINT_KEYS.active;
      }
      setElementTextFromKey(elements.panelLastLoginHint, hintKey);
    }

    if (elements.panelLoginCount) {
      elements.panelLoginCount.textContent = String(historyCount);
    }

    if (elements.panelLoginHint) {
      let hintKey = PANEL_EVENTS_HINT_KEYS.empty;
      let replacements = {};
      if (historyCount === 1) {
        hintKey = PANEL_EVENTS_HINT_KEYS.single;
      } else if (historyCount > 1) {
        hintKey = PANEL_EVENTS_HINT_KEYS.multiple;
        replacements = { count: historyCount };
      }
      setElementTextFromKey(elements.panelLoginHint, hintKey, {
        replacements,
      });
    }
  }

  function getLoginFormSnapshot() {
    if (!elements.loginForm) {
      return { nomeCompleto: '', email: '', telefone: '', senha: '' };
    }
    const nomeInput = elements.loginForm.querySelector('[name="nome"]');
    const emailInput = elements.loginForm.querySelector('[name="email"]');
    const telefoneInput = elements.loginForm.querySelector('[name="telefone"]');
    const senhaInput = elements.loginForm.querySelector('[name="senha"]');
    return {
      nomeCompleto: nomeInput ? String(nomeInput.value || '') : '',
      email: emailInput ? String(emailInput.value || '') : '',
      telefone: telefoneInput ? sanitisePhoneDigits(telefoneInput.value) : '',
      senha: senhaInput ? String(senhaInput.value || '') : '',
    };
  }

  function computeFormDirtyState() {
    const snapshot = getLoginFormSnapshot();
    const reference =
      state.user || { nomeCompleto: '', email: '', telefone: '', senha: '' };
    return (
      snapshot.nomeCompleto !== (reference.nomeCompleto || '') ||
      snapshot.email !== (reference.email || '') ||
      snapshot.telefone !== (reference.telefone || '') ||
      snapshot.senha !== (reference.senha || '')
    );
  }

  function syncDirtyFlagFromForm() {
    const dirty = computeFormDirtyState();
    if (dirty !== stateDirty) {
      stateDirty = dirty;
      updateStatusSummary();
    }
  }

  function updateLoginFormFields() {
    if (!elements.loginForm) {
      return;
    }
    const user = state.user || { nomeCompleto: '', email: '', telefone: '', senha: '' };
    const nomeInput = elements.loginForm.querySelector('[name="nome"]');
    const emailInput = elements.loginForm.querySelector('[name="email"]');
    const telefoneInput = elements.loginForm.querySelector('[name="telefone"]');
    const senhaInput = elements.loginForm.querySelector('[name="senha"]');

    if (nomeInput && nomeInput.value !== user.nomeCompleto) {
      nomeInput.value = user.nomeCompleto;
    }
    if (emailInput && emailInput.value !== user.email) {
      emailInput.value = user.email;
    }
    if (telefoneInput) {
      telefoneInput.setAttribute(
        'placeholder',
        translate(FORM_PHONE_PLACEHOLDER_KEY, fallbackFor(FORM_PHONE_PLACEHOLDER_KEY))
      );
      applyPhoneMaskToInput(telefoneInput, user.telefone);
    }
    if (senhaInput && senhaInput.value !== user.senha) {
      senhaInput.value = user.senha;
    }
    if (elements.passwordInput) {
      setPasswordVisibility(passwordVisible);
    } else {
      updatePasswordToggle();
    }
    syncDirtyFlagFromForm();
  }

  function getLocaleLabel(locale) {
    if (!locale) {
      return '';
    }
    const key = `app.locale.menu.options.${locale}`;
    const fallback = Object.prototype.hasOwnProperty.call(
      LOCALE_NAME_FALLBACKS,
      locale
    )
      ? LOCALE_NAME_FALLBACKS[locale]
      : locale;
    const translated = translate(key, fallback);
    return translated || fallback;
  }

  function getActiveLocale() {
    if (!window.AppBaseI18n || typeof window.AppBaseI18n.getLocale !== 'function') {
      return null;
    }
    try {
      return window.AppBaseI18n.getLocale();
    } catch (error) {
      return null;
    }
  }

  function getHistoryLabel(entry) {
    if (!entry) {
      return '';
    }
    if (entry.type === 'login') {
      return translate(
        HISTORY_EVENT_KEYS.login,
        fallbackFor(HISTORY_EVENT_KEYS.login)
      );
    }
    if (entry.type === 'logout') {
      if (entry.mode === 'preserve') {
        return translate(
          HISTORY_EVENT_KEYS.logoutPreserve,
          fallbackFor(HISTORY_EVENT_KEYS.logoutPreserve)
        );
      }
      if (entry.mode === 'clear') {
        return translate(
          HISTORY_EVENT_KEYS.logoutClear,
          fallbackFor(HISTORY_EVENT_KEYS.logoutClear)
        );
      }
      return translate(
        HISTORY_EVENT_KEYS.logout,
        fallbackFor(HISTORY_EVENT_KEYS.logout)
      );
    }
    if (entry.type === 'locale') {
      const fallback = fallbackFor(HISTORY_EVENT_KEYS.locale, '');
      const template = translate(HISTORY_EVENT_KEYS.locale, fallback);
      const localeLabel = entry.localeLabel || getLocaleLabel(entry.locale);
      const message = formatMessage(template || fallback, {
        locale: localeLabel || entry.locale || '',
      });
      return message || fallback;
    }
    return '';
  }

  function updateLogHistory() {
    if (
      !elements.logTableBody ||
      !elements.logTableWrap ||
      elements.logEmpty.length === 0
    ) {
      return;
    }
    elements.logTableBody.textContent = '';
    const history = Array.isArray(state.history) ? state.history : [];
    if (history.length === 0) {
      elements.logTableWrap.hidden = true;
      elements.logEmpty.forEach((emptyElement) => {
        emptyElement.hidden = false;
      });
      return;
    }

    const fragment = document.createDocumentFragment();
    history.forEach((entry) => {
      const row = document.createElement('tr');
      const eventCell = document.createElement('td');
      eventCell.textContent = getHistoryLabel(entry);
      const timeCell = document.createElement('td');
      timeCell.textContent = formatDateTime(entry.timestamp);
      row.appendChild(eventCell);
      row.appendChild(timeCell);
      fragment.appendChild(row);
    });

    elements.logTableBody.appendChild(fragment);
    elements.logTableWrap.hidden = false;
    elements.logEmpty.forEach((emptyElement) => {
      emptyElement.hidden = true;
    });
  }

  function updateLogControls() {
    if (elements.logoutButton) {
      elements.logoutButton.disabled = !isLoggedIn();
    }
    if (elements.logoutClearButton) {
      elements.logoutClearButton.disabled = !hasUser();
    }
  }

  function clearLoginFeedback() {
    if (feedbackTimer) {
      window.clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }
    if (!elements.feedback) {
      return;
    }
    elements.feedback.textContent = '';
    elements.feedback.classList.remove('ac-feedback--success', 'ac-feedback--error');
    elements.feedback.removeAttribute('data-i18n');
  }

  function setLoginFeedback(type, key, options = {}) {
    if (!elements.feedback) {
      return;
    }
    if (feedbackTimer) {
      window.clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }
    const { replacements = {}, fallback: fallbackOverride } = options;
    const fallback = fallbackOverride || fallbackFor(key, '');
    const template = translate(key, fallback);
    const message = formatMessage(template || fallback, replacements) || fallback;
    elements.feedback.textContent = message;
    elements.feedback.setAttribute('data-i18n', key);
    elements.feedback.classList.remove('ac-feedback--success', 'ac-feedback--error');
    const className = type === 'error' ? 'ac-feedback--error' : 'ac-feedback--success';
    elements.feedback.classList.add(className);
    feedbackTimer = window.setTimeout(() => {
      clearLoginFeedback();
    }, FEEDBACK_TIMEOUT);
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    if (!elements.loginForm) {
      return;
    }
    const submitter = event.submitter;
    if (submitter) {
      applyButtonFeedback(submitter);
    }
    const formData = new FormData(elements.loginForm);
    const nome = String(formData.get('nome') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const telefoneDigits = sanitisePhoneDigits(formData.get('telefone'));
    const senha = String(formData.get('senha') || '').trim();

    if (!nome || !email) {
      setLoginFeedback('error', LOGIN_ERROR_FEEDBACK_KEY);
      return;
    }

    if (!senha) {
      setLoginFeedback('error', LOGIN_PASSWORD_MISSING_FEEDBACK_KEY);
      return;
    }

    if (!isValidPhoneDigits(telefoneDigits)) {
      setLoginFeedback('error', LOGIN_PHONE_INVALID_FEEDBACK_KEY);
      if (elements.phoneInput) {
        applyPhoneMaskToInput(elements.phoneInput, telefoneDigits);
      }
      return;
    }

    const timestamp = nowIso();
    const historyEntry = createHistoryEntry('login', { timestamp });
    panelOpen = true;
    await setState((previous) => {
      const nextHistory = historyEntry
        ? [historyEntry, ...(previous.history || [])]
        : previous.history || [];
      return {
        ...previous,
        user: {
          nomeCompleto: nome,
          email,
          telefone: telefoneDigits,
          senha,
        },
        lastLogin: timestamp,
        sessionActive: true,
        history: nextHistory,
      };
    });

    setLoginFeedback('success', LOGIN_SUCCESS_FEEDBACK_KEY);
  }

  function focusStageTitle() {
    if (!elements.stage || elements.stage.hidden) {
      return;
    }
    window.requestAnimationFrame(() => {
      elements.stageTitle?.focus();
    });
  }

  function focusPanelAccess() {
    if (!elements.panelAccess) {
      return;
    }
    window.requestAnimationFrame(() => {
      elements.panelAccess?.focus();
    });
  }

  function openPanel({ focus = true } = {}) {
    const wasClosed = !panelOpen;
    panelOpen = true;
    updateUI();
    if (focus && wasClosed) {
      focusStageTitle();
    }
  }

  function closePanel({ focusButton = true } = {}) {
    const wasOpen = panelOpen;
    panelOpen = false;
    updateUI();
    if (focusButton && wasOpen) {
      focusPanelAccess();
    }
  }

  function togglePanelAccess() {
    if (panelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function handleStageClose() {
    closePanel();
  }

  async function handleLogoutPreserve() {
    if (!isLoggedIn()) {
      return;
    }
    const timestamp = nowIso();
    const historyEntry = createHistoryEntry('logout', {
      timestamp,
      mode: 'preserve',
    });
    clearLoginFeedback();
    panelOpen = false;
    await setState((previous) => {
      const nextHistory = historyEntry
        ? [historyEntry, ...(previous.history || [])]
        : previous.history || [];
      return {
        ...previous,
        sessionActive: false,
        history: nextHistory,
      };
    });
    focusPanelAccess();
  }

  async function handleLogoutClear() {
    if (!hasUser()) {
      return;
    }
    clearLoginFeedback();
    panelOpen = false;
    await setState({
      user: null,
      lastLogin: '',
      sessionActive: false,
      history: [],
    });
    focusPanelAccess();
  }

  window.addEventListener('app:i18n:locale_changed', (event) => {
    const detailLocale = event?.detail?.locale;
    const currentLocale = detailLocale || getActiveLocale();
    const shouldLog =
      localeSyncInitialised && currentLocale && currentLocale !== lastLocaleSeen;
    if (!localeSyncInitialised) {
      localeSyncInitialised = true;
    }
    if (window.AppBaseI18n && typeof window.AppBaseI18n.refresh === 'function') {
      window.AppBaseI18n.refresh();
    }
    if (shouldLog) {
      recordLocaleHistory(currentLocale);
    } else {
      updateUI();
    }
    if (currentLocale) {
      lastLocaleSeen = currentLocale;
    }
  });

  const fullscreenChangeEvents = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange',
  ];
  const fullscreenErrorEvents = [
    'fullscreenerror',
    'webkitfullscreenerror',
    'mozfullscreenerror',
    'MSFullscreenError',
  ];

  function registerEventListeners() {
    fullscreenChangeEvents.forEach((eventName) => {
      document.addEventListener(eventName, syncFullscreenStateFromDocument);
    });

    fullscreenErrorEvents.forEach((eventName) => {
      document.addEventListener(eventName, handleFullscreenError);
    });

    if (elements.panelAccess) {
      elements.panelAccess.addEventListener('click', (event) => {
        event.preventDefault();
        applyButtonFeedback(event.currentTarget);
        togglePanelAccess();
      });
    }

    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', (event) => {
        event.preventDefault();
        applyButtonFeedback(event.currentTarget);
        const nextTheme =
          currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
        setTheme(nextTheme);
      });
    }

    if (elements.fullscreenToggle) {
      elements.fullscreenToggle.addEventListener('click', handleFullscreenToggle);
    }

    if (elements.stageClose) {
      elements.stageClose.addEventListener('click', (event) => {
        event.preventDefault();
        handleStageClose();
      });
    }

    if (elements.logoutButton) {
      elements.logoutButton.addEventListener('click', (event) => {
        event.preventDefault();
        void handleLogoutPreserve();
      });
    }

    if (elements.logoutClearButton) {
      elements.logoutClearButton.addEventListener('click', (event) => {
        event.preventDefault();
        void handleLogoutClear();
      });
    }

    if (elements.loginForm) {
      const handleFormMutation = () => {
        syncDirtyFlagFromForm();
      };
      elements.loginForm.addEventListener('input', handleFormMutation);
      elements.loginForm.addEventListener('change', handleFormMutation);
      elements.loginForm.addEventListener('submit', (event) => {
        void handleLoginSubmit(event);
      });
    }

    if (elements.phoneInput) {
      const handlePhoneUpdate = () => {
        applyPhoneMaskToInput(elements.phoneInput);
        syncDirtyFlagFromForm();
      };
      elements.phoneInput.addEventListener('input', handlePhoneUpdate);
      elements.phoneInput.addEventListener('blur', handlePhoneUpdate);
    }

    if (elements.passwordToggle) {
      elements.passwordToggle.addEventListener('click', (event) => {
        event.preventDefault();
        applyButtonFeedback(event.currentTarget);
        togglePasswordVisibility();
        if (elements.passwordInput) {
          elements.passwordInput.focus();
        }
      });
    }
  }

  async function boot() {
    try {
      const persistedState = await loadPersistedState();
      state = normaliseState(persistedState);
    } catch (error) {
      console.warn('AppBase: falha ao carregar estado persistido', error);
      state = getEmptyState();
    }

    panelOpen = hasUser(state) && state.sessionActive;

    setTheme(currentTheme, { persist: false });
    updateUI();
    initialiseFullscreenToggle();
    registerEventListeners();
  }

  boot().catch((error) => {
    console.error('AppBase: falha ao inicializar aplicativo', error);
  });
})();
