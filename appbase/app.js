(function () {
  const STORAGE_KEY = 'marco-appbase:user';
  const DEFAULT_TITLE = 'Projeto Marco — AppBase';
  const FEEDBACK_TIMEOUT = 2200;
  const VALID_HISTORY_TYPES = ['login', 'logout'];

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
    breadcrumbsSecondary: document.getElementById('breadcrumbs-secondary'),
    logTableWrap: document.querySelector('[data-login-log-table]'),
    logTableBody: document.querySelector('[data-login-log-body]'),
    logEmpty: Array.from(document.querySelectorAll('[data-login-log-empty]')),
    logoutButton: document.querySelector('[data-action="logout-preserve"]'),
    logoutClearButton: document.querySelector('[data-action="logout-clear"]'),
  };

  const overlayOpenButtons = Array.from(
    document.querySelectorAll('[data-overlay-open="login"]')
  );
  const overlayCloseButtons = Array.from(
    document.querySelectorAll('[data-overlay-close]')
  );

  let state = normaliseState(loadState());
  let panelOpen = hasUser(state) && state.sessionActive;
  let activeOverlayTrigger = null;
  let overlayVisible = false;
  let feedbackTimer = null;

  function canUseStorage() {
    try {
      return typeof window !== 'undefined' && 'localStorage' in window;
    } catch (error) {
      return false;
    }
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
    updateDocumentTitle();
    updateCard();
    updateStage();
    updateOverlayTitle();
    updateBreadcrumbs();
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
    if (elements.metaLogin) {
      elements.metaLogin.textContent = hasData
        ? formatDateTime(state.lastLogin)
        : '—';
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
    const label = hasUser() ? getDisplayName(state.user) : 'Não configurado';
    elements.overlayTitle.textContent = `Login — ${label}`;
  }

  function updateBreadcrumbs() {
    if (!elements.breadcrumbsSecondary) {
      return;
    }
    if (hasUser()) {
      elements.breadcrumbsSecondary.textContent = `Cadastro de ${getFirstName(
        state.user
      )}`;
    } else {
      elements.breadcrumbsSecondary.textContent = 'Cadastro';
    }
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

  updateUI();

  if (elements.card) {
    elements.card.addEventListener('click', handleCardClick);
  }

  if (elements.toggleButton) {
    elements.toggleButton.addEventListener('click', (event) => {
      event.preventDefault();
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
