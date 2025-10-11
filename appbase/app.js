import {
  listProfiles as listStoredProfiles,
  loadProfile as loadStoredProfile,
  saveProfile as persistProfile,
} from './storage/indexeddb.js';
import { AppBase } from './runtime/app-base.js';

(function () {
  if (typeof window !== 'undefined' && !window.AppBase) {
    window.AppBase = AppBase;
  }

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
  const HEADER_MENU_LABEL_KEYS = {
    open: 'app.header.menu.toggle.open',
    close: 'app.header.menu.toggle.close',
  };
  const HEADER_MENU_BREAKPOINT = '(max-width: 600px)';
  const HEADER_MENU_OPEN_CLASS = 'is-open';
  const MINIAPP_MENU_LABEL_KEYS = {
    open: 'app.header.miniapps.toggle.open',
    close: 'app.header.miniapps.toggle.close',
  };
  const MINIAPP_MENU_BREAKPOINT = '(max-width: 900px)';
  const MINIAPP_MENU_OPEN_CLASS = 'is-open';
  const BODY_MINIAPP_MENU_OPEN_CLASS = 'has-miniapp-menu-open';
  const BRAND_ICONS = {
    [THEMES.LIGHT]:
      'https://5horas.com.br/wp-content/uploads/2025/10/Logo-Light-Transparente-2000x500px.webp',
    [THEMES.DARK]:
      'https://5horas.com.br/wp-content/uploads/2025/10/Logo-Dark-Transparente-2000x500px.png',
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
  const PROFILE_SELECTOR_TITLE_KEY = 'app.profile_selector.title';
  const PROFILE_SELECTOR_DESCRIPTION_KEY = 'app.profile_selector.description';
  const PROFILE_SELECTOR_NEW_KEY = 'app.profile_selector.new';
  const PROFILE_SELECTOR_UPDATED_AT_KEY = 'app.profile_selector.updated_at';
  const PROFILE_SELECTOR_EMAIL_MISSING_KEY = 'app.profile_selector.email_missing';
  const STAGE_EMPTY_KEYS = {
    empty: 'app.stage.empty.default',
    return: 'app.stage.empty.return',
  };
  const SUMMARY_EMPTY_KEY = 'app.panel.summary.empty';
  const HISTORY_EMPTY_KEY = 'app.history.empty';
  const HISTORY_EVENT_KEYS = {
    login: 'app.history.event.login',
    logout: 'app.history.event.logout',
    logoutPreserve: 'app.history.event.logout_preserve',
    logoutClear: 'app.history.event.logout_clear',
    locale: 'app.history.event.locale_change',
  };
  const LOCALE_NAME_FALLBACKS = {
    'pt-BR': 'Brasil',
    'en-US': 'Estados Unidos',
    'es-ES': 'Espanha',
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
  const SESSION_PROFILE_MANAGE_KEY = 'app.panel.session.actions.manage_profiles';
  const SESSION_LOGIN_SUCCESS_KEY = 'app.panel.session.feedback.login';
  const SESSION_LOGIN_ALREADY_ACTIVE_KEY =
    'app.panel.session.feedback.already_active';
  const SESSION_LOGIN_ERROR_KEY = 'app.panel.session.feedback.missing_user';
  const RAIL_LABEL_KEY = 'app.rail.label';
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
    [HEADER_MENU_LABEL_KEYS.open]: 'Abrir menu do cabeçalho',
    [HEADER_MENU_LABEL_KEYS.close]: 'Fechar menu do cabeçalho',
    [MINIAPP_MENU_LABEL_KEYS.open]: 'Abrir lista de miniapps',
    [MINIAPP_MENU_LABEL_KEYS.close]: 'Fechar lista de miniapps',
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
    'app.panel.session.current': 'Sessão atual',
    'app.panel.summary.user': 'Usuário',
    'app.panel.summary.account': 'Conta',
    'app.panel.summary.last_login': 'Último acesso',
    'app.panel.history.subtitle': 'Acompanhe logins e ajustes registrados neste navegador.',
    [HISTORY_EMPTY_KEY]: 'Sem registros.',
    [HISTORY_EVENT_KEYS.login]: 'Login realizado',
    [HISTORY_EVENT_KEYS.logout]: 'Logoff',
    [HISTORY_EVENT_KEYS.logoutPreserve]: 'Logoff (dados mantidos)',
    [HISTORY_EVENT_KEYS.logoutClear]: 'Logoff (dados removidos)',
    [HISTORY_EVENT_KEYS.locale]: 'Idioma alterado para {{locale}}',
    'app.locale.menu.title': 'Idioma do AppBase',
    'app.locale.menu.options.pt-BR': 'Brasil',
    'app.locale.menu.options.en-US': 'Estados Unidos',
    'app.locale.menu.options.es-ES': 'Espanha',
    [FOOTER_STATUS_KEYS.connected]: 'Conectado',
    [FOOTER_STATUS_KEYS.disconnected]: 'Desconectado',
    [FOOTER_STATUS_LABEL_KEY]: 'Status:',
    [FOOTER_DIRTY_LABEL_KEY]: 'Alterações:',
    [FOOTER_DIRTY_KEYS.clean]: 'Sincronizado',
    [FOOTER_DIRTY_KEYS.dirty]: 'Alterações pendentes',
    [FOOTER_DIRTY_KEYS.disabled]: 'Indisponível offline',
    [SESSION_ACTIONS_LABEL_KEY]: 'Ações da sessão',
    [RAIL_LABEL_KEY]: 'Miniapps',
    'app.rail.empty': 'Slot vazio — Adicione um mini-app',
    'app.rail.loading': 'Carregando miniapps…',
    'app.rail.error': 'Não foi possível carregar miniapps.',
    'app.rail.fallback': 'Carregado via fallback local',
    [LOGIN_ERROR_FEEDBACK_KEY]: 'Informe nome e e-mail para continuar.',
    [LOGIN_SUCCESS_FEEDBACK_KEY]: 'Cadastro atualizado com sucesso.',
    [LOGIN_PHONE_INVALID_FEEDBACK_KEY]:
      'Informe um telefone brasileiro com 10 ou 11 dígitos.',
    [LOGIN_PASSWORD_MISSING_FEEDBACK_KEY]: 'Informe uma senha para continuar.',
    'app.panel.session.actions.save': 'Salvar cadastro',
    'app.panel.session.actions.login': 'Iniciar sessão',
    [SESSION_PROFILE_MANAGE_KEY]: 'Gerenciar perfis',
    [SESSION_LOGIN_SUCCESS_KEY]: 'Sessão iniciada com sucesso.',
    [SESSION_LOGIN_ALREADY_ACTIVE_KEY]: 'A sessão já está ativa neste navegador.',
    [SESSION_LOGIN_ERROR_KEY]: 'Cadastre um usuário antes de iniciar a sessão.',
    [FORM_PHONE_PLACEHOLDER_KEY]: '(99) 99999-9999',
    [PASSWORD_TOGGLE_LABEL_KEYS.show]: 'Mostrar senha',
    [PASSWORD_TOGGLE_LABEL_KEYS.hide]: 'Ocultar senha',
    [PROFILE_SELECTOR_TITLE_KEY]: 'Selecione um perfil',
    [PROFILE_SELECTOR_DESCRIPTION_KEY]:
      'Escolha qual cadastro carregar neste navegador.',
    [PROFILE_SELECTOR_NEW_KEY]: 'Iniciar novo perfil',
    [PROFILE_SELECTOR_UPDATED_AT_KEY]: 'Atualizado em {{date}}',
    [PROFILE_SELECTOR_EMAIL_MISSING_KEY]: 'E-mail não informado',
  };

  const MINIAPP_BOOT_CONFIG = {
    tenantId: 'tenant-marco',
    userId: 'appbase-admin',
    catalogBaseUrl: 'https://cdn.marco.app/catalog',
    defaults: { enabledMiniApps: ['boas-vindas'] },
    user: { enabledMiniApps: [], entitlements: {}, providers: {} },
    miniApps: [
      {
        key: 'boas-vindas',
        manifestUrl: '../miniapps/boas-vindas/manifest.json',
        moduleUrl: '../miniapps/boas-vindas/module.js',
      },
    ],
    ui: { theme: 'light', layout: 'panel' },
    meta: { version: '1.0.0', signature: 'appbase-r1', checksum: 'appbase-r1' },
  };

  const MINIAPP_FALLBACKS = [
    {
      key: 'boas-vindas',
      manifest: {
        miniappId: 'boas-vindas',
        key: 'boas-vindas',
        name: 'Boas-vindas Marco',
        version: '1.0.0',
        kind: 'system',
        supportedLocales: ['pt-BR', 'en-US', 'es-ES'],
        dictionaries: {
          'pt-BR': './src/i18n/pt-BR.json',
          'en-US': './src/i18n/en-US.json',
          'es-ES': './src/i18n/es-ES.json',
        },
        meta: {
          card: {
            label: 'Boas-vindas Marco',
            labelKey: 'miniapp.boas_vindas.card.title',
            meta: 'Teste o fluxo completo com o painel oficial habilitado.',
            metaKey: 'miniapp.boas_vindas.card.subtitle',
            cta: 'Abrir painel principal',
            ctaKey: 'miniapp.boas_vindas.card.cta',
          },
          badges: ['Demo', 'Pronto'],
          badgeKeys: [
            'miniapp.boas_vindas.badges.demo',
            'miniapp.boas_vindas.badges.ready',
          ],
          panel: {
            meta: 'MiniApp de demonstração que reutiliza o painel oficial.',
            metaKey: 'miniapp.boas_vindas.panel.meta',
          },
          marketplace: {
            title: 'Boas-vindas Marco',
            titleKey: 'miniapp.boas_vindas.marketplace.title',
            description:
              'Cartão de validação para garantir que o host está pronto para novos MiniApps.',
            descriptionKey: 'miniapp.boas_vindas.marketplace.description',
            capabilities: ['Fluxo demo', 'Painel compartilhado', 'Documentação completa'],
            capabilityKeys: [
              'miniapp.boas_vindas.marketplace.capabilities.demo',
              'miniapp.boas_vindas.marketplace.capabilities.panel',
              'miniapp.boas_vindas.marketplace.capabilities.docs',
            ],
          },
        },
      },
    },
  ];

  const miniAppState = {
    loading: false,
    entries: [],
    error: null,
    activeKey: null,
  };

  const miniAppInstances = new Map();
  let miniAppChangeUnsubscribe = null;
  let activeProfileId = null;
  let availableProfiles = [];
  let profileSelectionResolver = null;
  let profileSelectorLastFocus = null;

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
    miniAppRail: document.querySelector('[data-miniapp-rail]'),
    miniAppRailTitle: document.querySelector('[data-miniapp-rail-title]'),
    logTableWrap: document.querySelector('[data-login-log-table]'),
    logTableBody: document.querySelector('[data-login-log-body]'),
    logEmpty: Array.from(document.querySelectorAll('[data-login-log-empty]')),
    headerMenuToggle: document.querySelector('[data-header-menu-toggle]'),
    headerMenu: document.querySelector('[data-header-menu]'),
    headerMenuLabel: document.querySelector('[data-header-menu-label]'),
    headerActions: document.querySelector('[data-header-actions]'),
    miniAppMenuToggle: document.querySelector('[data-miniapp-menu-toggle]'),
    miniAppMenuLabel: document.querySelector('[data-miniapp-menu-label]'),
    miniAppMenuClose: document.querySelector('[data-miniapp-menu-close]'),
    sessionLoginButton: document.querySelector('[data-action="session-login"]'),
    logoutButton: document.querySelector('[data-action="logout-preserve"]'),
    logoutClearButton: document.querySelector('[data-action="logout-clear"]'),
    profileManageButton: document.querySelector('[data-action="profile-manage"]'),
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
    profileSelectorOverlay: document.querySelector('[data-profile-selector]'),
    profileSelectorDialog: document.querySelector('[data-profile-selector-dialog]'),
    profileSelectorList: document.querySelector('[data-profile-selector-list]'),
    profileSelectorDescription: document.querySelector(
      '[data-profile-selector-description]'
    ),
    profileSelectorNewButton: document.querySelector('[data-profile-selector-new]'),
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

  function isHeaderMenuCompact() {
    return Boolean(headerMenuMedia && headerMenuMedia.matches);
  }

  function updateHeaderMenuButton(expanded = headerMenuOpen) {
    if (!elements.headerMenuToggle) {
      return;
    }
    const labelKey = expanded
      ? HEADER_MENU_LABEL_KEYS.close
      : HEADER_MENU_LABEL_KEYS.open;
    const label = translate(labelKey, fallbackFor(labelKey));
    elements.headerMenuToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    elements.headerMenuToggle.setAttribute('aria-label', label);
    elements.headerMenuToggle.setAttribute('title', label);
    if (elements.headerMenuLabel) {
      elements.headerMenuLabel.setAttribute('data-i18n', labelKey);
      elements.headerMenuLabel.textContent = label;
    }
  }

  function handleHeaderMenuOutside(event) {
    if (!headerMenuOpen || !elements.headerMenu) {
      return;
    }
    const target = event.target;
    if (!target) {
      return;
    }
    if (elements.headerMenu.contains(target)) {
      return;
    }
    if (elements.headerMenuToggle?.contains(target)) {
      return;
    }
    closeHeaderMenu({ focusToggle: false });
  }

  function handleHeaderMenuKeydown(event) {
    if (!headerMenuOpen) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeHeaderMenu({ focusToggle: true });
    }
  }

  function attachHeaderMenuDismissListeners() {
    document.addEventListener('pointerdown', handleHeaderMenuOutside, true);
    document.addEventListener('keydown', handleHeaderMenuKeydown, true);
  }

  function detachHeaderMenuDismissListeners() {
    document.removeEventListener('pointerdown', handleHeaderMenuOutside, true);
    document.removeEventListener('keydown', handleHeaderMenuKeydown, true);
  }

  function openHeaderMenu() {
    if (!elements.headerMenu || !elements.headerMenuToggle || !isHeaderMenuCompact()) {
      return;
    }
    if (miniAppMenuOpen) {
      closeMiniAppMenu({ focusToggle: false });
    }
    if (headerMenuOpen) {
      updateHeaderMenuButton(true);
      return;
    }
    headerMenuOpen = true;
    elements.headerMenu.classList.add(HEADER_MENU_OPEN_CLASS);
    elements.headerMenu.setAttribute('aria-hidden', 'false');
    updateHeaderMenuButton(true);
    attachHeaderMenuDismissListeners();
  }

  function closeHeaderMenu({ focusToggle = false } = {}) {
    if (!elements.headerMenu || !elements.headerMenuToggle) {
      return;
    }
    headerMenuOpen = false;
    elements.headerMenu.classList.remove(HEADER_MENU_OPEN_CLASS);
    elements.headerMenu.setAttribute(
      'aria-hidden',
      isHeaderMenuCompact() ? 'true' : 'false'
    );
    updateHeaderMenuButton(false);
    detachHeaderMenuDismissListeners();
    if (focusToggle) {
      elements.headerMenuToggle.focus();
    }
  }

  function toggleHeaderMenu() {
    if (!isHeaderMenuCompact()) {
      return;
    }
    if (headerMenuOpen) {
      closeHeaderMenu({ focusToggle: false });
    } else {
      openHeaderMenu();
    }
  }

  function handleHeaderMenuMediaChange() {
    closeHeaderMenu({ focusToggle: false });
  }

  function collapseHeaderMenuForAction() {
    if (headerMenuOpen) {
      closeHeaderMenu({ focusToggle: false });
    }
    if (miniAppMenuOpen) {
      closeMiniAppMenu({ focusToggle: false });
    }
  }

  function initialiseHeaderMenuState() {
    if (elements.headerMenu) {
      elements.headerMenu.classList.remove(HEADER_MENU_OPEN_CLASS);
      elements.headerMenu.setAttribute('aria-hidden', isHeaderMenuCompact() ? 'true' : 'false');
    }
    detachHeaderMenuDismissListeners();
    headerMenuOpen = false;
    updateHeaderMenuButton(false);
  }

  function isMiniAppMenuCompact() {
    return Boolean(miniAppMenuMedia && miniAppMenuMedia.matches);
  }

  function updateMiniAppMenuButton(expanded = miniAppMenuOpen) {
    if (!elements.miniAppMenuToggle) {
      return;
    }
    const labelKey = expanded
      ? MINIAPP_MENU_LABEL_KEYS.close
      : MINIAPP_MENU_LABEL_KEYS.open;
    const label = translate(labelKey, fallbackFor(labelKey));
    elements.miniAppMenuToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    elements.miniAppMenuToggle.setAttribute('aria-label', label);
    elements.miniAppMenuToggle.setAttribute('title', label);
    if (elements.miniAppMenuLabel) {
      elements.miniAppMenuLabel.setAttribute('data-i18n', labelKey);
      elements.miniAppMenuLabel.textContent = label;
    }
  }

  function updateMiniAppMenuCloseButton() {
    if (!elements.miniAppMenuClose) {
      return;
    }
    const labelKey = MINIAPP_MENU_LABEL_KEYS.close;
    const label = translate(labelKey, fallbackFor(labelKey));
    elements.miniAppMenuClose.setAttribute('aria-label', label);
    elements.miniAppMenuClose.setAttribute('title', label);
  }

  function focusMiniAppMenu() {
    if (!miniAppMenuOpen || !elements.railShell) {
      return;
    }
    window.requestAnimationFrame(() => {
      const focusable = getFocusableElements(elements.railShell);
      if (focusable.length) {
        focusable[0].focus();
      }
    });
  }

  function handleMiniAppMenuOutside(event) {
    if (!miniAppMenuOpen || !elements.railShell) {
      return;
    }
    const target = event.target;
    if (!target) {
      return;
    }
    if (elements.railShell.contains(target)) {
      return;
    }
    if (elements.miniAppMenuToggle?.contains(target)) {
      return;
    }
    closeMiniAppMenu({ focusToggle: false });
  }

  function handleMiniAppMenuKeydown(event) {
    if (!miniAppMenuOpen) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMiniAppMenu({ focusToggle: true });
    }
  }

  function attachMiniAppMenuDismissListeners() {
    document.addEventListener('pointerdown', handleMiniAppMenuOutside, true);
    document.addEventListener('keydown', handleMiniAppMenuKeydown, true);
  }

  function detachMiniAppMenuDismissListeners() {
    document.removeEventListener('pointerdown', handleMiniAppMenuOutside, true);
    document.removeEventListener('keydown', handleMiniAppMenuKeydown, true);
  }

  function openMiniAppMenu({ focus = true } = {}) {
    if (!elements.railShell || !isMiniAppMenuCompact()) {
      return;
    }
    collapseHeaderMenuForAction();
    if (miniAppMenuOpen) {
      updateMiniAppMenuButton(true);
      if (focus) {
        focusMiniAppMenu();
      }
      return;
    }
    miniAppMenuOpen = true;
    elements.railShell.classList.add(MINIAPP_MENU_OPEN_CLASS);
    elements.railShell.setAttribute('aria-hidden', 'false');
    document.body.classList.add(BODY_MINIAPP_MENU_OPEN_CLASS);
    updateMiniAppMenuButton(true);
    updateMiniAppMenuCloseButton();
    attachMiniAppMenuDismissListeners();
    if (focus) {
      focusMiniAppMenu();
    }
  }

  function closeMiniAppMenu({ focusToggle = false } = {}) {
    if (!elements.railShell) {
      return;
    }
    miniAppMenuOpen = false;
    elements.railShell.classList.remove(MINIAPP_MENU_OPEN_CLASS);
    elements.railShell.setAttribute(
      'aria-hidden',
      isMiniAppMenuCompact() ? 'true' : 'false'
    );
    document.body.classList.remove(BODY_MINIAPP_MENU_OPEN_CLASS);
    updateMiniAppMenuButton(false);
    detachMiniAppMenuDismissListeners();
    if (focusToggle && elements.miniAppMenuToggle && !elements.miniAppMenuToggle.hidden) {
      elements.miniAppMenuToggle.focus();
    }
  }

  function toggleMiniAppMenu() {
    if (!isMiniAppMenuCompact()) {
      return;
    }
    if (miniAppMenuOpen) {
      closeMiniAppMenu({ focusToggle: false });
    } else {
      openMiniAppMenu();
    }
  }

  function handleMiniAppMenuMediaChange() {
    initialiseMiniAppMenuState();
  }

  function initialiseMiniAppMenuState() {
    const compact = isMiniAppMenuCompact();
    if (elements.miniAppMenuToggle) {
      elements.miniAppMenuToggle.hidden = !compact;
      elements.miniAppMenuToggle.setAttribute('aria-expanded', 'false');
    }
    if (elements.railShell) {
      elements.railShell.classList.remove(MINIAPP_MENU_OPEN_CLASS);
      elements.railShell.setAttribute('aria-hidden', compact ? 'true' : 'false');
    }
    document.body.classList.remove(BODY_MINIAPP_MENU_OPEN_CLASS);
    miniAppMenuOpen = false;
    detachMiniAppMenuDismissListeners();
    updateMiniAppMenuButton(false);
    updateMiniAppMenuCloseButton();
  }

  function setElementTextFromKey(element, key, options = {}) {
    if (!element) {
      return;
    }
    if (Array.isArray(element)) {
      element.forEach((item) => setElementTextFromKey(item, key, options));
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

  function getFocusableElements(container) {
    if (!container) {
      return [];
    }
    const focusableSelectors = [
      'a[href]',
      'button',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])',
    ];
    return Array.from(container.querySelectorAll(focusableSelectors.join(','))).filter(
      (element) =>
        !element.hasAttribute('disabled') &&
        element.getAttribute('aria-hidden') !== 'true' &&
        element.tabIndex !== -1
    );
  }

  function createFallbackDefinition(manifest) {
    const meta = { ...(manifest.meta ?? {}) };
    if (!meta.id) {
      meta.id = manifest.miniappId ?? manifest.id ?? manifest.key ?? manifest.name ?? '';
    }
    return {
      meta,
      init() {
        return {
          destroy() {},
        };
      },
    };
  }

  function createFallbackMap() {
    const map = new Map();
    MINIAPP_FALLBACKS.forEach((entry) => {
      if (!entry?.key) {
        return;
      }
      const manifest = { ...(entry.manifest ?? {}) };
      manifest.meta = { ...(entry.manifest?.meta ?? {}) };
      map.set(entry.key, {
        definition: createFallbackDefinition(manifest),
        manifest,
      });
    });
    return map;
  }

  function getDictionaryValue(dictionary, path) {
    if (!dictionary || !path) {
      return null;
    }
    return path
      .split('.')
      .filter(Boolean)
      .reduce((acc, segment) => (acc && typeof acc === 'object' ? acc[segment] : null), dictionary);
  }

  function getMiniAppDictionary(entry, locale) {
    if (!entry?.dictionaries) {
      return null;
    }
    if (locale && entry.dictionaries[locale]) {
      return entry.dictionaries[locale];
    }
    const fallbackLocale = entry.manifest?.defaultLocale;
    if (fallbackLocale && entry.dictionaries[fallbackLocale]) {
      return entry.dictionaries[fallbackLocale];
    }
    const first = Object.values(entry.dictionaries)[0];
    return (first && typeof first === 'object') ? first : null;
  }

  function translateMiniApp(entry, path, fallback) {
    const locale = getActiveLocale();
    const dictionary = getMiniAppDictionary(entry, locale);
    const value = getDictionaryValue(dictionary, path);
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    return typeof fallback === 'string' && fallback ? fallback : '';
  }

  function updateMiniAppRailLabels() {
    if (!elements.railShell) {
      return;
    }
    const label = translate(RAIL_LABEL_KEY, fallbackFor(RAIL_LABEL_KEY));
    elements.railShell.setAttribute('aria-label', label);
    if (elements.miniAppRailTitle) {
      setElementTextFromKey(elements.miniAppRailTitle, RAIL_LABEL_KEY);
    }
  }

  function createRailStatusCard(messageKey, fallbackText) {
    const article = document.createElement('article');
    article.className = 'ac-miniapp-card ac-miniapp-card--empty minicard minicard--md is-empty';
    article.setAttribute('role', 'listitem');
    const wrapper = document.createElement('div');
    wrapper.className = 'ac-miniapp-card__empty';
    const icon = document.createElement('span');
    icon.className = 'ac-miniapp-card__empty-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '+';
    const message = document.createElement('p');
    message.className = 'ac-miniapp-card__empty-text';
    message.textContent = translate(messageKey, fallbackText ?? fallbackFor(messageKey));
    wrapper.appendChild(icon);
    wrapper.appendChild(message);
    article.appendChild(wrapper);
    return article;
  }

  function getCardMeta(entry) {
    const manifestMeta = entry?.manifest?.meta ?? {};
    const moduleMeta = entry?.meta ?? {};
    return {
      card: manifestMeta.card ?? moduleMeta.card ?? {},
      panel: manifestMeta.panel ?? moduleMeta.panel ?? {},
      marketplace: manifestMeta.marketplace ?? moduleMeta.marketplace ?? {},
      badges: manifestMeta.badges ?? moduleMeta.badges ?? [],
      badgeKeys: manifestMeta.badgeKeys ?? moduleMeta.badgeKeys ?? [],
    };
  }

  function createMiniAppCard(entry, { enabled, active }) {
    const meta = getCardMeta(entry);
    const article = document.createElement('article');
    article.className = 'ac-miniapp-card minicard minicard--md';
    article.dataset.miniapp = entry.key;
    article.setAttribute('role', 'listitem');
    article.tabIndex = enabled ? 0 : -1;
    article.setAttribute('aria-pressed', active ? 'true' : 'false');
    article.classList.toggle('is-active', Boolean(active));
    article.classList.toggle('is-disabled', !enabled);
    if (entry.fallback) {
      article.dataset.fallback = 'true';
    }

    const head = document.createElement('div');
    head.className = 'ac-miniapp-card__head';

    const titles = document.createElement('div');
    titles.className = 'ac-miniapp-card__titles';

    const title = document.createElement('h3');
    title.className = 'ac-miniapp-card__title';
    title.textContent = translateMiniApp(
      entry,
      meta.card.labelKey ?? '',
      meta.card.label ?? entry.key,
    );
    titles.appendChild(title);

    const subtitleText = translateMiniApp(
      entry,
      meta.card.metaKey ?? '',
      meta.card.meta ?? '',
    );
    if (subtitleText) {
      const subtitle = document.createElement('p');
      subtitle.className = 'ac-miniapp-card__subtitle';
      subtitle.textContent = subtitleText;
      titles.appendChild(subtitle);
    }

    head.appendChild(titles);
    article.appendChild(head);

    if (entry.fallback) {
      const note = document.createElement('p');
      note.className = 'ac-miniapp-card__note';
      note.textContent = translate('app.rail.fallback', fallbackFor('app.rail.fallback'));
      article.appendChild(note);
    }

    const actions = document.createElement('div');
    actions.className = 'ac-miniapp-card__actions';
    const cta = document.createElement('button');
    cta.className = 'ac-btn ac-btn--primary';
    cta.type = 'button';
    cta.disabled = !enabled;
    cta.textContent = translateMiniApp(
      entry,
      meta.card.ctaKey ?? '',
      meta.card.cta ?? translate('app.panel.stage.title', fallbackFor('app.panel.stage.title')),
    );
    cta.addEventListener('click', (event) => {
      event.preventDefault();
      openMiniApp(entry.key, { focus: true });
    });
    actions.appendChild(cta);
    article.appendChild(actions);

    article.addEventListener('click', (event) => {
      if (event.target.closest('button')) {
        return;
      }
      event.preventDefault();
      openMiniApp(entry.key, { focus: false });
    });

    article.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMiniApp(entry.key, { focus: true });
      }
    });

    return article;
  }

  function ensureMiniAppInitialised(key, entry) {
    if (miniAppInstances.has(key)) {
      return miniAppInstances.get(key);
    }
    const module = AppBase.resolve(key);
    if (!module || typeof module.init !== 'function') {
      return null;
    }
    try {
      const instance = module.init(elements.stage, {
        manifest: entry?.manifest ?? null,
        meta: entry?.meta ?? null,
      });
      miniAppInstances.set(key, instance ?? { destroy() {} });
      return miniAppInstances.get(key);
    } catch (error) {
      console.error('AppBase: falha ao inicializar miniapp', key, error);
      return null;
    }
  }

  function openMiniApp(key, { focus = true } = {}) {
    if (!key || !AppBase.isEnabled(key)) {
      return;
    }
    const entry = miniAppState.entries.find((item) => item.key === key);
    ensureMiniAppInitialised(key, entry);
    miniAppState.activeKey = key;
    if (miniAppMenuOpen) {
      closeMiniAppMenu({ focusToggle: false });
    }
    renderMiniAppRail();
    openPanel({ focus });
  }

  function renderMiniAppRail() {
    if (!elements.miniAppRail) {
      return;
    }
    updateMiniAppRailLabels();
    const container = elements.miniAppRail;
    container.innerHTML = '';

    if (miniAppState.loading) {
      container.appendChild(createRailStatusCard('app.rail.loading'));
      return;
    }

    if (miniAppState.error) {
      container.appendChild(createRailStatusCard('app.rail.error', miniAppState.error));
      return;
    }

    const registered = miniAppState.entries.filter((entry) => entry.registered);
    if (!registered.length) {
      container.appendChild(createRailStatusCard('app.rail.empty'));
      return;
    }

    const enabledSet = new Set(AppBase.getEnabledMiniApps());
    const visibleEntries = registered.filter((entry) => {
      const kind = entry.manifest?.kind || entry.meta?.kind;
      return kind !== 'system';
    });

    if (!visibleEntries.length) {
      miniAppState.activeKey = null;
      return;
    }

    if (!miniAppState.activeKey || !enabledSet.has(miniAppState.activeKey)) {
      const fallbackActive = visibleEntries.find((entry) => enabledSet.has(entry.key)) ?? visibleEntries[0];
      miniAppState.activeKey = fallbackActive ? fallbackActive.key : null;
    }

    visibleEntries.forEach((entry) => {
      const node = createMiniAppCard(entry, {
        enabled: enabledSet.has(entry.key),
        active: entry.key === miniAppState.activeKey,
      });
      container.appendChild(node);
    });

    if (miniAppMenuOpen) {
      focusMiniAppMenu();
    }
  }

  async function loadMiniAppManifest(entry, manifestUrl) {
    if (entry?.manifest) {
      return entry.manifest;
    }
    if (!manifestUrl) {
      throw new Error(`Mini-app "${entry?.key ?? 'desconhecido'}" sem manifestUrl definido.`);
    }
    const response = await fetch(manifestUrl.href, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Falha ao carregar manifesto de ${entry?.key ?? 'mini-app'}. Código ${response.status}`);
    }
    return response.json();
  }

  async function instantiateMiniAppModule(entry, manifest, manifestUrl) {
    const key = manifest.miniappId ?? manifest.id ?? manifest.key ?? entry.key;
    if (!key) {
      throw new Error('Manifesto de mini-app sem chave.');
    }

    const moduleType = manifest.module?.type ?? entry.moduleType ?? 'template';
    if (moduleType === 'placeholder') {
      return null;
    }

    const specifier = manifest.module?.url ?? entry.moduleUrl ?? null;
    if (!specifier) {
      const definition = createFallbackDefinition(manifest);
      definition.meta = { ...(definition.meta ?? {}), ...(manifest.meta ?? {}) };
      return definition;
    }

    const moduleUrl = manifestUrl ? new URL(specifier, manifestUrl).href : new URL(specifier, import.meta.url).href;
    const factoryModule = await import(moduleUrl);
    const factory =
      typeof factoryModule.createModule === 'function'
        ? factoryModule.createModule
        : typeof factoryModule.createMiniAppModule === 'function'
          ? factoryModule.createMiniAppModule
          : typeof factoryModule.default === 'function'
            ? factoryModule.default
            : null;
    if (!factory) {
      throw new Error(`O módulo "${specifier}" não exporta uma fábrica compatível.`);
    }
    const definition = factory({ key, manifest, meta: manifest.meta ?? {} }) ?? null;
    if (!definition || typeof definition.init !== 'function') {
      throw new Error(`Mini-app ${key} não possui definição de módulo válida.`);
    }
    if (!definition.meta) {
      definition.meta = manifest.meta ?? {};
    }
    return definition;
  }

  async function loadMiniAppDictionaries(manifest, manifestUrl) {
    const dictionaries = {};
    const supported = Array.isArray(manifest.supportedLocales)
      ? manifest.supportedLocales
      : [];
    for (const locale of supported) {
      const path = manifest.dictionaries?.[locale];
      if (!path) {
        continue;
      }
      try {
        const url = manifestUrl ? new URL(path, manifestUrl).href : path;
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Falha ao carregar dicionário ${locale}`);
        }
        dictionaries[locale] = await response.json();
      } catch (error) {
        console.warn(
          `AppBase: falha ao carregar dicionário de ${
            manifest.miniappId ?? manifest.id ?? manifest.key ?? 'miniapp'
          } (${locale})`,
          error,
        );
      }
    }
    return dictionaries;
  }

  async function resolveMiniApp(entry, fallbackMap) {
    const manifestUrl = entry?.manifestUrl ? new URL(entry.manifestUrl, import.meta.url) : null;
    const result = {
      key: entry?.key ?? null,
      manifest: null,
      dictionaries: {},
      meta: null,
      registered: false,
      fallback: false,
      error: null,
    };

    try {
      const manifest = await loadMiniAppManifest(entry, manifestUrl);
      const key = manifest.miniappId ?? manifest.id ?? manifest.key ?? entry.key;
      if (!key) {
        throw new Error('Manifesto de mini-app sem identificador.');
      }
      result.key = key;
      result.manifest = manifest;
      const definition = await instantiateMiniAppModule(entry, manifest, manifestUrl);
      if (!definition) {
        return result;
      }
      AppBase.register(key, definition);
      fallbackMap.delete(key);
      result.registered = true;
      result.meta = AppBase.getModuleMeta(key);
      result.dictionaries = await loadMiniAppDictionaries(manifest, manifestUrl);
      return result;
    } catch (error) {
      const fallbackKey = result.key ?? entry?.key ?? null;
      result.error = error;
      if (fallbackKey && fallbackMap.has(fallbackKey)) {
        const fallbackEntry = fallbackMap.get(fallbackKey);
        try {
          AppBase.register(fallbackKey, fallbackEntry.definition);
          fallbackMap.delete(fallbackKey);
          result.key = fallbackKey;
          result.manifest = fallbackEntry.manifest;
          result.dictionaries = await loadMiniAppDictionaries(
            fallbackEntry.manifest,
            manifestUrl,
          );
          result.meta = AppBase.getModuleMeta(fallbackKey);
          result.registered = true;
          result.fallback = true;
          console.warn(`Mini-app "${fallbackKey}" carregado via fallback local.`, error);
        } catch (fallbackError) {
          console.error(`Falha ao registrar fallback do mini-app "${fallbackKey}"`, fallbackError);
        }
      } else {
        console.error(`Falha ao carregar mini-app "${fallbackKey ?? 'desconhecido'}"`, error);
      }
      return result;
    }
  }

  async function initialiseMiniApps() {
    miniAppState.loading = true;
    miniAppState.error = null;
    renderMiniAppRail();
    const fallbackMap = createFallbackMap();
    const resolved = [];

    for (const entry of MINIAPP_BOOT_CONFIG.miniApps ?? []) {
      const resolvedEntry = await resolveMiniApp(entry, fallbackMap);
      resolved.push(resolvedEntry);
    }

    const registered = resolved.filter((entry) => entry.registered);
    miniAppState.entries = registered;
    miniAppState.loading = false;

    if (!registered.length) {
      miniAppState.error = translate('app.rail.error', fallbackFor('app.rail.error'));
    }

    renderMiniAppRail();
  }

  let currentTheme = normaliseTheme(resolveInitialTheme());
  let state = getEmptyState();
  let panelOpen = false;
  let stateDirty = false;
  let stateHydrated = false;
  let feedbackTimer = null;
  let fullscreenSupported = isFullscreenSupported();
  let fullscreenActive = isFullscreenActive();
  let fullscreenNotice = '';
  const buttonFeedbackTimers = new WeakMap();
  let passwordVisible = false;
  let localeSyncInitialised = false;
  let lastLocaleSeen = null;
  let headerMenuOpen = false;
  const headerMenuMedia =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(HEADER_MENU_BREAKPOINT)
      : null;
  let miniAppMenuOpen = false;
  const miniAppMenuMedia =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MINIAPP_MENU_BREAKPOINT)
      : null;

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
    return {
      user,
      lastLogin,
      history,
      sessionActive,
    };
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

  function sortProfileSummaries(records) {
    return [...records].sort((a, b) => {
      if (a.updatedAt === b.updatedAt) {
        return getDisplayName(a.state.user).localeCompare(
          getDisplayName(b.state.user),
          undefined,
          { sensitivity: 'base' }
        );
      }
      return a.updatedAt > b.updatedAt ? -1 : 1;
    });
  }

  function updateAvailableProfiles(record) {
    if (!record || typeof record !== 'object') {
      return;
    }
    const normalised = {
      ...record,
      state: normaliseState(record.state),
    };
    const existingIndex = availableProfiles.findIndex((entry) => entry.id === normalised.id);
    if (existingIndex >= 0) {
      availableProfiles[existingIndex] = normalised;
    } else {
      availableProfiles.push(normalised);
    }
    availableProfiles = sortProfileSummaries(availableProfiles);
    if (isProfileSelectorOpen()) {
      renderProfileSelector(availableProfiles);
    }
  }

  function applySelectedProfile(selection, options = {}) {
    if (!selection || typeof selection !== 'object') {
      return null;
    }
    const { focus = true } = options;
    const resolvedState = normaliseState(selection.state || getEmptyState());
    const profileIdRaw = selection.profileId;
    const nextProfileId =
      typeof profileIdRaw === 'string' && profileIdRaw.trim()
        ? profileIdRaw.trim()
        : null;
    state = resolvedState;
    activeProfileId = nextProfileId;
    stateDirty = false;
    passwordVisible = false;
    panelOpen = true;
    updateUI();
    if (focus) {
      focusStageTitle();
    }
    return { profileId: nextProfileId, state: resolvedState };
  }

  function findProfileById(id) {
    if (!id) {
      return null;
    }
    return availableProfiles.find((entry) => entry && entry.id === id) || null;
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
    return persistActiveProfile(state)
      .catch((error) => {
        console.warn('AppBase: falha ao persistir dados', error);
      })
      .then(() => state);
  }

  function persistActiveProfile(currentState) {
    try {
      return persistProfile(currentState, { id: activeProfileId }).then((record) => {
        if (record && record.id) {
          activeProfileId = record.id;
          updateAvailableProfiles(record);
        }
        return record;
      });
    } catch (error) {
      return Promise.reject(error);
    }
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
    updateProfileSelector();
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
    updateHeaderMenuButton(headerMenuOpen);
    updateMiniAppMenuButton(miniAppMenuOpen);
    updateMiniAppMenuCloseButton();
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
    if (elements.sessionLoginButton) {
      elements.sessionLoginButton.disabled = !hasUser() || isLoggedIn();
    }
    if (elements.logoutButton) {
      elements.logoutButton.disabled = !isLoggedIn();
    }
    if (elements.logoutClearButton) {
      elements.logoutClearButton.disabled = !hasUser();
    }
  }

  function isProfileSelectorOpen() {
    return (
      elements.profileSelectorOverlay &&
      elements.profileSelectorOverlay.getAttribute('aria-hidden') === 'false'
    );
  }

  function updateProfileSelector() {
    if (!elements.profileSelectorOverlay) {
      return;
    }
    if (elements.profileSelectorDescription) {
      setElementTextFromKey(
        elements.profileSelectorDescription,
        PROFILE_SELECTOR_DESCRIPTION_KEY,
        { fallbackKey: PROFILE_SELECTOR_DESCRIPTION_KEY }
      );
    }
    if (elements.profileSelectorNewButton) {
      setElementTextFromKey(elements.profileSelectorNewButton, PROFILE_SELECTOR_NEW_KEY, {
        fallbackKey: PROFILE_SELECTOR_NEW_KEY,
      });
    }
    if (isProfileSelectorOpen()) {
      renderProfileSelector(availableProfiles);
    }
  }

  function renderProfileSelector(profiles) {
    if (!elements.profileSelectorList) {
      return;
    }
    const list = elements.profileSelectorList;
    list.innerHTML = '';
    const entries = Array.isArray(profiles) ? profiles : [];
    if (!entries.length) {
      return;
    }
    const fragment = document.createDocumentFragment();
    const emailFallback = translate(
      PROFILE_SELECTOR_EMAIL_MISSING_KEY,
      fallbackFor(PROFILE_SELECTOR_EMAIL_MISSING_KEY)
    );
    const updatedTemplate = translate(
      PROFILE_SELECTOR_UPDATED_AT_KEY,
      fallbackFor(PROFILE_SELECTOR_UPDATED_AT_KEY)
    );

    entries.forEach((profile, index) => {
      if (!profile || typeof profile !== 'object') {
        return;
      }
      const item = document.createElement('li');
      item.className = 'ac-profile-list__item';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ac-profile-option';
      button.setAttribute('data-profile-option', profile.id);
      button.setAttribute('data-profile-index', String(index));
      if (profile.id === activeProfileId) {
        button.setAttribute('data-profile-active', 'true');
      }

      const name = document.createElement('span');
      name.className = 'ac-profile-option__name';
      name.textContent = getDisplayName(profile.state.user);

      const email = document.createElement('span');
      email.className = 'ac-profile-option__meta';
      email.textContent = profile.state?.user?.email || emailFallback;

      const updated = document.createElement('span');
      updated.className = 'ac-profile-option__meta ac-profile-option__meta--muted';
      const formattedDate = formatDateTime(profile.updatedAt);
      const updatedText =
        formatMessage(updatedTemplate, { date: formattedDate }) || formattedDate;
      updated.textContent = updatedText;

      button.appendChild(name);
      button.appendChild(email);
      button.appendChild(updated);
      item.appendChild(button);
      fragment.appendChild(item);
    });

    list.appendChild(fragment);
  }

  function openProfileSelector() {
    if (!elements.profileSelectorOverlay) {
      return;
    }
    elements.profileSelectorOverlay.setAttribute('aria-hidden', 'false');
    profileSelectorLastFocus =
      document.activeElement && typeof document.activeElement.focus === 'function'
        ? document.activeElement
        : null;
    updateProfileSelector();
    window.requestAnimationFrame(() => {
      const container = elements.profileSelectorDialog || elements.profileSelectorOverlay;
      const focusable = getFocusableElements(container);
      if (focusable.length) {
        focusable[0].focus();
      }
    });
  }

  function closeProfileSelector() {
    if (elements.profileSelectorOverlay) {
      elements.profileSelectorOverlay.setAttribute('aria-hidden', 'true');
    }
    if (elements.profileSelectorList) {
      elements.profileSelectorList.innerHTML = '';
    }
    const focusTarget = profileSelectorLastFocus;
    profileSelectorLastFocus = null;
    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.focus();
    }
  }

  function resolveProfileSelection(selection) {
    if (typeof profileSelectionResolver !== 'function') {
      return;
    }
    const resolver = profileSelectionResolver;
    profileSelectionResolver = null;
    closeProfileSelector();
    resolver(selection);
  }

  async function selectProfileById(id) {
    if (!id) {
      return;
    }
    try {
      const record = await loadStoredProfile(id);
      if (record) {
        resolveProfileSelection({ profileId: record.id, state: record.state });
        return;
      }
    } catch (error) {
      console.warn('AppBase: falha ao carregar perfil selecionado', error);
    }
    const fallback = findProfileById(id);
    if (fallback) {
      resolveProfileSelection({ profileId: fallback.id, state: fallback.state });
      return;
    }
    resolveProfileSelection({ profileId: null, state: getEmptyState() });
  }

  function handleProfileSelectorListClick(event) {
    const target = event.target;
    if (!elements.profileSelectorList || !target) {
      return;
    }
    const button = target.closest('[data-profile-option]');
    if (!button || !elements.profileSelectorList.contains(button)) {
      return;
    }
    event.preventDefault();
    const profileId = button.getAttribute('data-profile-option');
    Promise.resolve(selectProfileById(profileId)).catch((error) => {
      console.warn('AppBase: falha ao selecionar perfil', error);
    });
  }

  function handleProfileSelectorNew(event) {
    if (event) {
      event.preventDefault();
    }
    resolveProfileSelection({ profileId: null, state: getEmptyState() });
  }

  function handleProfileSelectorKeydown(event) {
    if (!isProfileSelectorOpen()) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleProfileSelectorNew();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const container = elements.profileSelectorDialog || elements.profileSelectorOverlay;
    if (!container) {
      return;
    }
    const focusable = getFocusableElements(container);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || !container.contains(active)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }
    if (active === last || !container.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }

  async function handleProfileSwitch(event) {
    if (event) {
      event.preventDefault();
      if (event.currentTarget) {
        applyButtonFeedback(event.currentTarget);
      }
    }
    clearLoginFeedback();
    const profilesSnapshot = availableProfiles
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        if (entry.id === activeProfileId) {
          return { ...entry, state: normaliseState(state) };
        }
        return { ...entry };
      })
      .filter(Boolean);
    if (
      activeProfileId &&
      !profilesSnapshot.some((profile) => profile && profile.id === activeProfileId)
    ) {
      profilesSnapshot.push({
        id: activeProfileId,
        state: normaliseState(state),
        updatedAt: state.lastLogin || nowIso(),
      });
    }
    try {
      const selection = await promptProfileSelection(profilesSnapshot, { forceDialog: true });
      if (!selection) {
        return;
      }
      const applied = applySelectedProfile(selection);
      if (applied?.profileId) {
        const existing = findProfileById(applied.profileId);
        if (existing) {
          updateAvailableProfiles({ ...existing, state: applied.state });
        }
      }
    } catch (error) {
      console.warn('AppBase: falha ao alternar perfis', error);
    }
  }

  function promptProfileSelection(profiles, { forceDialog = false } = {}) {
    const sorted = sortProfileSummaries(Array.isArray(profiles) ? profiles : []);
    availableProfiles = sorted;
    const canOpen = Boolean(elements.profileSelectorOverlay && elements.profileSelectorList);
    if (!canOpen) {
      const fallback = sorted[0] || { id: null, state: getEmptyState() };
      return Promise.resolve({ profileId: fallback.id ?? null, state: fallback.state });
    }
    if (!forceDialog && sorted.length <= 1) {
      const fallback = sorted[0] || { id: null, state: getEmptyState() };
      return Promise.resolve({ profileId: fallback.id ?? null, state: fallback.state });
    }
    return new Promise((resolve) => {
      profileSelectionResolver = (selection) => {
        resolve(selection);
      };
      openProfileSelector();
    });
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

  async function handleSessionLogin(event) {
    if (event && event.currentTarget) {
      applyButtonFeedback(event.currentTarget);
    }
    if (!hasUser()) {
      setLoginFeedback('error', SESSION_LOGIN_ERROR_KEY);
      return;
    }
    if (isLoggedIn()) {
      setLoginFeedback('success', SESSION_LOGIN_ALREADY_ACTIVE_KEY);
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
        lastLogin: timestamp,
        sessionActive: true,
        history: nextHistory,
      };
    });
    setLoginFeedback('success', SESSION_LOGIN_SUCCESS_KEY);
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

  window.addEventListener('app:header:action:click', (event) => {
    const actionId = event?.detail?.id;
    if (actionId === 'app.locale') {
      if (isHeaderMenuCompact()) {
        openHeaderMenu();
      }
      return;
    }
    collapseHeaderMenuForAction();
  });

  window.addEventListener('app:i18n:locale_changed', (event) => {
    const detailLocale = event?.detail?.locale;
    const currentLocale = detailLocale || getActiveLocale();
    const shouldLog =
      stateHydrated &&
      localeSyncInitialised &&
      currentLocale &&
      currentLocale !== lastLocaleSeen;
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
    renderMiniAppRail();
    if (currentLocale) {
      lastLocaleSeen = currentLocale;
    }
  });

  if (headerMenuMedia) {
    if (typeof headerMenuMedia.addEventListener === 'function') {
      headerMenuMedia.addEventListener('change', handleHeaderMenuMediaChange);
    } else if (typeof headerMenuMedia.addListener === 'function') {
      headerMenuMedia.addListener(handleHeaderMenuMediaChange);
    }
  }

  if (miniAppMenuMedia) {
    if (typeof miniAppMenuMedia.addEventListener === 'function') {
      miniAppMenuMedia.addEventListener('change', handleMiniAppMenuMediaChange);
    } else if (typeof miniAppMenuMedia.addListener === 'function') {
      miniAppMenuMedia.addListener(handleMiniAppMenuMediaChange);
    }
  }

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

    if (elements.headerMenuToggle) {
      elements.headerMenuToggle.addEventListener('click', (event) => {
        event.preventDefault();
        applyButtonFeedback(event.currentTarget);
        toggleHeaderMenu();
      });
    }

    if (elements.miniAppMenuToggle) {
      elements.miniAppMenuToggle.addEventListener('click', (event) => {
        event.preventDefault();
        applyButtonFeedback(event.currentTarget);
        toggleMiniAppMenu();
      });
    }

    if (elements.miniAppMenuClose) {
      elements.miniAppMenuClose.addEventListener('click', (event) => {
        event.preventDefault();
        applyButtonFeedback(event.currentTarget);
        closeMiniAppMenu({ focusToggle: true });
      });
    }

    if (elements.headerActions) {
      elements.headerActions.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button || button === elements.headerMenuToggle) {
          return;
        }
        const actionId = button.getAttribute('data-action-id');
        if (actionId === 'app.locale') {
          if (isHeaderMenuCompact()) {
            openHeaderMenu();
          }
          return;
        }
        collapseHeaderMenuForAction();
      });
    }

    if (elements.panelAccess) {
      elements.panelAccess.addEventListener('click', (event) => {
        event.preventDefault();
        applyButtonFeedback(event.currentTarget);
        collapseHeaderMenuForAction();
        togglePanelAccess();
      });
    }

    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', (event) => {
        event.preventDefault();
        applyButtonFeedback(event.currentTarget);
        collapseHeaderMenuForAction();
        const nextTheme =
          currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
        setTheme(nextTheme);
      });
    }

    if (elements.fullscreenToggle) {
      elements.fullscreenToggle.addEventListener('click', (event) => {
        collapseHeaderMenuForAction();
        handleFullscreenToggle(event);
      });
    }

    if (elements.stageClose) {
      elements.stageClose.addEventListener('click', (event) => {
        event.preventDefault();
        handleStageClose();
      });
    }

    if (elements.sessionLoginButton) {
      elements.sessionLoginButton.addEventListener('click', (event) => {
        event.preventDefault();
        void handleSessionLogin(event);
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

    if (elements.profileManageButton) {
      elements.profileManageButton.addEventListener('click', (event) => {
        void handleProfileSwitch(event);
      });
    }

    if (elements.profileSelectorList) {
      elements.profileSelectorList.addEventListener('click', handleProfileSelectorListClick);
    }
    if (elements.profileSelectorNewButton) {
      elements.profileSelectorNewButton.addEventListener('click', handleProfileSelectorNew);
    }
    if (elements.profileSelectorOverlay) {
      elements.profileSelectorOverlay.addEventListener('keydown', handleProfileSelectorKeydown);
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

  async function resolveInitialProfile() {
    let profiles = [];
    try {
      profiles = await listStoredProfiles();
    } catch (error) {
      console.warn('AppBase: falha ao listar perfis persistidos', error);
    }
    const normalisedProfiles = sortProfileSummaries(
      profiles.map((profile) => ({
        ...profile,
        state: normaliseState(profile?.state),
      }))
    );
    availableProfiles = normalisedProfiles;
    if (!normalisedProfiles.length) {
      return { state: getEmptyState(), profileId: null };
    }
    const selection = await promptProfileSelection(normalisedProfiles, { forceDialog: false });
    const profileId = selection?.profileId ?? null;
    const resolvedState = selection?.state
      ? normaliseState(selection.state)
      : getEmptyState();
    if (profileId) {
      const existing = normalisedProfiles.find((profile) => profile.id === profileId);
      if (existing) {
        updateAvailableProfiles({ ...existing, state: resolvedState });
      }
    }
    return { state: resolvedState, profileId };
  }

  async function boot() {
    try {
      const resolved = await resolveInitialProfile();
      state = normaliseState(resolved.state);
      activeProfileId = resolved.profileId;
    } catch (error) {
      console.warn('AppBase: falha ao carregar estado persistido', error);
      state = getEmptyState();
      activeProfileId = null;
    }

    stateHydrated = true;

    panelOpen = hasUser(state) && state.sessionActive;

    await initialiseMiniApps();

    if (typeof miniAppChangeUnsubscribe === 'function') {
      try {
        miniAppChangeUnsubscribe();
      } catch (error) {
        console.error('AppBase: falha ao encerrar observador de miniapps', error);
      }
    }

    miniAppChangeUnsubscribe = AppBase.onChange((event) => {
      if (!event || (event.type !== 'boot' && event.type !== 'toggle')) {
        return;
      }
      const enabled = Array.isArray(event.enabled)
        ? event.enabled
        : AppBase.getEnabledMiniApps();
      if (!miniAppState.activeKey || !enabled.includes(miniAppState.activeKey)) {
        miniAppState.activeKey = enabled[0] ?? miniAppState.activeKey;
      }
      renderMiniAppRail();
    });

    AppBase.boot(MINIAPP_BOOT_CONFIG);

    const enabledMiniApps = AppBase.getEnabledMiniApps();
    if (enabledMiniApps.length && !miniAppState.activeKey) {
      miniAppState.activeKey = enabledMiniApps[0];
      renderMiniAppRail();
    }

    initialiseHeaderMenuState();
    initialiseMiniAppMenuState();
    setTheme(currentTheme, { persist: false });
    updateUI();
    initialiseFullscreenToggle();
    registerEventListeners();
  }

  boot().catch((error) => {
    console.error('AppBase: falha ao inicializar aplicativo', error);
  });
})();
