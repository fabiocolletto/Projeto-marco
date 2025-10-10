const DB_NAME = 'marco-appbase';
const DB_VERSION = 2;
const STORE_NAME = 'profiles';
const LEGACY_STORAGE_KEY = 'marco-appbase:user';
const PROFILES_STORAGE_KEY = 'marco-appbase:profiles';

let openDatabasePromise = null;
let migrationPromise = null;
let migrationCompleted = false;

function hasIndexedDB() {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  } catch (error) {
    return false;
  }
}

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && 'localStorage' in window;
  } catch (error) {
    return false;
  }
}

function readLegacySnapshot() {
  if (!hasLocalStorage()) {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.warn('AppBaseStorage: falha ao ler snapshot legado do localStorage', error);
    return null;
  }
}

function clearLegacySnapshot() {
  if (!hasLocalStorage()) {
    return;
  }
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    console.warn('AppBaseStorage: falha ao limpar snapshot legado do localStorage', error);
  }
}

function readProfileCollection() {
  if (!hasLocalStorage()) {
    return [];
  }
  try {
    const stored = window.localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    console.warn('AppBaseStorage: falha ao ler perfis do localStorage', error);
    return [];
  }
}

function writeProfileCollection(profiles) {
  if (!hasLocalStorage()) {
    return;
  }
  try {
    const payload = Array.isArray(profiles) ? profiles : [];
    window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('AppBaseStorage: falha ao escrever perfis no localStorage', error);
  }
}

function deriveProfileId(state, providedId) {
  if (providedId && typeof providedId === 'string') {
    return providedId.trim();
  }
  const email = state?.user?.email;
  if (typeof email === 'string' && email.trim()) {
    return email.trim().toLowerCase();
  }
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deriveProfileLabel(state) {
  const user = state?.user || {};
  if (typeof user.nomeCompleto === 'string' && user.nomeCompleto.trim()) {
    return user.nomeCompleto.trim();
  }
  if (typeof user.email === 'string' && user.email.trim()) {
    return user.email.trim();
  }
  return 'Perfil local';
}

function deriveProfileEmail(state, providedEmail) {
  if (typeof providedEmail === 'string' && providedEmail.trim()) {
    return providedEmail.trim().toLowerCase();
  }
  const email = state?.user?.email;
  if (typeof email === 'string' && email.trim()) {
    return email.trim().toLowerCase();
  }
  return '';
}

function deriveUpdatedAt(state, providedUpdatedAt) {
  if (typeof providedUpdatedAt === 'string' && providedUpdatedAt.trim()) {
    return providedUpdatedAt.trim();
  }
  const lastLogin = state?.lastLogin;
  if (typeof lastLogin === 'string' && lastLogin.trim()) {
    return lastLogin.trim();
  }
  return new Date().toISOString();
}

function normaliseProfileRecord(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const state = raw.state && typeof raw.state === 'object' ? raw.state : {};
  const id = deriveProfileId(state, raw.id);
  if (!id) {
    return null;
  }
  return {
    id,
    state,
    label: deriveProfileLabel(state),
    email: deriveProfileEmail(state, raw.email),
    updatedAt: deriveUpdatedAt(state, raw.updatedAt),
  };
}

function createProfileRecord(state, options = {}) {
  const safeState = state && typeof state === 'object' ? state : {};
  const id = deriveProfileId(safeState, options.id);
  if (!id) {
    throw new Error('Perfil inválido: identificador ausente');
  }
  return {
    id,
    state: safeState,
    label: deriveProfileLabel(safeState),
    email: deriveProfileEmail(safeState, options.email),
    updatedAt: deriveUpdatedAt(safeState, options.updatedAt),
  };
}

function sortProfiles(records) {
  return [...records].sort((a, b) => {
    if (a.updatedAt === b.updatedAt) {
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    }
    return a.updatedAt > b.updatedAt ? -1 : 1;
  });
}

function mergeProfileIntoCollection(collection, record) {
  const map = new Map();
  collection.forEach((entry) => {
    const normalised = normaliseProfileRecord(entry);
    if (normalised) {
      map.set(normalised.id, normalised);
    }
  });
  const normalisedRecord = normaliseProfileRecord(record);
  if (normalisedRecord) {
    map.set(normalisedRecord.id, normalisedRecord);
  }
  return sortProfiles(Array.from(map.values()));
}

function openDatabase() {
  if (!hasIndexedDB()) {
    return Promise.resolve(null);
  }
  if (openDatabasePromise) {
    return openDatabasePromise;
  }
  openDatabasePromise = new Promise((resolve) => {
    let request;
    try {
      request = window.indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      console.warn(
        'AppBaseStorage: falha ao iniciar IndexedDB, utilizando localStorage',
        error
      );
      resolve(null);
      return;
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      let profileStore;
      if (database.objectStoreNames.contains(STORE_NAME)) {
        profileStore = event.target.transaction.objectStore(STORE_NAME);
      } else {
        profileStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (profileStore && !profileStore.indexNames.contains('updatedAt')) {
        profileStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (profileStore && !profileStore.indexNames.contains('email')) {
        profileStore.createIndex('email', 'email', { unique: false });
      }
      if (database.objectStoreNames.contains('state')) {
        try {
          const legacyStore = event.target.transaction.objectStore('state');
          const legacyRequest = legacyStore.get(LEGACY_STORAGE_KEY);
          legacyRequest.onsuccess = () => {
            const legacyState = legacyRequest.result;
            if (legacyState) {
              try {
                const record = createProfileRecord(legacyState);
                profileStore.put(record);
              } catch (error) {
                console.warn('AppBaseStorage: falha ao migrar store legado', error);
              }
            }
          };
        } catch (error) {
          console.warn('AppBaseStorage: não foi possível migrar store legado', error);
        }
        try {
          database.deleteObjectStore('state');
        } catch (error) {
          console.warn('AppBaseStorage: falha ao remover store legado', error);
        }
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
      };
      resolve(database);
    };

    request.onerror = () => {
      console.warn('AppBaseStorage: falha ao abrir IndexedDB, utilizando localStorage', request.error);
      resolve(null);
    };

    request.onblocked = () => {
      console.warn('AppBaseStorage: abertura do IndexedDB bloqueada por outra aba');
    };
  }).catch((error) => {
    console.warn('AppBaseStorage: erro inesperado ao abrir IndexedDB', error);
    return null;
  });
  return openDatabasePromise;
}

function putProfiles(database, records) {
  if (!database) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    records.forEach((record) => {
      try {
        store.put(record);
      } catch (error) {
        console.warn('AppBaseStorage: falha ao enfileirar perfil para escrita', error);
      }
    });

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.onabort = () => {
      reject(transaction.error);
    };
  });
}

function readAllProfiles(database) {
  if (!database) {
    return Promise.resolve([]);
  }
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    let request;
    try {
      if (typeof store.getAll === 'function') {
        request = store.getAll();
        request.onsuccess = () => {
          const records = Array.isArray(request.result) ? request.result : [];
          resolve(records.map((entry) => normaliseProfileRecord(entry)).filter(Boolean));
        };
      } else {
        const results = [];
        request = store.openCursor();
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const record = normaliseProfileRecord(cursor.value);
            if (record) {
              results.push(record);
            }
            cursor.continue();
          } else {
            resolve(results);
          }
        };
      }
    } catch (error) {
      reject(error);
      return;
    }

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function getProfile(database, id) {
  if (!database) {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    let request;
    try {
      request = store.get(id);
    } catch (error) {
      reject(error);
      return;
    }

    request.onsuccess = () => {
      const record = normaliseProfileRecord(request.result);
      resolve(record);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function migrateLegacyData(database) {
  if (migrationCompleted) {
    return;
  }
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const existing = readProfileCollection().map((entry) => normaliseProfileRecord(entry)).filter(Boolean);
      const legacySnapshot = readLegacySnapshot();
      const map = new Map();

      existing.forEach((record) => {
        map.set(record.id, record);
      });

      if (legacySnapshot) {
        try {
          const record = createProfileRecord(legacySnapshot);
          map.set(record.id, record);
        } catch (error) {
          console.warn('AppBaseStorage: falha ao normalizar snapshot legado', error);
        }
      }

      const records = Array.from(map.values());
      if (database && records.length) {
        try {
          await putProfiles(database, records);
          const persisted = await readAllProfiles(database);
          writeProfileCollection(persisted);
        } catch (error) {
          console.warn('AppBaseStorage: falha ao migrar dados para IndexedDB', error);
          writeProfileCollection(records);
        }
      } else {
        writeProfileCollection(records);
      }

      if (legacySnapshot) {
        clearLegacySnapshot();
      }
      migrationCompleted = true;
    })().catch((error) => {
      console.warn('AppBaseStorage: falha ao concluir migração legada', error);
      migrationCompleted = true;
    });
  }

  try {
    await migrationPromise;
  } catch (error) {
    console.warn('AppBaseStorage: falha inesperada durante migração', error);
  }
}

