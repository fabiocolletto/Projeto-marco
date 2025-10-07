(function () {
  const STORAGE_KEY = 'marco-appbase:user';
  const THEME_STORAGE_KEY = 'marco-appbase:theme';
  const DEFAULT_TITLE = 'Projeto Marco — AppBase';
  const FEEDBACK_TIMEOUT = 2200;
  const BUTTON_FEEDBACK_DURATION = 900;
  const BUTTON_FEEDBACK_CLASS = 'ac-feedback-active';
  const VALID_HISTORY_TYPES = ['login', 'logout'];
  const THEMES = { LIGHT: 'light', DARK: 'dark' };
  const BRAND_ICONS = {
    [THEMES.LIGHT]: '../assets/app/brand/icon-light-500.png',
    [THEMES.DARK]: '../assets/app/brand/icon-dark-500.png',
  };
  const THEME_ICONS = { [THEMES.LIGHT]: '☀️', [THEMES.DARK]: '🌙' };
  const THEME_LABELS = {
    [THEMES.LIGHT]: 'Ativar modo escuro',
    [THEMES.DARK]: 'Ativar modo claro',
  };
  const FULLSCREEN_UI = {
    enter: {
      label: 'Ativar tela cheia',
      icon: '⛶',
    },
    exit: {
      label: 'Sair da tela cheia',
      icon: '🡼',
    },
  };
  const FULLSCREEN_MESSAGES = {
    unsupported: 'Tela cheia não é suportada neste navegador.',
    failure:
      'Não foi possível alternar o modo de tela cheia. Verifique as permissões do navegador.',
  };

  const elements = {
    card: document.querySelector('[data-miniapp="painel"]'),
    cardSubtitle: document.querySelector('[data-user-name]'),
    statusDot: document.querySelector('[data-kpi="conexao"] .ac-dot'),
    metaLogin: document.querySelector('[data-meta-value="login"]'),
    toggleButton: document.querySelector('[data-toggle-panel]'),
    stage: document.getElementById('painel-stage'),
    stageTitle: document.getElementById('painel-stage-title'),
    stageClose: document.querySelector('[data-stage-close]'),
    stageEmpty: document.querySelector('[data-stage-empty]'),
    stageEmptyMessage: document.querySelector('[data-stage-empty-message]'),
    stageEmptyAction: document.querySelector('[data-stage-empty-action]'),
    loginUser: document.querySelector('[data-login-user]'),
    loginAccount: document.querySelector('[data-login-account]'),
    loginLast: document.querySelector('[data-login-last]'),
    overlay: document.querySelector('[data-overlay="login"]'),
    overlayTitle: document.getElementById('login-dialog-title'),
    overlayForm: document.querySelector('[data-login-form]'),
    feedback: document.querySelector('[data-login-feedback]'),
    logTableWrap: document.querySelector('[data-login-log-table]'),
    logTableBody: document.querySelector('[data-login-log-body]'),
    logEmpty: Array.from(document.querySelectorAll('[data-login-log-empty]')),
    logoutButton: document.querySelector('[data-action="logout-preserve"]'),
    logoutClearButton: document.querySelector('[data-action="logout-clear"]'),
    themeToggle: document.querySelector('[data-theme-toggle]'),
    themeToggleIcon: document.querySelector('[data-theme-toggle-icon]'),
    fullscreenToggle: document.querySelector('[data-fullscreen-toggle]'),
    fullscreenToggleIcon: document.querySelector('[data-fullscreen-toggle-icon]'),
    panelAccess: document.querySelector('[data-panel-access]'),
    brandIcon: document.querySelector('[data-brand-icon]'),
    footerStatusDot: document.querySelector('[data-footer-status-dot]'),
    footerStatusLabel: document.querySelector('[data-footer-status-label]'),
  };

  const overlayOpenButtons = Array.from(
    document.querySelectorAll('[data-overlay-open="login"]')
  );
  const overlayCloseButtons = Array.from(
    document.querySelectorAll('[data-overlay-close]')
  );

  let currentTheme = normaliseTheme(resolveInitialTheme());
  let state = normaliseState(loadState());
  let panelOpen = hasUser(state) && state.sessionActive;
  let activeOverlayTrigger = null;
  let overlayVisible = false;
  let feedbackTimer = null;
  let fullscreenSupported = isFullscreenSupported();
  let fullscreenActive = isFullscreenActive();
  let fullscreenNotice = '';
  const buttonFeedbackTimers = new WeakMap();

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
    const label = THEME_LABELS[theme] || THEME_LABELS[THEMES.LIGHT];
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
    const state = active ? FULLSCREEN_UI.exit : FULLSCREEN_UI.enter;
    elements.fullscreenToggle.setAttribute('aria-pressed', active ? 'true' : 'false');
    elements.fullscreenToggle.setAttribute('aria-label', state.label);
    elements.fullscreenToggle.setAttribute('title', state.label);
    if (elements.fullscreenToggleIcon) {
      elements.fullscreenToggleIcon.textContent = state.icon;
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
      hideFullscreenToggle(FULLSCREEN_MESSAGES.unsupported);
      notifyFullscreenIssue(FULLSCREEN_MESSAGES.unsupported);
      return;
    }
    showFullscreenToggle();
    syncFullscreenStateFromDocument();
  }

  function handleFullscreenToggle(event) {
    event.preventDefault();
    applyButtonFeedback(event.currentTarget);
    if (!fullscreenSupported) {
      notifyFullscreenIssue(FULLSCREEN_MESSAGES.unsupported, { announce: true });
      hideFullscreenToggle(FULLSCREEN_MESSAGES.unsupported);
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
        notifyFullscreenIssue(FULLSCREEN_MESSAGES.failure, { announce: true });
        fullscreenSupported = false;
        hideFullscreenToggle(FULLSCREEN_MESSAGES.failure);
        syncFullscreenStateFromDocument();
      });
  }

  function handleFullscreenError(event) {
    console.warn('AppBase: erro de tela cheia', event);
    notifyFullscreenIssue(FULLSCREEN_MESSAGES.failure);
    fullscreenSupported = false;
    hideFullscreenToggle(FULLSCREEN_MESSAGES.failure);
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

  function loadState() {
    if (!canUseStorage()) {
      return getEmptyState();
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return getEmptyState();
      }
      const parsed = JSON.parse(stored);
      return normaliseState(parsed);
    } catch (error) {
      console.warn('AppBase: falha ao carregar dados persistidos', error);
      return getEmptyState();
    }
  }

  function saveState(nextState) {
    if (!canUseStorage()) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (error) {
      console.warn('AppBase: falha ao salvar dados persistidos', error);
    }
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
    const telefone =
      typeof rawUser.telefone === 'string'
        ? rawUser.telefone.trim()
        : '';

    if (!nomeCompleto && !email && !telefone) {
      return null;
    }

    return { nomeCompleto, email, telefone };
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
    return mode ? { type, timestamp, mode } : { type, timestamp };
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
    return normaliseHistoryEntry(base);
  }

  function getDisplayName(user) {
    if (!user) {
      return 'Não configurado';
    }
    if (user.nomeCompleto) {
      return user.nomeCompleto;
    }
    if (user.email) {
      const [account] = user.email.split('@');
      return account || user.email;
    }
    return 'Não configurado';
  }

  function getFirstName(user) {
    if (!user) {
      return 'Não configurado';
    }
    if (user.nomeCompleto) {
      const [first] = user.nomeCompleto.split(/\s+/);
      return first || 'Não configurado';
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
    return date.toLocaleString('pt-BR', {
      hour12: false,
    });
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function setState(updater) {
    const nextRaw =
      typeof updater === 'function' ? updater(state) : { ...state, ...updater };
    const next = normaliseState({ ...state, ...nextRaw });
    state = next;
    saveState(state);
    updateUI();
    return state;
  }

  function updateUI() {
    updateThemeAssets(currentTheme);
    updateFullscreenToggle(fullscreenActive);
    updateDocumentTitle();
    updateCard();
    updateStage();
    updateOverlayTitle();
    updateLoginFormFields();
    updateLogHistory();
    updateLogControls();
  }

  function updateDocumentTitle() {
    const title = isLoggedIn()
      ? `Projeto Marco — ${getFirstName(state.user)}`
      : DEFAULT_TITLE;
    document.title = title;
  }

  function updateCard() {
    const hasData = hasUser();
    const loggedIn = isLoggedIn();
    if (elements.card) {
      elements.card.classList.toggle('is-active', panelOpen);
    }
    if (elements.cardSubtitle) {
      elements.cardSubtitle.textContent = hasData
        ? getFirstName(state.user)
        : 'Não configurado';
    }
    if (elements.statusDot) {
      elements.statusDot.classList.toggle('ac-dot--ok', loggedIn);
      elements.statusDot.classList.toggle('ac-dot--crit', !loggedIn);
    }
    if (elements.footerStatusDot) {
      elements.footerStatusDot.classList.toggle('ac-dot--ok', loggedIn);
      elements.footerStatusDot.classList.toggle('ac-dot--crit', !loggedIn);
    }
    if (elements.metaLogin) {
      elements.metaLogin.textContent = hasData
        ? formatDateTime(state.lastLogin)
        : '—';
    }
    if (elements.footerStatusLabel) {
      elements.footerStatusLabel.textContent = loggedIn
        ? 'Conectado'
        : 'Desconectado';
    }
  }

  function updateStage() {
    const hasData = hasUser();

    if (elements.stageEmpty) {
      elements.stageEmpty.hidden = panelOpen;
    }

    if (elements.stageEmptyMessage) {
      elements.stageEmptyMessage.textContent = hasData
        ? 'Sessão encerrada. Acesse novamente para visualizar o painel.'
        : 'Nenhum usuário cadastrado. Inicie o cadastro para ativar o painel.';
    }

    if (elements.stageEmptyAction) {
      elements.stageEmptyAction.textContent = hasData
        ? 'Acessar novamente'
        : 'Começar cadastro';
    }

    if (elements.toggleButton) {
      const expanded = panelOpen;
      elements.toggleButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      elements.toggleButton.disabled = !hasData;
    }

    if (elements.panelAccess) {
      elements.panelAccess.disabled = !hasData;
    }

    if (elements.stage) {
      elements.stage.hidden = !panelOpen;
    }

    if (elements.loginUser) {
      elements.loginUser.textContent = hasData
        ? getDisplayName(state.user)
        : 'Não configurado';
    }
    if (elements.loginAccount) {
      elements.loginAccount.textContent = hasData
        ? getAccount(state.user)
        : '—';
    }
    if (elements.loginLast) {
      elements.loginLast.textContent = hasData
        ? formatDateTime(state.lastLogin)
        : '—';
    }
  }

  function updateOverlayTitle() {
    if (!elements.overlayTitle) {
      return;
    }
    const label = getDisplayName(state.user);
    elements.overlayTitle.textContent = label
      ? `Login • ${label}`
      : 'Login';
  }

  function updateLoginFormFields() {
    if (!elements.overlayForm) {
      return;
    }
    const user = state.user || { nomeCompleto: '', email: '', telefone: '' };
    const nomeInput = elements.overlayForm.querySelector('[name="nome"]');
    const emailInput = elements.overlayForm.querySelector('[name="email"]');
    const telefoneInput = elements.overlayForm.querySelector('[name="telefone"]');

    if (nomeInput && nomeInput.value !== user.nomeCompleto) {
      nomeInput.value = user.nomeCompleto;
    }
    if (emailInput && emailInput.value !== user.email) {
      emailInput.value = user.email;
    }
    if (telefoneInput && telefoneInput.value !== user.telefone) {
      telefoneInput.value = user.telefone;
    }
  }

  function getHistoryLabel(entry) {
    if (!entry) {
      return '';
    }
    if (entry.type === 'login') {
      return 'Login realizado';
    }
    if (entry.type === 'logout') {
      if (entry.mode === 'preserve') {
        return 'Logoff (dados mantidos)';
      }
      if (entry.mode === 'clear') {
        return 'Logoff (dados removidos)';
      }
      return 'Logoff';
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
  }

  function setLoginFeedback(type, message) {
    if (!elements.feedback) {
      return;
    }
    if (feedbackTimer) {
      window.clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }
    elements.feedback.textContent = message;
    elements.feedback.classList.remove('ac-feedback--success', 'ac-feedback--error');
    const className = type === 'error' ? 'ac-feedback--error' : 'ac-feedback--success';
    elements.feedback.classList.add(className);
    feedbackTimer = window.setTimeout(() => {
      clearLoginFeedback();
    }, FEEDBACK_TIMEOUT);
  }

  function openLoginOverlay(trigger) {
    if (!elements.overlay) {
      return;
    }
    activeOverlayTrigger = trigger || null;
    overlayVisible = true;
    elements.overlay.setAttribute('aria-hidden', 'false');
    clearLoginFeedback();
    updateLoginFormFields();
    window.requestAnimationFrame(() => {
      elements.overlayTitle?.focus();
    });
    document.addEventListener('keydown', handleOverlayKeydown);
  }

  function closeLoginOverlay({ focusTrigger = true } = {}) {
    if (!elements.overlay || !overlayVisible) {
      return;
    }
    overlayVisible = false;
    elements.overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', handleOverlayKeydown);
    clearLoginFeedback();
    if (focusTrigger && activeOverlayTrigger && typeof activeOverlayTrigger.focus === 'function') {
      activeOverlayTrigger.focus();
    }
    activeOverlayTrigger = null;
  }

  function handleOverlayKeydown(event) {
    if (event.key === 'Escape' && !event.defaultPrevented) {
      event.preventDefault();
      closeLoginOverlay();
    }
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    if (!elements.overlayForm) {
      return;
    }
    const formData = new FormData(elements.overlayForm);
    const nome = String(formData.get('nome') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const telefone = String(formData.get('telefone') || '').trim();

    if (!nome || !email) {
      setLoginFeedback('error', 'Informe nome e e-mail para continuar.');
      return;
    }

    const timestamp = nowIso();
    const historyEntry = createHistoryEntry('login', { timestamp });
    panelOpen = true;
    setState((previous) => {
      const nextHistory = historyEntry
        ? [historyEntry, ...(previous.history || [])]
        : previous.history || [];
      return {
        ...previous,
        user: {
          nomeCompleto: nome,
          email,
          telefone,
        },
        lastLogin: timestamp,
        sessionActive: true,
        history: nextHistory,
      };
    });

    setLoginFeedback('success', 'Cadastro atualizado com sucesso.');
  }

  function focusStageTitle() {
    if (!elements.stage || elements.stage.hidden) {
      return;
    }
    window.requestAnimationFrame(() => {
      elements.stageTitle?.focus();
    });
  }

  function openPanel() {
    const wasClosed = !panelOpen;
    panelOpen = true;
    updateUI();
    if (wasClosed) {
      focusStageTitle();
    }
  }

  function togglePanel() {
    panelOpen = !panelOpen;
    updateUI();
    if (panelOpen) {
      focusStageTitle();
    } else if (elements.toggleButton) {
      elements.toggleButton.focus();
    }
  }

  function handleCardClick(event) {
    const toggle = elements.toggleButton;
    if (toggle && (event.target === toggle || toggle.contains(event.target))) {
      return;
    }
    openPanel();
  }

  function handleStageClose() {
    panelOpen = false;
    updateUI();
    if (elements.toggleButton) {
      elements.toggleButton.focus();
    }
  }

  function handleLogoutPreserve() {
    if (!isLoggedIn()) {
      return;
    }
    const timestamp = nowIso();
    const historyEntry = createHistoryEntry('logout', {
      timestamp,
      mode: 'preserve',
    });
    panelOpen = false;
    closeLoginOverlay({ focusTrigger: false });
    setState((previous) => {
      const nextHistory = historyEntry
        ? [historyEntry, ...(previous.history || [])]
        : previous.history || [];
      return {
        ...previous,
        sessionActive: false,
        history: nextHistory,
      };
    });
  }

  function handleLogoutClear() {
    if (!hasUser()) {
      return;
    }
    panelOpen = false;
    closeLoginOverlay({ focusTrigger: false });
    setState({
      user: null,
      lastLogin: '',
      sessionActive: false,
      history: [],
    });
  }

  function handleOverlayPointer(event) {
    if (!elements.overlay || event.target !== elements.overlay) {
      return;
    }
    closeLoginOverlay();
  }

  setTheme(currentTheme, { persist: false });
  updateUI();
  initialiseFullscreenToggle();

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

  fullscreenChangeEvents.forEach((eventName) => {
    document.addEventListener(eventName, syncFullscreenStateFromDocument);
  });

  fullscreenErrorEvents.forEach((eventName) => {
    document.addEventListener(eventName, handleFullscreenError);
  });

  if (elements.card) {
    elements.card.addEventListener('click', handleCardClick);
  }

  if (elements.panelAccess) {
    elements.panelAccess.addEventListener('click', (event) => {
      event.preventDefault();
      applyButtonFeedback(event.currentTarget);
      openPanel();
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

  if (elements.toggleButton) {
    elements.toggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      applyButtonFeedback(event.currentTarget);
      togglePanel();
    });
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
      handleLogoutPreserve();
    });
  }

  if (elements.logoutClearButton) {
    elements.logoutClearButton.addEventListener('click', (event) => {
      event.preventDefault();
      handleLogoutClear();
    });
  }

  overlayOpenButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      openLoginOverlay(button);
    });
  });

  overlayCloseButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      closeLoginOverlay();
    });
  });

  if (elements.overlayForm) {
    elements.overlayForm.addEventListener('submit', handleLoginSubmit);
  }

  if (elements.overlay) {
    elements.overlay.addEventListener('mousedown', handleOverlayPointer);
  }
})();
