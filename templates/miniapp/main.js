const root = document.getElementById('app');

const ensureObject = (input) => (input && typeof input === 'object' ? input : {});

if (root) {
  root.innerHTML = `<main class="miniapp miniapp--{{SLUG}}">
    <section class="miniapp__card">
      <header class="miniapp__header">
        <span class="miniapp__badge">MiniApp</span>
        <h1>{{TITLE}}</h1>
      </header>
      <p data-i18n="description"></p>
      <p class="miniapp__lead">
        Este template já traz um indicador no rodapé com o estado do armazenamento local. Utilize-o
        para acompanhar operações de carregamento, salvamento e limpeza do perfil.
      </p>
      <div class="miniapp__actions">
        <button type="button" data-memory-action="load">Recarregar dados</button>
        <button type="button" data-memory-action="save">Simular salvamento</button>
        <button type="button" data-memory-action="clear">Limpar dados</button>
      </div>
      <p class="miniapp__hint">
        As ações acima são opcionais e servem apenas para demonstrar as transições do indicador. Substitua
        por interações reais do seu MiniApp quando começar a desenvolver.
      </p>
      <section class="miniapp__register" data-registration-panel hidden aria-hidden="true">
        <div class="miniapp__register-header">
          <h2>Crie sua conta</h2>
          <p>Preencha o formulário abaixo para cadastrar um novo usuário e começar a utilizar o MiniApp.</p>
        </div>
        <form class="miniapp__register-form" data-registration-form novalidate>
          <label class="miniapp__register-field">
            <span>Nome completo</span>
            <input type="text" name="fullName" autocomplete="name" placeholder="Digite seu nome" required />
          </label>
          <label class="miniapp__register-field">
            <span>E-mail</span>
            <input type="email" name="email" autocomplete="email" placeholder="voce@exemplo.com" required />
          </label>
          <label class="miniapp__register-field">
            <span>Senha</span>
            <input type="password" name="password" autocomplete="new-password" placeholder="Crie uma senha segura" required />
          </label>
          <button type="submit" class="miniapp__register-submit">Cadastrar</button>
        </form>
      </section>
    </section>
  </main>`;
}

const footer = document.querySelector('[data-memory-footer]');
const statusLabel = document.querySelector('[data-memory-status]');
const statusDetails = document.querySelector('[data-memory-details]');
const driverBadge = document.querySelector('[data-memory-driver]');
const userStatusLabel = document.querySelector('[data-user-status]');
const registrationPanel = document.querySelector('[data-registration-panel]');
const registrationForm = registrationPanel?.querySelector('form');

const hideRegistrationForm = () => {
  if (!registrationPanel) return;
  registrationPanel.hidden = true;
  registrationPanel.setAttribute('aria-hidden', 'true');
};

const showRegistrationForm = () => {
  if (!registrationPanel) return;
  const wasHidden = registrationPanel.hidden;
  registrationPanel.hidden = false;
  registrationPanel.removeAttribute('aria-hidden');
  if (wasHidden) {
    registrationForm?.reset?.();
    const firstField = registrationForm?.querySelector?.(
      'input, select, textarea, button:not([type="button"])',
    );
    firstField?.focus?.();
    registrationPanel.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }
};

hideRegistrationForm();

const setUserStatus = (message) => {
  if (userStatusLabel) {
    userStatusLabel.textContent = message;
  }
};

const showLoggedUserMessage = (username) => {
  hideRegistrationForm();
  setUserStatus(`Usuário logado: ${username}`);
};

const showNoUserMessage = () => {
  setUserStatus('Nenhum usuário identificado. Cadastre-se para começar.');
  showRegistrationForm();
};

const formatTime = (date) => {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch (error) {
    return date.toISOString();
  }
};

const emitStatus = (state, detail = {}) => {
  document.dispatchEvent(
    new CustomEvent('miniapp:memory-status', {
      detail: { state, ...detail },
    }),
  );
};

const setFooterState = (state, message, details, extra = {}) => {
  if (footer) {
    footer.dataset.memoryState = state;
  }
  if (statusLabel) {
    statusLabel.textContent = message;
  }
  if (statusDetails) {
    if (details) {
      statusDetails.hidden = false;
      statusDetails.textContent = details;
    } else {
      statusDetails.hidden = true;
      statusDetails.textContent = '';
    }
  }
  emitStatus(state, { message, details, ...extra });
};

const setDriver = (driver) => {
  if (footer) {
    footer.dataset.driver = driver;
  }
  if (driverBadge) {
    driverBadge.textContent =
      driver === 'indexeddb' ? 'IndexedDB ativa' : 'Armazenamento em memória';
  }
};

