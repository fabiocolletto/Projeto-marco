const DB_NAME = 'marco-appbase';
const DB_VERSION = 1;
const STORE_NAME = 'state';
const STORAGE_KEY = 'marco-appbase:user';

let openDatabasePromise = null;

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

function readLegacyState() {
  if (!hasLocalStorage()) {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.warn('AppBaseStorage: falha ao ler dados legados do localStorage', error);
    return null;
  }
}

function writeLegacyState(value) {
  if (!hasLocalStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('AppBaseStorage: falha ao gravar dados no localStorage de contingência', error);
  }
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
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
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

function putState(database, value) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, STORAGE_KEY);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error || request.error);
    };

    transaction.onabort = () => {
      reject(transaction.error || request.error);
    };

    request.onerror = () => {
      // O erro também será capturado pelos handlers de transação.
    };
  });
}

async function migrateLegacyState(database) {
  const legacyState = readLegacyState();
  if (!legacyState) {
    return null;
  }
  if (!database) {
    return legacyState;
  }
  try {
    await putState(database, legacyState);
  } catch (error) {
    console.warn('AppBaseStorage: falha ao migrar dados do localStorage para IndexedDB', error);
  }
  writeLegacyState(legacyState);
  return legacyState;
}

export async function loadState() {
  const database = await openDatabase();
  if (!database) {
    return readLegacyState();
  }

  return new Promise((resolve) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(STORAGE_KEY);

    let resolved = false;

    const finish = (value) => {
      if (!resolved) {
        resolved = true;
        resolve(value || null);
      }
    };

    request.onsuccess = () => {
      const value = request.result;
      if (typeof value === 'undefined') {
        transaction.oncomplete = async () => {
          const migrated = await migrateLegacyState(database);
          if (migrated) {
            writeLegacyState(migrated);
          }
          finish(migrated);
        };
        return;
      }
      writeLegacyState(value);
      finish(value);
    };

    request.onerror = () => {
      console.warn('AppBaseStorage: falha ao ler dados no IndexedDB, retornando localStorage', request.error);
      finish(readLegacyState());
    };

    transaction.onerror = () => {
      console.warn('AppBaseStorage: falha na transação de leitura do IndexedDB', transaction.error);
      finish(readLegacyState());
    };
  });
}

export async function saveState(value) {
  const database = await openDatabase();
  if (!database) {
    writeLegacyState(value);
    return;
  }
  try {
    await putState(database, value);
  } catch (error) {
    console.warn('AppBaseStorage: falha ao salvar dados no IndexedDB, usando localStorage', error);
  }
  writeLegacyState(value);
}