function persistLocally(record) {
  const current = readProfileCollection();
  const next = mergeProfileIntoCollection(current, record);
  writeProfileCollection(next);
}

export async function listProfiles() {
  const database = await openDatabase();
  await migrateLegacyData(database);
  if (database) {
    try {
      const records = await readAllProfiles(database);
      const sorted = sortProfiles(records);
      writeProfileCollection(sorted);
      return sorted;
    } catch (error) {
      console.warn('AppBaseStorage: falha ao listar perfis no IndexedDB', error);
    }
  }
  const fallback = readProfileCollection()
    .map((entry) => normaliseProfileRecord(entry))
    .filter(Boolean);
  return sortProfiles(fallback);
}

export async function loadProfile(id) {
  if (!id) {
    return null;
  }
  const database = await openDatabase();
  await migrateLegacyData(database);
  if (database) {
    try {
      const record = await getProfile(database, id);
      if (record) {
        persistLocally(record);
        return record;
      }
    } catch (error) {
      console.warn('AppBaseStorage: falha ao carregar perfil no IndexedDB', error);
    }
  }
  const fallback = readProfileCollection()
    .map((entry) => normaliseProfileRecord(entry))
    .find((entry) => entry && entry.id === id);
  return fallback || null;
}

export async function saveProfile(state, options = {}) {
  let record;
  try {
    record = createProfileRecord(state, options);
  } catch (error) {
    console.warn('AppBaseStorage: perfil inválido para salvar', error);
    throw error;
  }
  const database = await openDatabase();
  await migrateLegacyData(database);
  if (database) {
    try {
      await putProfiles(database, [record]);
    } catch (error) {
      console.warn('AppBaseStorage: falha ao persistir perfil no IndexedDB', error);
    }
  }
  persistLocally(record);
  return record;
}