const importWithFallbacks = async (paths, label) => {
  const errors = [];
  for (const candidate of paths) {
    try {
      return await import(candidate);
    } catch (error) {
      errors.push({ candidate, error });
    }
  }

  const last = errors[errors.length - 1];
  if (last) {
    console.warn(`Não foi possível carregar ${label} (${last.candidate})`, last.error);
    throw last.error;
  }

  throw new Error(`Nenhum caminho disponível para ${label}`);
};

const loadProfileStoreModule = async () =>
  importWithFallbacks(
    ['../../storage/profileStore.js', '../../docs/storage/profileStore.js'],
    'o módulo de perfis',
  );

const loadIdxDbModule = async () =>
  importWithFallbacks(
    ['../../storage/indexeddb/IdxDBStore.js', '../../docs/storage/indexeddb/IdxDBStore.js'],
    'o módulo de IndexedDB',
  );

const AUTH_STORAGE_KEY = 'appbase:auth';
const MASTER_AUTH_TOKEN = 'master';
const MASTER_SETTINGS_KEY = 'masterUser';

const readAuthToken = () => {
  try {
    return globalThis.localStorage?.getItem?.(AUTH_STORAGE_KEY) ?? null;
  } catch (error) {
    console.warn('Não foi possível ler o token de autenticação', error);
    return null;
  }
};

const resolveMasterUser = async () => {
  try {
    const module = await loadIdxDbModule();
    const { openIdxDB } = module ?? {};
    if (typeof openIdxDB !== 'function') return null;

    const db = await openIdxDB();
    try {
      const store = db?.settings;
      const record = typeof store?.get === 'function' ? await store.get(MASTER_SETTINGS_KEY) : null;
      return record ?? null;
    } finally {
      await db?.close?.();
    }
  } catch (error) {
    console.warn('Não foi possível consultar o usuário master', error);
    return null;
  }
};

const resolveLoggedUser = async () => {
  const token = readAuthToken();
  if (token !== MASTER_AUTH_TOKEN) {
    showNoUserMessage();
    return null;
  }

  const master = await resolveMasterUser();
  if (master && typeof master.username === 'string' && master.username.trim()) {
    const username = master.username.trim();
    showLoggedUserMessage(username);
    return master;
  }

  showNoUserMessage();
  return null;
};

const wrapMethod = (store, methodName, { onStart, onSuccess, onError }) => {
  if (!store || typeof store[methodName] !== 'function') return;
  const original = store[methodName].bind(store);

  store[methodName] = (...args) => {
    onStart?.();
    try {
      const result = original(...args);

      const handleSuccess = (value) => {
        onSuccess?.(value);
        return value;
      };

      const handleError = (reason) => {
        onError?.(reason);
        throw reason;
      };

      if (result && typeof result.then === 'function') {
        return result.then(handleSuccess).catch(handleError);
      }

      return handleSuccess(result);
    } catch (error) {
      onError?.(error);
      throw error;
    }
  };
};

