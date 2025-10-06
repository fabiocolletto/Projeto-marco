(function () {
  const formatDateTime = (date = new Date()) => {
    const day = date.toLocaleDateString('pt-BR');
    const time = date.toLocaleTimeString('pt-BR', {
      hour12: false,
    });
    return `${day} ${time}`;
  };

  const formatDateTimeIso = (iso) => {
    if (!iso) return '';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '';
    return formatDateTime(parsed);
  };

  const formatTime = (date = new Date()) =>
    date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const getDisplayValue = (value, fallback = '—') => {
    if (value === null || value === undefined) {
      return fallback;
    }
    if (typeof value === 'number') {
      return Number.isNaN(value) ? fallback : String(value);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : fallback;
    }
    return value;
  };

  const getConfiguredValue = (value) => getDisplayValue(value, 'Não configurado');

  const getUserDisplayName = (user) => {
    if (!user) return 'Não configurado';
    const name = getConfiguredValue(user.nome);
    if (name !== 'Não configurado') {
      return name.trim();
    }
    const full = getConfiguredValue(user.nomeCompleto);
    if (full !== 'Não configurado') {
      return full.split(/\s+/)[0];
    }
    return 'Não configurado';
  };

  const persistence = (() => {
    const DB_NAME = 'marco-appbase';
    const STORE_NAME = 'snapshots';
    const DOC_KEY = 'app-state';
    const supported =
      typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

    let dbPromise = null;
    const status = {
      supported,
      available: supported,
      hasSnapshot: false,
      dirty: false,
      lastSnapshotAt: '',
      lastError: supported ? '' : 'IndexedDB não suportado pelo navegador',
      lastCheck: '',
    };
    const subscribers = new Set();

    const nowIso = () => new Date().toISOString();

    const notify = (update = {}) => {
      const changed = Object.assign(status, update);
      subscribers.forEach((listener) => {
        listener({ ...changed });
      });
    };

    const handleError = (message, error, extra = {}) => {
      console.error(message, error);
      const fallback = 'Falha ao acessar o armazenamento local';
      const lastErrorMessage =
        (error && (error.message || String(error))) || fallback;
      notify({
        available: false,
        lastError: lastErrorMessage,
        lastCheck: nowIso(),
        ...extra,
      });
    };

    function openDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = () => {
          notify({ available: true, lastError: '', lastCheck: nowIso() });
          resolve(request.result);
        };
        request.onerror = () => {
          handleError('AppBase: falha ao abrir IndexedDB', request.error);
          reject(request.error);
        };
      });
    }

    async function getDatabase() {
      if (!supported) return null;
      if (!dbPromise) {
        dbPromise = openDatabase().catch((error) => {
          handleError('AppBase: falha ao abrir IndexedDB', error);
          return null;
        });
      }
      return dbPromise;
    }

    async function loadSnapshot() {
      if (!supported) return null;
      const db = await getDatabase();
      if (!db) return null;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(DOC_KEY);
        request.onsuccess = () => {
          const result = request.result;
          notify({
            available: true,
            hasSnapshot: Boolean(result),
            dirty: false,
            lastSnapshotAt: result?.updatedAt || '',
            lastError: '',
            lastCheck: nowIso(),
          });
          resolve(result ? clone(result) : null);
        };
        request.onerror = () => {
          handleError('AppBase: falha ao carregar backup local', request.error);
          reject(request.error);
        };
      }).catch((error) => {
        handleError('AppBase: falha ao carregar backup local', error);
        return null;
      });
    }

    async function saveSnapshot(state) {
      if (!supported) return;
      const db = await getDatabase();
      if (!db) return;
      const snapshot = {
        user: clone(state.user),
        status: clone({
          conexao: state.status.conexao,
          syncOn: state.status.syncOn,
          backupOn: state.status.backupOn,
          lastLogin: state.status.lastLogin,
          lastSync: state.status.lastSync,
          lastBackup: state.status.lastBackup,
        }),
        backup: clone({
          destino: state.backup.destino,
          total: state.backup.total,
          historico: state.backup.historico,
        }),
        sync: clone({
          provider: state.sync.provider,
          historico: state.sync.historico,
          devices: state.sync.devices,
        }),
        sessions: clone(state.sessions),
        updatedAt: new Date().toISOString(),
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(snapshot, DOC_KEY);
        request.onsuccess = () => {
          notify({
            available: true,
            hasSnapshot: true,
            dirty: false,
            lastSnapshotAt: snapshot.updatedAt,
            lastError: '',
            lastCheck: nowIso(),
          });
          resolve();
        };
        request.onerror = () => {
          handleError('AppBase: falha ao salvar backup local', request.error, {
            dirty: true,
          });
          reject(request.error);
        };
      }).catch((error) => {
        handleError('AppBase: falha ao salvar backup local', error, {
          dirty: true,
        });
      });
    }

    return {
      isAvailable: supported,
      getStatus() {
        return { ...status };
      },
      onStatusChange(listener) {
        if (typeof listener !== 'function') return () => {};
        subscribers.add(listener);
        listener({ ...status });
        return () => {
          subscribers.delete(listener);
        };
      },
      markDirty() {
        if (!supported) return;
        if (!status.dirty) {
          notify({ dirty: true, lastCheck: nowIso() });
        }
      },
      loadSnapshot,
      saveSnapshot,
    };
  })();

  const isUserRegistered = (state) =>
    Boolean(state?.user && state.user.id && state.user.id.trim());

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
      id: '',
      nome: '',
      nomeCompleto: '',
      email: '',
      telefone: '',
      conta: '',
    },
    status: {
      conexao: 'offline',
      syncOn: false,
      backupOn: false,
      lastLogin: '',
      lastSync: '',
      lastBackup: '',
      storageAvailable: persistence.isAvailable,
      snapshotActive: false,
      snapshotDirty: false,
      storageError: persistence.isAvailable
        ? ''
        : 'IndexedDB não suportado pelo navegador',
      snapshotUpdatedAt: '',
    },
    sync: {
      provider: '',
      pendenciasOffline: 0,
      devices: [],
      historico: [],
    },
    backup: {
      destino: '',
      total: '',
      historico: [],
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
      devices: [],
    },
    eventos: [],
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
        const historico =
          historyEntry !== null
            ? [historyEntry, ...state.backup.historico].slice(0, 8)
            : state.backup.historico;
        const destino = on
          ? 'IndexedDB local'
          : state.backup.destino || 'IndexedDB local';
        const total = historico.length
          ? `${historico.length} ${historico.length === 1 ? 'documento' : 'documentos'}`
          : '';
        return Promise.resolve({
          status: {
            ...state.status,
            backupOn: on,
            lastBackup: on ? now : state.status.lastBackup,
          },
          backup: {
            ...state.backup,
            destino,
            total,
            historico,
          },
        });
      },
      putUser(payload) {
        const state = store.getState();
        const nextUser = {
          ...state.user,
          ...payload,
        };
        if (!nextUser.id) {
          nextUser.id = `u-${Date.now()}`;
        }

        const nomeCompleto =
          typeof payload.nomeCompleto === 'string'
            ? payload.nomeCompleto.trim()
            : '';
        if (nomeCompleto) {
          nextUser.nomeCompleto = nomeCompleto;
          nextUser.nome = nomeCompleto.split(/\s+/)[0];
        }

        const email =
          typeof payload.email === 'string' ? payload.email.trim() : nextUser.email;
        if (typeof email === 'string') {
          nextUser.email = email;
          if (email) {
            const [account] = email.split('@');
            if (account) {
              nextUser.conta = account;
            }
          } else if (!nextUser.conta || !nextUser.conta.trim()) {
            nextUser.conta = '';
          }
        }

        if (typeof payload.telefone === 'string') {
          nextUser.telefone = payload.telefone.trim();
        }

        return Promise.resolve({
          user: nextUser,
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

    const persist = () => {
      if (!persistence.isAvailable) return;
      persistence.saveSnapshot(store.getState());
    };

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
          persistence.markDirty();
          persist();
          return payload;
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
            persistence.markDirty();
            persist();
            return payload;
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
          persistence.markDirty();
          persist();
          return payload;
        });
      },
      saveLogin(payload) {
        return services.putUser(payload).then((response) => {
          const now = formatDateTime();
          store.setState((state) => ({
            ...state,
            user: response.user,
            status: {
              ...state.status,
              conexao: 'ok',
              lastLogin: now,
            },
            eventos: appendEvent(state.eventos, 'Login', 'Dados de login atualizados'),
          }));
          persistence.markDirty();
          persist();
          return response;
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
          persistence.markDirty();
          persist();
          return payload;
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
          persistence.markDirty();
          persist();
          return payload;
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
          persistence.markDirty();
          persist();
          return payload;
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

  let lastPersistenceStatus = persistence.getStatus();

  function mapPersistenceStatus(status) {
    return {
      storageAvailable: Boolean(status?.available),
      snapshotActive: Boolean(status?.hasSnapshot),
      snapshotDirty: Boolean(status?.dirty),
      storageError: status?.available ? '' : status?.lastError || '',
      snapshotUpdatedAt: status?.lastSnapshotAt || '',
    };
  }

  function applyPersistenceStatus(store, status) {
    if (!store || !status) return;
    const mapped = mapPersistenceStatus(status);
    const current = store.getState();
    const prev = current.status;
    if (
      prev.storageAvailable === mapped.storageAvailable &&
      prev.snapshotActive === mapped.snapshotActive &&
      prev.snapshotDirty === mapped.snapshotDirty &&
      prev.storageError === mapped.storageError &&
      prev.snapshotUpdatedAt === mapped.snapshotUpdatedAt
    ) {
      return;
    }
    store.setState((state) => ({
      ...state,
      status: {
        ...state.status,
        ...mapped,
      },
    }));
  }

  const uiState = {
    eventsSearch: '',
    eventsType: 'all',
    sort: { key: 'time', direction: 'desc' },
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

  persistence.onStatusChange((status) => {
    lastPersistenceStatus = status;
    applyPersistenceStatus(activeStore || defaultStore, status);
  });

  function cacheElements() {
    const card = document.querySelector('[data-miniapp="painel"]');
    const stage = document.getElementById('painel-stage');
    const stageEmpty = document.querySelector('[data-stage-empty]');
    const loginForm = document.querySelector('[data-login-form]');

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
      stageClose: stage?.querySelector('[data-stage-close]') || null,
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
        login: document.querySelector('[data-overlay="login"]'),
        sync: document.querySelector('[data-overlay="sync"]'),
        backup: document.querySelector('[data-overlay="backup"]'),
      },
      login: {
        form: loginForm,
        fields: {
          nome: loginForm?.querySelector('[name="nome"]') || null,
          email: loginForm?.querySelector('[name="email"]') || null,
          telefone: loginForm?.querySelector('[name="telefone"]') || null,
        },
        feedback: document.querySelector('[data-login-feedback]'),
        devicesBody: document.querySelector('[data-login-devices-body]'),
        title: document.getElementById('login-dialog-title'),
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

  function clearLoginFeedback() {
    const feedback =
      elements.login?.feedback || document.querySelector('[data-login-feedback]');
    if (!feedback) return;
    feedback.textContent = '';
    feedback.classList.remove(
      'ac-feedback--success',
      'ac-feedback--error',
      'ac-feedback--pending'
    );
  }

  function setLoginFeedback(type, message) {
    const feedback =
      elements.login?.feedback || document.querySelector('[data-login-feedback]');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.remove(
      'ac-feedback--success',
      'ac-feedback--error',
      'ac-feedback--pending'
    );
    if (type === 'success') {
      feedback.classList.add('ac-feedback--success');
    } else if (type === 'error') {
      feedback.classList.add('ac-feedback--error');
    } else if (type === 'pending') {
      feedback.classList.add('ac-feedback--pending');
    }
  }

  function setDotState(dot, ok) {
    if (!dot) return;
    dot.classList.toggle('ac-dot--ok', ok);
    dot.classList.toggle('ac-dot--crit', !ok);
  }

  function getBackupIndicator(state) {
    if (!state) {
      return { ok: false, message: '—' };
    }
    if (!isUserRegistered(state)) {
      return { ok: false, message: '—' };
    }
    const status = state.status || {};
    if (!status.backupOn) {
      return { ok: false, message: 'Backup desativado' };
    }
    if (!status.storageAvailable) {
      return {
        ok: false,
        message: status.storageError || 'IndexedDB indisponível',
      };
    }
    if (status.snapshotDirty) {
      return { ok: false, message: 'Alterações pendentes' };
    }
    if (!status.snapshotActive) {
      return { ok: false, message: 'Nenhum backup local' };
    }
    const label =
      status.lastBackup || formatDateTimeIso(status.snapshotUpdatedAt);
    return {
      ok: true,
      message: getDisplayValue(label, 'Backup atualizado'),
    };
  }

  function renderCard(state) {
    if (!elements.card) return;
    const registered = isUserRegistered(state);
    if (elements.userName) {
      elements.userName.textContent = getUserDisplayName(state.user);
    }
    if (elements.cardMeta.login.value) {
      elements.cardMeta.login.value.textContent = getDisplayValue(
        state.status.lastLogin
      );
    }
    if (elements.cardMeta.sync.value) {
      elements.cardMeta.sync.value.textContent = getDisplayValue(
        state.status.lastSync
      );
    }
    if (elements.cardMeta.sync.container) {
      elements.cardMeta.sync.container.hidden = false;
    }
    const backupIndicator = getBackupIndicator(state);
    if (elements.cardMeta.backup.value) {
      elements.cardMeta.backup.value.textContent = backupIndicator.message;
    }
    if (elements.cardMeta.backup.container) {
      elements.cardMeta.backup.container.hidden = false;
    }
    setDotState(
      elements.kpis.conexao,
      registered && state.status.conexao === 'ok'
    );
    setDotState(elements.kpis.sync, registered && state.status.syncOn);
    setDotState(elements.kpis.backup, registered && backupIndicator.ok);
  }

  function renderStage(state) {
    if (!elements.stage) return;
    if (elements.loginUser) {
      elements.loginUser.textContent = getUserDisplayName(state.user);
    }
    if (elements.loginAccount) {
      elements.loginAccount.textContent = getConfiguredValue(state.user.conta);
    }
    if (elements.loginLast) {
      elements.loginLast.textContent = getDisplayValue(state.status.lastLogin);
    }

    if (elements.syncProvider) {
      elements.syncProvider.textContent = getConfiguredValue(state.sync.provider);
    }
    if (elements.syncPending) {
      if (typeof state.sync.pendenciasOffline === 'number') {
        elements.syncPending.textContent = String(state.sync.pendenciasOffline);
      } else {
        elements.syncPending.textContent = getDisplayValue(
          state.sync.pendenciasOffline
        );
      }
    }
    if (elements.syncLast) {
      elements.syncLast.textContent = getDisplayValue(state.status.lastSync);
      const wrap = elements.syncLast.closest('div');
      if (wrap) wrap.hidden = false;
    }

    if (elements.backupLast) {
      const indicator = getBackupIndicator(state);
      elements.backupLast.textContent = indicator.message;
      const wrap = elements.backupLast.closest('div');
      if (wrap) wrap.hidden = false;
    }
    if (elements.backupDestination) {
      elements.backupDestination.textContent = state.status.storageAvailable
        ? getConfiguredValue(state.backup.destino)
        : getDisplayValue(state.status.storageError, 'IndexedDB indisponível');
    }
    if (elements.backupTotal) {
      elements.backupTotal.textContent = getDisplayValue(state.backup.total);
    }

    if (elements.net.endpoint) {
      elements.net.endpoint.textContent = getConfiguredValue(state.net.endpoint);
    }
    if (elements.net.regiao) {
      elements.net.regiao.textContent = getConfiguredValue(state.net.regiao);
    }
    if (elements.net.latencia) {
      elements.net.latencia.textContent = getDisplayValue(state.net.lat);
    }
    if (elements.net.perdas) {
      elements.net.perdas.textContent = getDisplayValue(state.net.perdas);
    }

    if (elements.sec.ultimo) {
      elements.sec.ultimo.textContent = getDisplayValue(state.sec.ultimoAcesso);
    }
    if (elements.sec.sessoes) {
      elements.sec.sessoes.textContent = getDisplayValue(state.sec.sessoes);
    }
    if (elements.sec.expira) {
      elements.sec.expira.textContent = getDisplayValue(state.sec.tokenExpira);
    }
    if (elements.sec.escopos) {
      elements.sec.escopos.textContent = getConfiguredValue(state.sec.escopos);
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
      const haystack = `${event.time} ${event.type} ${event.msg} ${event.src}`.toLowerCase();
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
      return (
        a[key].localeCompare(b[key], 'pt-BR', {
          sensitivity: 'base',
          numeric: true,
        }) * dir
      );
    });

    currentEventsView = sorted;

    const tbody = elements.events.body;
    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    sorted.forEach((event) => {
      const tr = document.createElement('tr');
      tr.dataset.type = event.type.toLowerCase();
      ['time', 'type', 'msg', 'src'].forEach((key) => {
        const td = document.createElement('td');
        td.textContent = event[key];
        tr.appendChild(td);
      });
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
    updateSortIndicators();
  }

  function renderLoginOverlay(state) {
    if (!elements.login.form) return;
    clearLoginFeedback();
    const fields = elements.login.fields;
    if (fields.nome) fields.nome.value = state.user.nomeCompleto || '';
    if (fields.email) fields.email.value = state.user.email || '';
    if (fields.telefone) fields.telefone.value = state.user.telefone || '';
    if (elements.login.title) {
      elements.login.title.textContent = `Login — ${getUserDisplayName(
        state.user
      )}`;
    }

    const tbody = elements.login.devicesBody;
    if (!tbody) return;
    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    state.sessions.devices.forEach((device) => {
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
      elements.syncOverlay.title.textContent = `Sincronização — ${getUserDisplayName(
        state.user
      )}`;
    }
    if (elements.syncOverlay.provider) {
      const provider = state.sync.provider || '';
      if (provider) {
        elements.syncOverlay.provider.value = provider;
      } else {
        elements.syncOverlay.provider.selectedIndex = -1;
      }
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
      elements.backupOverlay.title.textContent = `Backup — ${getUserDisplayName(
        state.user
      )}`;
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
    applyPanelState(panelOpen);
  }

  function applyPanelState(isOpen) {
    panelOpen = isOpen;
    if (!elements.card || !elements.stage || !elements.togglePanel) return;

    elements.card.classList.toggle('is-active', isOpen);
    if (isOpen) {
      elements.card.setAttribute('aria-current', 'page');
    } else {
      elements.card.removeAttribute('aria-current');
    }

    elements.togglePanel.setAttribute('aria-expanded', String(isOpen));
    elements.togglePanel.setAttribute(
      'aria-label',
      isOpen ? 'Recolher painel de controle' : 'Expandir painel de controle'
    );

    elements.stage.hidden = !isOpen;
    if (elements.stageEmpty) {
      elements.stageEmpty.hidden = isOpen;
    }
  }

  function openPanel() {
    applyPanelState(true);
    requestAnimationFrame(() => {
      elements.stageTitle?.focus();
    });
  }

  function closePanel() {
    applyPanelState(false);
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
    const closingId = openOverlayId;
    const overlay = elements.overlays[closingId];
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.removeEventListener('click', handleOverlayBackdrop, true);
    document.removeEventListener('keydown', handleOverlayEsc, true);
    if (lastOverlayTrigger && typeof lastOverlayTrigger.focus === 'function') {
      lastOverlayTrigger.focus();
    }
    openOverlayId = null;
    lastOverlayTrigger = null;
    if (closingId === 'login') {
      setTimeout(() => {
        clearLoginFeedback();
      }, 200);
    }
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
    if (!panelOpen) {
      openPanel();
    }
  }

  function handleTogglePanelButton(event) {
    event.stopPropagation();
    togglePanelState();
  }

  function handleStageClose(event) {
    event.preventDefault();
    closePanel();
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
    openOverlay(id, trigger);
  }

  function handleOverlayClose(event) {
    if (event.target.closest('[data-overlay-close]')) {
      closeOverlay();
    }
  }

  function processLoginSave(triggerButton) {
    if (!actions) return;
    const form =
      elements.login?.form || document.querySelector('[data-login-form]');
    if (!form) return;

    const submitBtn =
      triggerButton || form.querySelector('[data-action="login-save"]');
    const originalLabel = submitBtn ? submitBtn.textContent : '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.loading = 'true';
      submitBtn.textContent = 'Salvando…';
    }

    setLoginFeedback('pending', 'Salvando dados do usuário…');
    const formData = new FormData(form);
    return actions
      .saveLogin({
        nomeCompleto: formData.get('nome') || '',
        email: formData.get('email') || '',
        telefone: formData.get('telefone') || '',
      })
      .then(() => {
        setLoginFeedback('success', 'Dados salvos localmente em IndexedDB');
        openPanel();
      })
      .catch((error) => {
        console.error('AppBase: falha ao salvar login', error);
        setLoginFeedback(
          'error',
          'Não foi possível salvar os dados localmente. Tente novamente.'
        );
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
          submitBtn.removeAttribute('data-loading');
        }
      });
  }

  function handleLoginSubmit(event) {
    if (!actions) return;
    event.preventDefault();
    const submitter =
      event.submitter || event.target?.querySelector('[data-action="login-save"]');
    processLoginSave(submitter || null);
  }

  function handleLoginActions(event) {
    if (!actions) return;
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.dataset.action;
    if (action === 'login-save') {
      return;
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
        [row.time, row.type, row.msg, row.src]
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

  async function hydrateFromPersistence() {
    if (!activeStore) return;
    try {
      const snapshot = await persistence.loadSnapshot();
      if (snapshot) {
        activeStore.setState((state) => ({
          ...state,
          user: snapshot.user ? { ...state.user, ...snapshot.user } : state.user,
          status: snapshot.status
            ? { ...state.status, ...snapshot.status }
            : state.status,
          backup: snapshot.backup
            ? { ...state.backup, ...snapshot.backup }
            : state.backup,
          sync: snapshot.sync
            ? {
                ...state.sync,
                provider:
                  snapshot.sync.provider !== undefined
                    ? snapshot.sync.provider
                    : state.sync.provider,
                historico: Array.isArray(snapshot.sync.historico)
                  ? snapshot.sync.historico
                  : state.sync.historico,
                devices: Array.isArray(snapshot.sync.devices)
                  ? snapshot.sync.devices
                  : state.sync.devices,
              }
            : state.sync,
          sessions: snapshot.sessions
            ? {
                ...state.sessions,
                devices: Array.isArray(snapshot.sessions.devices)
                  ? snapshot.sessions.devices
                  : state.sessions.devices,
              }
            : state.sessions,
        }));
      }
      const state = activeStore.getState();
      if (!isUserRegistered(state)) {
        requestAnimationFrame(() => {
          const trigger =
            elements.stageEmpty?.querySelector('[data-overlay-open="login"]') ||
            elements.card?.querySelector('[data-overlay-open="login"]') ||
            elements.card;
          openOverlay('login', trigger || null);
        });
      }
    } catch (error) {
      console.error('AppBase: falha ao restaurar backup local', error);
    }
  }

  function mount(container, storeInstance) {
    cacheElements(container);
    if (!elements.card || !elements.stage) return;
    activeStore = storeInstance || defaultStore;
    activeServices = storeInstance ? createServices(activeStore) : defaultServices;
    actions = createActions(activeStore, activeServices);

    if (lastPersistenceStatus) {
      applyPersistenceStatus(activeStore, lastPersistenceStatus);
    }

    listeners.forEach((remove) => remove());
    listeners = [];
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    addListener(elements.card, 'click', handleCardClick);
    addListener(elements.togglePanel, 'click', handleTogglePanelButton);
    addListener(elements.stageClose, 'click', handleStageClose);
    addListener(elements.app, 'click', handleToggleClick);
    addListener(elements.app, 'click', handleOverlayOpen);
    addListener(document, 'click', handleOverlayClose);
    addListener(elements.app, 'click', handleLoginActions);
    addListener(elements.login.form, 'submit', handleLoginSubmit);
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
    hydrateFromPersistence();
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
