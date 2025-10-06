(function () {
  const formatDateTime = (date = new Date()) => {
    const day = date.toLocaleDateString('pt-BR');
    const time = date.toLocaleTimeString('pt-BR', {
      hour12: false,
    });
    return `${day} ${time}`;
  };

  const formatTime = (date = new Date()) =>
    date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const getEventTypeLabel = (type) => {
    if (!type) return '';
    if (type === 'account_created') {
      return 'Cadastro';
    }
    return type;
  };

  function createStore(initialState) {
    let state = clone(initialState);
    const listeners = new Set();

    return {
      getState() {
        return state;
      },
      setState(updater) {
        const nextState =
          typeof updater === 'function' ? updater(state) : clone(updater);
        state = nextState;
        listeners.forEach((listener) => listener(state));
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  }

  const initialState = {
    user: {
      id: 'u1',
      nome: 'Fabio',
      nomeCompleto: 'Fabio Henrique',
      email: 'fabio@5horas.app',
      telefone: '+55 11 99999-0000',
      conta: '5Horas',
    },
    auth: {
      hasAccount: true,
      isAuthenticated: true,
    },
    status: {
      conexao: 'ok',
      syncOn: false,
      backupOn: false,
      lastLogin: '05/10/2025 09:12:00',
      lastSync: '',
      lastBackup: '',
    },
    sync: {
      provider: 'Google Drive',
      pendenciasOffline: 0,
      devices: [
        {
          id: 'd1',
          nome: 'Notebook',
          ultimaSync: '05/10/2025 09:10:00',
          habilitado: true,
        },
        {
          id: 'd2',
          nome: 'Cliente web',
          ultimaSync: '05/10/2025 09:40:00',
          habilitado: true,
        },
        {
          id: 'd3',
          nome: 'Mobile iOS',
          ultimaSync: '04/10/2025 22:05:11',
          habilitado: false,
        },
      ],
      historico: [
        {
          id: 'h1',
          data: '05/10/2025 09:40:00',
          duracao: '08s',
          itens: '3 itens',
        },
        {
          id: 'h2',
          data: '05/10/2025 08:55:12',
          duracao: '14s',
          itens: '12 itens',
        },
        {
          id: 'h3',
          data: '04/10/2025 22:05:11',
          duracao: '25s',
          itens: '28 itens',
        },
      ],
    },
    backup: {
      destino: 'Servidor 5Horas',
      total: '—',
      historico: [
        {
          id: 'b1',
          data: '04/10/2025 23:20:00',
          tipo: 'Incremental',
          tamanho: '1,4 GB',
          status: 'Concluído',
        },
        {
          id: 'b2',
          data: '03/10/2025 23:18:11',
          tipo: 'Completo',
          tamanho: '12,8 GB',
          status: 'Concluído',
        },
        {
          id: 'b3',
          data: '02/10/2025 23:30:45',
          tipo: 'Incremental',
          tamanho: '1,1 GB',
          status: 'Concluído',
        },
      ],
    },
    net: {
      endpoint: 'api.marco.local',
      regiao: 'br-south',
      lat: '42ms',
      perdas: '0%',
    },
    sec: {
      ultimoAcesso: '05/10/2025 09:12:00',
      sessoes: 3,
      tokenExpira: '31/12/2025 23:59',
      escopos: 'read:store, write:sync',
    },
    sessions: {
      devices: [
        {
          id: 's1',
          nome: 'Notebook Fabio',
          local: 'São Paulo, BR',
          ultimoAcesso: '05/10/2025 09:12:00',
        },
        {
          id: 's2',
          nome: 'Cliente web',
          local: 'São Paulo, BR',
          ultimoAcesso: '05/10/2025 09:40:00',
        },
        {
          id: 's3',
          nome: 'Mobile iOS',
          local: 'Campinas, BR',
          ultimoAcesso: '04/10/2025 22:05:11',
        },
      ],
    },
    eventos: [
      { time: '09:41', type: 'Backup', msg: 'Backup concluído em 12s', src: 'agente#1' },
      { time: '09:40', type: 'Sync', msg: 'Sync aplicado: 3 registros', src: 'cliente-web' },
      { time: '09:12', type: 'Login', msg: 'Login bem-sucedido', src: 'Fabio · 187.22.10.4' },
      { time: '08:55', type: 'Ping', msg: 'Ping servidor: 41ms', src: 'probe' },
      { time: '08:40', type: 'Backup', msg: 'Backup agendado iniciado', src: 'agente#1' },
      { time: '08:35', type: 'Sync', msg: 'Sync diferido aguardando rede', src: 'cliente-mobile' },
      { time: '08:20', type: 'Login', msg: 'Sessão autenticada', src: 'Fabio · 187.22.10.4' },
      { time: '07:58', type: 'Ping', msg: 'Ping servidor: 45ms', src: 'probe' },
      { time: '07:15', type: 'Backup', msg: 'Backup incremental iniciado', src: 'agente#1' },
      { time: '07:00', type: 'Sync', msg: 'Sync automático concluído', src: 'cliente-web' },
      { time: '06:45', type: 'Ping', msg: 'Ping servidor: 44ms', src: 'probe' },
      { time: '06:20', type: 'Login', msg: 'Sessão encerrada por inatividade', src: 'Mobile iOS' },
    ],
  };

  function createServices(store) {
    return {
      getEstado() {
        const state = store.getState();
        return Promise.resolve({
          status: clone(state.status),
          sync: clone(state.sync),
          backup: clone(state.backup),
          net: clone(state.net),
          sec: clone(state.sec),
        });
      },
      getEventos() {
        return Promise.resolve(clone(store.getState().eventos));
      },
      putSync({ on, provider }) {
        const state = store.getState();
        const now = formatDateTime();
        const historyEntry = on
          ? {
              id: `h-${Date.now()}`,
              data: now,
              duracao: '09s',
              itens: '5 itens',
            }
          : null;
        return Promise.resolve({
          status: {
            ...state.status,
            syncOn: on,
            lastSync: on ? now : state.status.lastSync,
          },
          sync: {
            ...state.sync,
            provider: provider ?? state.sync.provider,
            historico:
              historyEntry !== null
                ? [historyEntry, ...state.sync.historico].slice(0, 8)
                : state.sync.historico,
          },
        });
      },
      putBackup({ on }) {
        const state = store.getState();
        const now = formatDateTime();
        const historyEntry = on
          ? {
              id: `b-${Date.now()}`,
              data: now,
              tipo: 'Incremental',
              tamanho: '1,2 GB',
              status: 'Concluído',
            }
          : null;
        return Promise.resolve({
          status: {
            ...state.status,
            backupOn: on,
            lastBackup: on ? now : state.status.lastBackup,
          },
          backup: {
            ...state.backup,
            historico:
              historyEntry !== null
                ? [historyEntry, ...state.backup.historico].slice(0, 8)
                : state.backup.historico,
          },
        });
      },
      putUser(payload) {
        const state = store.getState();
        return Promise.resolve({
          user: {
            ...state.user,
            ...payload,
          },
        });
      },
      registerAccount(payload) {
        const now = formatDateTime();
        const nomeCompleto = (payload.nomeCompleto || '').trim();
        const primeiroNome = nomeCompleto.split(/\s+/).filter(Boolean)[0] || 'Usuário';
        const contaBase = (payload.email || '').split('@')[0] || primeiroNome.toLowerCase();
        const state = store.getState();
        return Promise.resolve({
          user: {
            id: `u-${Date.now()}`,
            nome: primeiroNome,
            nomeCompleto: nomeCompleto || primeiroNome,
            email: payload.email || '',
            telefone: payload.telefone || '',
            conta: contaBase || 'nova-conta',
          },
          status: {
            conexao: 'ok',
            syncOn: false,
            backupOn: false,
            lastLogin: now,
            lastSync: '',
            lastBackup: '',
          },
          sessions: { devices: [] },
          sec: {
            ...state.sec,
            ultimoAcesso: now,
            sessoes: 0,
          },
          auth: {
            hasAccount: true,
            isAuthenticated: true,
          },
          event: {
            type: 'account_created',
            msg: `Conta criada para ${primeiroNome}`,
            src: 'Painel de controle',
          },
        });
      },
      deleteSession(id) {
        const state = store.getState();
        const devices = state.sessions.devices.filter((device) => device.id !== id);
        return Promise.resolve({
          sessions: { devices },
          sec: { ...state.sec, sessoes: devices.length },
        });
      },
      deleteAllSessions() {
        const state = store.getState();
        return Promise.resolve({
          sessions: { devices: [] },
          sec: { ...state.sec, sessoes: 0 },
        });
      },
      putSyncDevice(id, habilitado) {
        const state = store.getState();
        const devices = state.sync.devices.map((device) =>
          device.id === id ? { ...device, habilitado } : device
        );
        return Promise.resolve({
          sync: { ...state.sync, devices },
        });
      },
    };
  }

  function createActions(store, services) {
    const appendEvent = (events, type, msg, src = 'Painel de controle') => [
      { time: formatTime(), type, msg, src },
      ...events,
    ];

    return {
      toggleSync(on) {
        return services.putSync({ on }).then((payload) => {
          store.setState((state) => ({
            ...state,
            status: payload.status,
            sync: payload.sync,
            eventos: appendEvent(
              state.eventos,
              'Sync',
              on ? 'Sync ativada pelo painel' : 'Sync desativada pelo painel'
            ),
          }));
        });
      },
      setSyncProvider(provider) {
        return services
          .putSync({ on: store.getState().status.syncOn, provider })
          .then((payload) => {
            store.setState((state) => ({
              ...state,
              status: payload.status,
              sync: payload.sync,
              eventos: appendEvent(
                state.eventos,
                'Sync',
                `Provedor de sync alterado para ${provider}`
              ),
            }));
          });
      },
      toggleBackup(on) {
        return services.putBackup({ on }).then((payload) => {
          store.setState((state) => ({
            ...state,
            status: payload.status,
            backup: payload.backup,
            eventos: appendEvent(
              state.eventos,
              'Backup',
              on ? 'Backup ativado pelo painel' : 'Backup desativado pelo painel'
            ),
          }));
        });
      },
      saveLogin(payload) {
        return services.putUser(payload).then((response) => {
          store.setState((state) => ({
            ...state,
            user: response.user,
            eventos: appendEvent(state.eventos, 'Login', 'Dados de login atualizados'),
          }));
        });
      },
      registerUser(payload) {
        return services.registerAccount(payload).then((response) => {
          store.setState((state) => ({
            ...state,
            user: response.user,
            status: response.status,
            sessions: response.sessions,
            sec: response.sec,
            auth: response.auth,
            eventos: appendEvent(
              state.eventos,
              response.event.type,
              response.event.msg,
              response.event.src
            ),
          }));
        });
      },
      logoff() {
        store.setState((state) => ({
          ...state,
          eventos: appendEvent(state.eventos, 'Login', 'Logoff solicitado'),
        }));
      },
      killSessions() {
        return services.deleteAllSessions().then((payload) => {
          store.setState((state) => ({
            ...state,
            sessions: payload.sessions,
            sec: payload.sec,
            eventos: appendEvent(
              state.eventos,
              'Login',
              'Todas as sessões foram encerradas'
            ),
          }));
        });
      },
      disconnectSession(id) {
        const current = store.getState();
        const device = current.sessions.devices.find((entry) => entry.id === id);
        const label = device ? device.nome : id;
        return services.deleteSession(id).then((payload) => {
          store.setState((state) => ({
            ...state,
            sessions: payload.sessions,
            sec: payload.sec,
            eventos: appendEvent(
              state.eventos,
              'Login',
              `Sessão desconectada (${label})`
            ),
          }));
        });
      },
      toggleSyncDevice(id, habilitado) {
        const current = store.getState();
        const device = current.sync.devices.find((entry) => entry.id === id);
        const label = device ? device.nome : id;
        return services.putSyncDevice(id, habilitado).then((payload) => {
          store.setState((state) => ({
            ...state,
            sync: payload.sync,
            eventos: appendEvent(
              state.eventos,
              'Sync',
              `${habilitado ? 'Habilitado' : 'Desabilitado'} sync em ${label}`
            ),
          }));
        });
      },
      exportEvents(count) {
        store.setState((state) => ({
          ...state,
          eventos: appendEvent(
            state.eventos,
            'Sync',
            `Eventos exportados (${count} linhas)`
          ),
        }));
      },
      changePassword() {
        store.setState((state) => ({
          ...state,
          eventos: appendEvent(state.eventos, 'Login', 'Pedido de troca de senha'),
        }));
      },
    };
  }

  const defaultStore = createStore(initialState);
  const defaultServices = createServices(defaultStore);

  const uiState = {
    eventsSearch: '',
    eventsType: 'all',
    sort: { key: 'time', direction: 'desc' },
    loginFeedback: { message: '', type: null },
    loginMode: 'login',
  };

  const elements = {};
  let listeners = [];
  let unsubscribe = null;
  let activeStore = null;
  let activeServices = null;
  let actions = null;
  let panelOpen = false;
  let currentEventsView = [];
  let openOverlayId = null;
  let lastOverlayTrigger = null;
  let menuOpen = false;

  function cacheElements() {
    const card = document.querySelector('[data-miniapp="painel"]');
    const stage = document.getElementById('painel-stage');
    const stageEmpty = document.querySelector('[data-stage-empty]');
    const loginForm = document.querySelector('[data-login-form]');
    const loginOverlay = document.querySelector('[data-overlay="login"]');

    Object.assign(elements, {
      app: document.querySelector('.ac-app'),
      card,
      togglePanel: card?.querySelector('[data-toggle-panel]') || null,
      userName: card?.querySelector('[data-user-name]') || null,
      cardMeta: {
        login: {
          container: card?.querySelector('[data-meta="login"]') || null,
          value: card?.querySelector('[data-meta-value="login"]') || null,
        },
        sync: {
          container: card?.querySelector('[data-meta="sync"]') || null,
          value: card?.querySelector('[data-meta-value="sync"]') || null,
        },
        backup: {
          container: card?.querySelector('[data-meta="backup"]') || null,
          value: card?.querySelector('[data-meta-value="backup"]') || null,
        },
      },
      kpis: {
        conexao: card?.querySelector('[data-kpi="conexao"] .ac-dot') || null,
        sync: card?.querySelector('[data-kpi="sync"] .ac-dot') || null,
        backup: card?.querySelector('[data-kpi="backup"] .ac-dot') || null,
      },
      stage,
      stageEmpty,
      stageTitle: stage?.querySelector('#painel-stage-title') || null,
      loginUser: stage?.querySelector('[data-login-user]') || null,
      loginAccount: stage?.querySelector('[data-login-account]') || null,
      loginLast: stage?.querySelector('[data-login-last]') || null,
      syncLast: stage?.querySelector('[data-sync-last]') || null,
      syncProvider: stage?.querySelector('[data-sync-provider]') || null,
      syncPending: stage?.querySelector('[data-sync-pending]') || null,
      backupLast: stage?.querySelector('[data-backup-last]') || null,
      backupDestination: stage?.querySelector('[data-backup-destination]') || null,
      backupTotal: stage?.querySelector('[data-backup-total]') || null,
      net: {
        endpoint: stage?.querySelector('[data-net-endpoint]') || null,
        regiao: stage?.querySelector('[data-net-region]') || null,
        latencia: stage?.querySelector('[data-net-latency]') || null,
        perdas: stage?.querySelector('[data-net-loss]') || null,
      },
      sec: {
        ultimo: stage?.querySelector('[data-sec-last]') || null,
        sessoes: stage?.querySelector('[data-sec-sessions]') || null,
        expira: stage?.querySelector('[data-sec-expire]') || null,
        escopos: stage?.querySelector('[data-sec-scopes]') || null,
      },
      events: {
        search: stage?.querySelector('[data-events-search]') || null,
        type: stage?.querySelector('[data-events-type]') || null,
        body: stage?.querySelector('[data-events-body]') || null,
        sortButtons: stage
          ? Array.from(stage.querySelectorAll('[data-sort]'))
          : [],
      },
      overlays: {
        login: loginOverlay,
        sync: document.querySelector('[data-overlay="sync"]'),
        backup: document.querySelector('[data-overlay="backup"]'),
      },
      login: {
        form: loginForm,
        fields: {
          nome: loginForm?.querySelector('[name="nome"]') || null,
          email: loginForm?.querySelector('[name="email"]') || null,
          telefone: loginForm?.querySelector('[name="telefone"]') || null,
          senha: loginForm?.querySelector('[name="senha"]') || null,
          confirmacao: loginForm?.querySelector('[name="confirmacao"]') || null,
        },
        devicesBody: document.querySelector('[data-login-devices-body]'),
        title: document.getElementById('login-dialog-title'),
        subtitle: document.querySelector('[data-auth-subtitle]'),
        feedback: document.querySelector('[data-auth-feedback]'),
        primaryAction: loginOverlay?.querySelector('[data-action="login-save"]') || null,
        sheet: document.querySelector('[data-auth-overlay]'),
        overlay: loginOverlay,
        visibility: {
          login: loginOverlay
            ? Array.from(loginOverlay.querySelectorAll('[data-auth-visibility="login"]'))
            : [],
          register: loginOverlay
            ? Array.from(loginOverlay.querySelectorAll('[data-auth-visibility="register"]'))
            : [],
        },
      },
      syncOverlay: {
        provider: document.querySelector('[data-sync-provider]'),
        devicesBody: document.querySelector('[data-sync-devices-body]'),
        historyBody: document.querySelector('[data-sync-history-body]'),
        title: document.getElementById('sync-dialog-title'),
      },
      backupOverlay: {
        historyBody: document.querySelector('[data-backup-history-body]'),
        title: document.getElementById('backup-dialog-title'),
      },
      systemMenu: document.querySelector('[data-system-menu]'),
      systemMenuPanel: document.querySelector('[data-system-menu-panel]'),
    });
  }

  function setDotState(dot, ok) {
    if (!dot) return;
    dot.classList.toggle('ac-dot--ok', ok);
    dot.classList.toggle('ac-dot--crit', !ok);
  }

  function updateLoginVisibility(mode) {
    uiState.loginMode = mode;
    const loginElements = elements.login;
    if (!loginElements) return;
    if (loginElements.sheet) {
      loginElements.sheet.setAttribute('data-auth-mode', mode);
    }
    if (loginElements.overlay) {
      loginElements.overlay.setAttribute('data-auth-mode', mode);
    }
    loginElements.visibility?.login?.forEach((node) => {
      node.hidden = mode !== 'login';
    });
    loginElements.visibility?.register?.forEach((node) => {
      node.hidden = mode !== 'register';
    });
    const button = loginElements.primaryAction;
    if (button) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = mode === 'register' ? 'Criar conta' : 'Salvar';
    }
  }

  function setLoginPrimaryBusy(isBusy) {
    const button = elements.login?.primaryAction;
    if (!button) return;
    button.disabled = isBusy;
    if (isBusy) {
      button.setAttribute('aria-busy', 'true');
    } else {
      button.removeAttribute('aria-busy');
    }
    const mode = uiState.loginMode;
    if (mode === 'register') {
      button.textContent = isBusy ? 'Criando conta…' : 'Criar conta';
    } else {
      button.textContent = isBusy ? 'Salvando…' : 'Salvar';
    }
  }

  function clearLoginFieldValidity() {
    const fields = elements.login?.fields;
    if (!fields) return;
    Object.values(fields).forEach((field) => {
      if (field) {
        field.removeAttribute('aria-invalid');
      }
    });
  }

  function markFieldInvalid(field) {
    if (!field) return;
    field.setAttribute('aria-invalid', 'true');
  }

  function applyLoginFeedback() {
    const feedback = elements.login?.feedback;
    if (!feedback) return;
    const { message, type } = uiState.loginFeedback;
    feedback.classList.remove('ac-feedback--error', 'ac-feedback--success');
    if (!message) {
      feedback.hidden = true;
      feedback.textContent = '';
      return;
    }
    feedback.hidden = false;
    feedback.textContent = message;
    if (type === 'error') {
      feedback.classList.add('ac-feedback--error');
    } else if (type === 'success') {
      feedback.classList.add('ac-feedback--success');
    }
  }

  function setLoginFeedback(type, message) {
    uiState.loginFeedback = {
      type: type && message ? type : null,
      message: message || '',
    };
    applyLoginFeedback();
  }

  function renderCard(state) {
    if (!elements.card) return;
    const hasAccount = state.auth?.hasAccount !== false && Boolean(state.user?.id);
    const user = state.user || {};
    if (elements.userName) {
      elements.userName.textContent = user.nome || '—';
    }
    if (elements.cardMeta.login.value) {
      elements.cardMeta.login.value.textContent = hasAccount
        ? state.status.lastLogin
        : '—';
    }
    if (elements.cardMeta.login.container) {
      elements.cardMeta.login.container.hidden = !hasAccount;
    }
    if (elements.cardMeta.sync.value) {
      elements.cardMeta.sync.value.textContent = state.status.lastSync || '';
    }
    if (elements.cardMeta.sync.container) {
      elements.cardMeta.sync.container.hidden = !state.status.lastSync;
    }
    if (elements.cardMeta.backup.value) {
      elements.cardMeta.backup.value.textContent = state.status.lastBackup || '';
    }
    if (elements.cardMeta.backup.container) {
      elements.cardMeta.backup.container.hidden = !state.status.lastBackup;
    }
    setDotState(elements.kpis.conexao, state.status.conexao === 'ok');
    setDotState(elements.kpis.sync, state.status.syncOn);
    setDotState(elements.kpis.backup, state.status.backupOn);
  }

  function renderStage(state) {
    if (!elements.stage) return;
    const hasAccount = state.auth?.hasAccount !== false && Boolean(state.user?.id);
    const user = state.user || {};
    if (elements.loginUser) {
      elements.loginUser.textContent = user.nome || '—';
    }
    if (elements.loginAccount) {
      elements.loginAccount.textContent = hasAccount ? user.conta || '—' : '—';
    }
    if (elements.loginLast) {
      elements.loginLast.textContent = hasAccount ? state.status.lastLogin : '—';
    }

    if (elements.syncProvider) {
      elements.syncProvider.textContent = state.sync.provider;
    }
    if (elements.syncPending) {
      elements.syncPending.textContent = String(state.sync.pendenciasOffline);
    }
    if (elements.syncLast) {
      elements.syncLast.textContent = state.status.lastSync;
      const wrap = elements.syncLast.closest('div');
      if (wrap) wrap.hidden = !state.status.lastSync;
    }

    if (elements.backupLast) {
      elements.backupLast.textContent = state.status.lastBackup;
      const wrap = elements.backupLast.closest('div');
      if (wrap) wrap.hidden = !state.status.lastBackup;
    }
    if (elements.backupDestination) {
      elements.backupDestination.textContent = state.backup.destino;
    }
    if (elements.backupTotal) {
      elements.backupTotal.textContent = state.backup.total;
    }

    if (elements.net.endpoint) {
      elements.net.endpoint.textContent = state.net.endpoint;
    }
    if (elements.net.regiao) {
      elements.net.regiao.textContent = state.net.regiao;
    }
    if (elements.net.latencia) {
      elements.net.latencia.textContent = state.net.lat;
    }
    if (elements.net.perdas) {
      elements.net.perdas.textContent = state.net.perdas;
    }

    if (elements.sec.ultimo) {
      elements.sec.ultimo.textContent = state.sec.ultimoAcesso;
    }
    if (elements.sec.sessoes) {
      elements.sec.sessoes.textContent = String(state.sec.sessoes);
    }
    if (elements.sec.expira) {
      elements.sec.expira.textContent = state.sec.tokenExpira;
    }
    if (elements.sec.escopos) {
      elements.sec.escopos.textContent = state.sec.escopos;
    }

    updateToggleGroup('sync', state.status.syncOn);
    updateToggleGroup('backup', state.status.backupOn);

    renderEventsTable(state);
  }

  function updateToggleGroup(type, isOn) {
    document
      .querySelectorAll(`[data-toggle="${type}"]`)
      .forEach((button) => {
        button.setAttribute('aria-pressed', String(isOn));
        const label = button.querySelector('.ac-pill-toggle__text');
        if (label) {
          label.textContent = isOn
            ? button.dataset.labelOn
            : button.dataset.labelOff;
        }
      });
  }

  function updateSortIndicators() {
    elements.events.sortButtons.forEach((button) => {
      const key = button.dataset.sort;
      const indicator = button.querySelector('span');
      if (!indicator) return;
      if (uiState.sort.key === key) {
        indicator.textContent = uiState.sort.direction === 'asc' ? '↑' : '↓';
      } else {
        indicator.textContent = '↕';
      }
    });
  }

  function renderEventsTable(state) {
    if (!elements.events.body) return;
    const searchTerm = uiState.eventsSearch.trim().toLowerCase();
    const typeFilter = uiState.eventsType;
    const filtered = state.eventos.filter((event) => {
      const matchesType = typeFilter === 'all' || event.type === typeFilter;
      if (!matchesType) return false;
      if (!searchTerm) return true;
      const haystack = `${event.time} ${event.type} ${getEventTypeLabel(
        event.type
      )} ${event.msg} ${event.src}`
        .toLowerCase();
      return haystack.includes(searchTerm);
    });

    const sorted = filtered.slice().sort((a, b) => {
      const { key, direction } = uiState.sort;
      const dir = direction === 'asc' ? 1 : -1;
      if (key === 'time') {
        const toMinutes = (value) => {
          const [hours, minutes] = value.split(':').map(Number);
          return hours * 60 + minutes;
        };
        return (toMinutes(a.time) - toMinutes(b.time)) * dir;
      }
      if (key === 'type') {
        return (
          getEventTypeLabel(a.type).localeCompare(getEventTypeLabel(b.type), 'pt-BR', {
            sensitivity: 'base',
            numeric: true,
          }) * dir
        );
      }
      return (
        a[key].localeCompare(b[key], 'pt-BR', {
          sensitivity: 'base',
          numeric: true,
        }) * dir
      );
    });

    currentEventsView = sorted.map((event) => ({
      ...event,
      displayType: getEventTypeLabel(event.type),
    }));

    const tbody = elements.events.body;
    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    currentEventsView.forEach((event) => {
      const tr = document.createElement('tr');
      tr.dataset.type = (event.type || '').toLowerCase();
      const columns = [
        event.time,
        event.displayType || event.type,
        event.msg,
        event.src,
      ];
      columns.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
    updateSortIndicators();
  }

  function renderLoginOverlay(state) {
    if (!elements.login.form) return;
    clearLoginFieldValidity();
    const fields = elements.login.fields;
    const user = state.user || {};
    const hasAccount = state.auth?.hasAccount !== false && Boolean(user.id);
    const mode = hasAccount ? 'login' : 'register';

    updateLoginVisibility(mode);

    if (fields.nome) fields.nome.value = user.nomeCompleto || '';
    if (fields.email) fields.email.value = user.email || '';
    if (fields.telefone) fields.telefone.value = user.telefone || '';
    if (fields.senha) {
      if (mode === 'login') {
        fields.senha.value = '********';
        fields.senha.disabled = true;
        fields.senha.required = false;
        fields.senha.setAttribute('aria-disabled', 'true');
      } else {
        fields.senha.value = '';
        fields.senha.disabled = false;
        fields.senha.required = true;
        fields.senha.removeAttribute('aria-disabled');
      }
      fields.senha.removeAttribute('aria-invalid');
    }
    if (fields.confirmacao) {
      if (mode === 'login') {
        fields.confirmacao.value = '';
        fields.confirmacao.disabled = true;
        fields.confirmacao.required = false;
      } else {
        fields.confirmacao.disabled = false;
        fields.confirmacao.required = true;
      }
      fields.confirmacao.removeAttribute('aria-invalid');
    }

    if (elements.login.title) {
      elements.login.title.textContent =
        mode === 'login'
          ? `Login — ${user.nome || 'Conta'}`
          : 'Cadastro de acesso';
    }
    if (elements.login.subtitle) {
      elements.login.subtitle.textContent =
        mode === 'login'
          ? 'Atualize os dados de acesso da conta atual.'
          : 'Crie sua conta para acessar o painel.';
    }

    applyLoginFeedback();

    const tbody = elements.login.devicesBody;
    if (!tbody) return;
    tbody.innerHTML = '';
    if (mode !== 'login') {
      return;
    }
    const fragment = document.createDocumentFragment();
    const devices = state.sessions?.devices || [];
    devices.forEach((device) => {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = device.nome;
      const local = document.createElement('td');
      local.textContent = device.local;
      const last = document.createElement('td');
      last.textContent = device.ultimoAcesso;
      const actionsCell = document.createElement('td');
      actionsCell.className = 'ac-table__actions';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ac-btn';
      btn.dataset.sessionDisconnect = device.id;
      btn.textContent = 'Desconectar';
      actionsCell.appendChild(btn);
      tr.append(name, local, last, actionsCell);
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
  }

  function renderSyncOverlay(state) {
    if (elements.syncOverlay.title) {
      elements.syncOverlay.title.textContent = `Sincronização — ${state.user.nome}`;
    }
    if (elements.syncOverlay.provider) {
      elements.syncOverlay.provider.value = state.sync.provider;
    }

    const devicesBody = elements.syncOverlay.devicesBody;
    if (devicesBody) {
      devicesBody.innerHTML = '';
      const fragment = document.createDocumentFragment();
      state.sync.devices.forEach((device) => {
        const tr = document.createElement('tr');
        const name = document.createElement('td');
        name.textContent = device.nome;
        const last = document.createElement('td');
        last.textContent = device.ultimaSync;
        const toggleCell = document.createElement('td');
        toggleCell.className = 'ac-table__actions';
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'ac-pill-toggle ac-pill-toggle--inline';
        toggle.dataset.syncDevice = device.id;
        toggle.dataset.labelOn = 'Habilitado';
        toggle.dataset.labelOff = 'Desativado';
        toggle.setAttribute('aria-pressed', String(device.habilitado));
        const dot = document.createElement('span');
        dot.className = 'ac-pill-toggle__dot';
        dot.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.className = 'ac-pill-toggle__text';
        label.textContent = device.habilitado ? 'Habilitado' : 'Desativado';
        toggle.append(dot, label);
        toggleCell.appendChild(toggle);
        tr.append(name, last, toggleCell);
        fragment.appendChild(tr);
      });
      devicesBody.appendChild(fragment);
    }

    const historyBody = elements.syncOverlay.historyBody;
    if (historyBody) {
      historyBody.innerHTML = '';
      const fragment = document.createDocumentFragment();
      state.sync.historico.forEach((entry) => {
        const tr = document.createElement('tr');
        ['data', 'duracao', 'itens'].forEach((key) => {
          const td = document.createElement('td');
          td.textContent = entry[key];
          tr.appendChild(td);
        });
        fragment.appendChild(tr);
      });
      historyBody.appendChild(fragment);
    }
  }

  function renderBackupOverlay(state) {
    if (elements.backupOverlay.title) {
      elements.backupOverlay.title.textContent = `Backup — ${state.user.nome}`;
    }
    const historyBody = elements.backupOverlay.historyBody;
    if (!historyBody) return;
    historyBody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    state.backup.historico.forEach((entry) => {
      const tr = document.createElement('tr');
      ['data', 'tipo', 'tamanho', 'status'].forEach((key) => {
        const td = document.createElement('td');
        td.textContent = entry[key];
        tr.appendChild(td);
      });
      fragment.appendChild(tr);
    });
    historyBody.appendChild(fragment);
  }

  function render(state) {
    renderCard(state);
    renderStage(state);
    renderLoginOverlay(state);
    renderSyncOverlay(state);
    renderBackupOverlay(state);
  }

  function openPanel() {
    if (!elements.card || !elements.stage || !elements.togglePanel) return;
    panelOpen = true;
    elements.card.classList.add('is-active');
    elements.card.setAttribute('aria-current', 'page');
    elements.togglePanel.setAttribute('aria-expanded', 'true');
    elements.togglePanel.setAttribute('aria-label', 'Recolher painel de controle');
    elements.stage.hidden = false;
    if (elements.stageEmpty) {
      elements.stageEmpty.hidden = true;
    }
    requestAnimationFrame(() => {
      elements.stageTitle?.focus();
    });
  }

  function closePanel() {
    if (!elements.card || !elements.stage || !elements.togglePanel) return;
    panelOpen = false;
    elements.card.classList.remove('is-active');
    elements.card.removeAttribute('aria-current');
    elements.togglePanel.setAttribute('aria-expanded', 'false');
    elements.togglePanel.setAttribute('aria-label', 'Expandir painel de controle');
    elements.stage.hidden = true;
    if (elements.stageEmpty) {
      elements.stageEmpty.hidden = false;
    }
  }

  function togglePanelState() {
    if (panelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function closeOverlay() {
    if (!openOverlayId) return;
    const overlay = elements.overlays[openOverlayId];
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.removeEventListener('click', handleOverlayBackdrop, true);
    document.removeEventListener('keydown', handleOverlayEsc, true);
    if (openOverlayId === 'login') {
      setLoginPrimaryBusy(false);
      setLoginFeedback(null, '');
    }
    if (lastOverlayTrigger && typeof lastOverlayTrigger.focus === 'function') {
      lastOverlayTrigger.focus();
    }
    openOverlayId = null;
    lastOverlayTrigger = null;
  }

  function openOverlay(id, trigger) {
    const overlay = elements.overlays[id];
    if (!overlay || openOverlayId === id) return;
    closeOverlay();
    overlay.setAttribute('aria-hidden', 'false');
    overlay.addEventListener('click', handleOverlayBackdrop, true);
    document.addEventListener('keydown', handleOverlayEsc, true);
    const title = overlay.querySelector('.ac-sheet__title');
    requestAnimationFrame(() => {
      title?.focus();
    });
    openOverlayId = id;
    lastOverlayTrigger = trigger;
  }

  function handleOverlayEsc(event) {
    if (event.key === 'Escape') {
      closeOverlay();
    }
  }

  function handleOverlayBackdrop(event) {
    const sheet = event.currentTarget.querySelector('.ac-sheet');
    if (sheet && !sheet.contains(event.target)) {
      closeOverlay();
    }
  }

  function addListener(target, type, handler, options) {
    if (!target) return;
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  }

  function handleCardClick(event) {
    if (event.target.closest('[data-toggle-panel]')) return;
    openPanel();
  }

  function handleTogglePanelButton(event) {
    event.stopPropagation();
    togglePanelState();
  }

  function handleToggleClick(event) {
    if (!actions) return;
    const button = event.target.closest('[data-toggle]');
    if (!button) return;
    const type = button.dataset.toggle;
    if (type === 'sync') {
      actions.toggleSync(!activeStore.getState().status.syncOn);
    } else if (type === 'backup') {
      actions.toggleBackup(!activeStore.getState().status.backupOn);
    }
  }

  function handleOverlayOpen(event) {
    const trigger = event.target.closest('[data-overlay-open]');
    if (!trigger) return;
    const id = trigger.dataset.overlayOpen;
    if (id === 'login') {
      setLoginFeedback(null, '');
    }
    openOverlay(id, trigger);
  }

  function handleOverlayClose(event) {
    if (event.target.closest('[data-overlay-close]')) {
      closeOverlay();
    }
  }

  function handleLoginActions(event) {
    if (!actions) return;
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.dataset.action;
    if (action === 'login-save') {
      if (!elements.login.form || !activeStore) return;
      const formData = new FormData(elements.login.form);
      const state = activeStore.getState();
      const hasAccount =
        state.auth?.hasAccount !== false && Boolean(state.user?.id);
      const fields = elements.login.fields;
      if (!fields) return;
      if (!hasAccount) {
        clearLoginFieldValidity();
        const nomeCompleto = (formData.get('nome') || '').trim();
        const email = (formData.get('email') || '').toString().trim();
        const telefone = (formData.get('telefone') || '').toString().trim();
        const senha = (formData.get('senha') || '').toString();
        const confirmacao = (formData.get('confirmacao') || '').toString();
        if (fields.nome) fields.nome.value = nomeCompleto;
        if (fields.email) fields.email.value = email;
        if (fields.telefone) fields.telefone.value = telefone;
        const errors = [];
        const invalidFields = [];
        const pushInvalid = (field) => {
          if (field && !invalidFields.includes(field)) {
            invalidFields.push(field);
          }
        };

        if (!nomeCompleto) {
          errors.push('Informe o nome completo.');
          markFieldInvalid(fields.nome);
          pushInvalid(fields.nome);
        }
        if (!email) {
          errors.push('Informe um e-mail.');
          markFieldInvalid(fields.email);
          pushInvalid(fields.email);
        } else if (fields.email && !fields.email.checkValidity()) {
          errors.push('Informe um e-mail válido.');
          markFieldInvalid(fields.email);
          pushInvalid(fields.email);
        }
        if (!senha) {
          errors.push('Defina uma senha.');
          markFieldInvalid(fields.senha);
          pushInvalid(fields.senha);
        }
        if (!confirmacao) {
          errors.push('Confirme a senha.');
          markFieldInvalid(fields.confirmacao);
          pushInvalid(fields.confirmacao);
        }
        if (senha && confirmacao && senha !== confirmacao) {
          errors.push('As senhas precisam ser iguais.');
          markFieldInvalid(fields.senha);
          markFieldInvalid(fields.confirmacao);
          pushInvalid(fields.senha);
          pushInvalid(fields.confirmacao);
        }

        if (errors.length) {
          setLoginFeedback('error', errors.join(' '));
          invalidFields[0]?.focus();
          return;
        }

        setLoginFeedback(null, '');
        setLoginPrimaryBusy(true);
        actions
          .registerUser({
            nomeCompleto,
            email,
            telefone,
            senha,
          })
          .then(() => {
            setLoginFeedback('success', 'Conta criada com sucesso!');
            setTimeout(() => {
              closeOverlay();
              setLoginFeedback(null, '');
            }, 600);
          })
          .catch((error) => {
            console.error(error);
            setLoginFeedback(
              'error',
              'Não foi possível criar a conta. Tente novamente.'
            );
          })
          .finally(() => {
            setLoginPrimaryBusy(false);
          });
        return;
      }

      actions
        .saveLogin({
          nomeCompleto: formData.get('nome') || '',
          email: formData.get('email') || '',
          telefone: formData.get('telefone') || '',
        })
        .then(() => {
          setLoginFeedback('success', 'Dados de login atualizados.');
        })
        .catch((error) => {
          console.error(error);
          setLoginFeedback(
            'error',
            'Não foi possível atualizar os dados de login agora.'
          );
        });
    } else if (action === 'login-logoff') {
      actions.logoff();
    } else if (action === 'sessions-kill') {
      actions.killSessions();
    } else if (action === 'login-change-password') {
      actions.changePassword();
    }
  }

  function handleSessionDisconnect(event) {
    if (!actions) return;
    const trigger = event.target.closest('[data-session-disconnect]');
    if (!trigger) return;
    actions.disconnectSession(trigger.dataset.sessionDisconnect);
  }

  function handleSyncProviderChange(event) {
    if (!actions) return;
    if (event.target === elements.syncOverlay.provider) {
      actions.setSyncProvider(event.target.value);
    }
  }

  function handleSyncDeviceToggle(event) {
    if (!actions) return;
    const button = event.target.closest('[data-sync-device]');
    if (!button) return;
    const current = button.getAttribute('aria-pressed') === 'true';
    actions.toggleSyncDevice(button.dataset.syncDevice, !current);
  }

  function handleEventsFilter() {
    if (!activeStore) return;
    uiState.eventsSearch = elements.events.search?.value || '';
    renderEventsTable(activeStore.getState());
  }

  function handleEventsType() {
    if (!activeStore) return;
    uiState.eventsType = elements.events.type?.value || 'all';
    renderEventsTable(activeStore.getState());
  }

  function handleSort(event) {
    if (!activeStore) return;
    const button = event.target.closest('[data-sort]');
    if (!button) return;
    const key = button.dataset.sort;
    if (uiState.sort.key === key) {
      uiState.sort.direction = uiState.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      uiState.sort.key = key;
      uiState.sort.direction = 'asc';
    }
    renderEventsTable(activeStore.getState());
  }

  function escapeCsvValue(value) {
    if (value.includes(";") || value.includes("\"") || value.includes("\\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  function handleExportTrigger(event) {
    if (event.target.closest('[data-export-events]')) {
      handleExport();
    }
  }

  function handleExport() {
    if (!actions) return;
    const rows = currentEventsView;
    const header = ['Hora', 'Tipo', 'Mensagem', 'Origem'];
    const csvRows = [header.join(';')];
    rows.forEach((row) => {
      csvRows.push(
        [row.time, row.displayType || row.type, row.msg, row.src]
          .map((value) => escapeCsvValue(String(value)))
          .join(';')
      );
    });
    const blob = new Blob([csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eventos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    actions.exportEvents(rows.length);
  }

  function handleMenuClick(event) {
    event.stopPropagation();
    menuOpen = !menuOpen;
    if (elements.systemMenu) {
      elements.systemMenu.setAttribute('aria-expanded', String(menuOpen));
    }
    if (elements.systemMenuPanel) {
      elements.systemMenuPanel.hidden = !menuOpen;
    }
  }

  function handleDocumentClick(event) {
    if (!menuOpen) return;
    if (
      event.target.closest('[data-system-menu]') ||
      event.target.closest('[data-system-menu-panel]')
    ) {
      return;
    }
    menuOpen = false;
    if (elements.systemMenu) {
      elements.systemMenu.setAttribute('aria-expanded', 'false');
    }
    if (elements.systemMenuPanel) {
      elements.systemMenuPanel.hidden = true;
    }
  }

  function mount(container, storeInstance) {
    cacheElements(container);
    if (!elements.card || !elements.stage) return;
    activeStore = storeInstance || defaultStore;
    activeServices = storeInstance ? createServices(activeStore) : defaultServices;
    actions = createActions(activeStore, activeServices);

    listeners.forEach((remove) => remove());
    listeners = [];
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    addListener(elements.card, 'click', handleCardClick);
    addListener(elements.togglePanel, 'click', handleTogglePanelButton);
    addListener(elements.app, 'click', handleToggleClick);
    addListener(elements.app, 'click', handleOverlayOpen);
    addListener(elements.app, 'click', handleOverlayClose);
    addListener(elements.app, 'click', handleLoginActions);
    addListener(elements.app, 'click', handleSessionDisconnect);
    addListener(elements.app, 'click', handleSyncDeviceToggle);
    addListener(elements.syncOverlay.provider, 'change', handleSyncProviderChange);
    addListener(elements.events.search, 'input', handleEventsFilter);
    addListener(elements.events.type, 'change', handleEventsType);
    elements.events.sortButtons.forEach((button) => {
      addListener(button, 'click', handleSort);
    });
    addListener(elements.app, 'click', handleExportTrigger);
    addListener(elements.systemMenu, 'click', handleMenuClick);
    addListener(document, 'click', handleDocumentClick);

    unsubscribe = activeStore.subscribe(render);
    render(activeStore.getState());
    openPanel();
  }

  function unmount() {
    closeOverlay();
    listeners.forEach((remove) => remove());
    listeners = [];
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    activeStore = null;
    activeServices = null;
    actions = null;
    menuOpen = false;
    if (elements.systemMenu) {
      elements.systemMenu.setAttribute('aria-expanded', 'false');
    }
    if (elements.systemMenuPanel) {
      elements.systemMenuPanel.hidden = true;
    }
    closePanel();
  }

  window.PainelMiniApp = {
    mount,
    unmount,
    store: defaultStore,
    services: defaultServices,
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.PainelMiniApp.mount();
  });
})();