const bootstrapMemoryIndicator = async () => {
  setFooterState(
    'checking',
    'Verificando suporte ao armazenamento local…',
    'Aguarde enquanto detectamos o driver disponível.',
  );

  try {
    const module = await loadProfileStoreModule();
    const { createProfileStore, MemoryProfileStore } = module ?? {};

    if (typeof createProfileStore !== 'function') {
      throw new Error('createProfileStore não encontrado no módulo.');
    }

    const store = createProfileStore();
    const driver = store instanceof MemoryProfileStore ? 'memory' : 'indexeddb';

    setDriver(driver);

    const driverName = driver === 'indexeddb' ? 'IndexedDB' : 'memória volátil';
    const defaultDetails =
      driver === 'indexeddb'
        ? 'As informações salvas permanecem disponíveis entre sessões.'
        : 'Os dados são temporários e serão perdidos ao recarregar o MiniApp.';

    if (driver === 'indexeddb') {
      setFooterState('idle', 'IndexedDB pronta para uso.', defaultDetails, { driver });
    } else {
      setFooterState(
        'disabled',
        'IndexedDB desativada. Utilizando armazenamento em memória.',
        defaultDetails,
        { driver },
      );
    }

    wrapMethod(store, 'load', {
      onStart: () => {
        setFooterState(
          'loading',
          driver === 'indexeddb'
            ? 'Carregando dados salvos na IndexedDB…'
            : 'Carregando dados armazenados nesta sessão…',
          defaultDetails,
          { driver },
        );
      },
      onSuccess: (value) => {
        if (value && Object.keys(value).length > 0) {
          setFooterState(
            'ready',
            driver === 'indexeddb'
              ? 'Dados carregados da IndexedDB com sucesso.'
              : 'Dados recuperados da memória da sessão.',
            defaultDetails,
            { driver },
          );
        } else {
          setFooterState(
            'empty',
            driver === 'indexeddb'
              ? 'Nenhum dado salvo na IndexedDB ainda.'
              : 'Nenhum dado está armazenado nesta sessão.',
            defaultDetails,
            { driver },
          );
        }
      },
      onError: (error) => {
        console.error('Erro ao carregar dados do perfil', error);
        setFooterState(
          'error',
          driver === 'indexeddb'
            ? 'Não foi possível acessar a IndexedDB.'
            : 'Não foi possível ler os dados em memória.',
          'Verifique as permissões do navegador e tente novamente.',
          { driver },
        );
      },
    });

    wrapMethod(store, 'save', {
      onStart: () => {
        setFooterState(
          'saving',
          driver === 'indexeddb'
            ? 'Salvando dados na IndexedDB…'
            : 'Atualizando dados em memória…',
          defaultDetails,
          { driver },
        );
      },
      onSuccess: () => {
        const time = formatTime(new Date());
        setFooterState(
          'saved',
          driver === 'indexeddb'
            ? `Dados salvos na IndexedDB às ${time}.`
            : `Dados atualizados em memória às ${time}.`,
          `Última atualização registrada às ${time}.`,
          { driver, time, driverName },
        );
      },
      onError: (error) => {
        console.error('Erro ao salvar dados do perfil', error);
        setFooterState(
          'error',
          driver === 'indexeddb'
            ? 'Falha ao salvar dados na IndexedDB.'
            : 'Falha ao atualizar os dados em memória.',
          'Revise os dados enviados e tente novamente.',
          { driver },
        );
      },
    });

    wrapMethod(store, 'clear', {
      onStart: () => {
        setFooterState(
          'clearing',
          driver === 'indexeddb'
            ? 'Removendo dados armazenados na IndexedDB…'
            : 'Limpando dados da sessão em memória…',
          defaultDetails,
          { driver },
        );
      },
      onSuccess: () => {
        setFooterState(
          'empty',
          driver === 'indexeddb'
            ? 'Dados removidos da IndexedDB.'
            : 'Dados em memória limpos.',
          defaultDetails,
          { driver },
        );
      },
      onError: (error) => {
        console.error('Erro ao limpar dados do perfil', error);
        setFooterState(
          'error',
          driver === 'indexeddb'
            ? 'Não foi possível limpar os dados da IndexedDB.'
            : 'Não foi possível limpar os dados em memória.',
          'Tente novamente em instantes.',
          { driver },
        );
      },
    });

    if (typeof store.load === 'function') {
      try {
        const result = store.load();
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch (error) {
        // os estados e logs já foram atualizados pelo wrapper
      }
    }

    const actionsRoot = root?.querySelector('.miniapp__actions');
    if (actionsRoot) {
      actionsRoot.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement)) return;
        const action = target.dataset.memoryAction;
        if (!action) return;

        if (action === 'load' && typeof store.load === 'function') {
          await store.load();
        }
        if (action === 'save' && typeof store.save === 'function') {
          await store.save({ demo: true, atualizadoEm: new Date().toISOString() });
        }
        if (action === 'clear' && typeof store.clear === 'function') {
          await store.clear();
        }
      });
    }

    const expose = ensureObject(globalThis.miniApp ?? {});
    expose.profileStore = store;
    expose.memoryDriver = driver;
    expose.updateLoggedUserIndicator = resolveLoggedUser;
    const loggedUser = await resolveLoggedUser();
    expose.loggedUser = loggedUser;
    globalThis.miniApp = expose;

    return store;
  } catch (error) {
    console.error('Falha ao inicializar o indicador de memória', error);
    setFooterState(
      'error',
      'Não foi possível verificar o estado da memória local.',
      'Verifique se os scripts de armazenamento estão acessíveis.',
    );
    const expose = ensureObject(globalThis.miniApp ?? {});
    expose.updateLoggedUserIndicator = resolveLoggedUser;
    const loggedUser = await resolveLoggedUser();
    expose.loggedUser = loggedUser;
    globalThis.miniApp = expose;
    return null;
  }
};

bootstrapMemoryIndicator();
