import assert from 'node:assert/strict';
import { rm, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';

import { openIdxDB } from '../src/storage/indexeddb/IdxDBStore.js';
import { exportBackup, importBackup } from '../src/storage/backup/backupJson.js';
import { createAutoSaver } from '../src/storage/autosave/AutoSaver.js';
import { createMiniApp } from './create-miniapp.js';
import { resolveSyncProvider } from '../src/sync/SyncProvider.js';
import { sha256 } from '../src/auth/crypto.js';

type EventListener = (event: Event) => void;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const globalAny = globalThis as unknown as {
  localStorage?: Storage;
  sessionStorage?: Storage;
  navigator?: Navigator;
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
  dispatchEvent?: (event: Event) => boolean;
};

const eventListeners = new Map<string, Set<EventListener>>();

globalAny.localStorage = new MemoryStorage();
globalAny.sessionStorage = new MemoryStorage();
globalAny.navigator = ({ onLine: true } as unknown) as Navigator;
globalAny.addEventListener = (type: string, listener: EventListener) => {
  if (!eventListeners.has(type)) {
    eventListeners.set(type, new Set());
  }
  eventListeners.get(type)!.add(listener);
};
globalAny.removeEventListener = (type: string, listener: EventListener) => {
  eventListeners.get(type)?.delete(listener);
};
globalAny.dispatchEvent = (event: Event) => {
  const listeners = eventListeners.get(event.type);
  if (!listeners) return true;
  for (const listener of [...listeners]) {
    listener.call(globalThis, event);
  }
  return true;
};

const dispatchGlobalEvent = (type: string) => {
  globalAny.dispatchEvent?.(new Event(type));
};

const resetIndexedDB = async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('appbase_db');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('IndexedDB cleanup failed'));
    request.onblocked = () => resolve();
  });
};

const testMasterAuthFlow = async () => {
  await resetIndexedDB();
  const previousWindow = (globalThis as { window?: Window }).window;
  const previousDocument = (globalThis as { document?: Document }).document;
  const previousHistory = (globalThis as { history?: History }).history;
  const previousLocation = (globalThis as { location?: Location }).location;
  const previousNavigator = globalAny.navigator;
  const previousFetch = globalThis.fetch;
  const previousLocalStorage = globalAny.localStorage;
  const previousSessionStorage = globalAny.sessionStorage;
  globalAny.localStorage = new MemoryStorage();
  globalAny.sessionStorage = new MemoryStorage();

  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <div id="error-banner"></div>
      <section id="catalog"><div id="catalog-cards" role="list"></div></section>
      <section id="panel">
        <header>
          <div>
            <h2 id="panel-title">Catálogo</h2>
            <span id="panel-subtitle">Escolha um MiniApp para abrir no painel central</span>
          </div>
          <button id="panel-close" type="button" hidden>✕</button>
        </header>
        <div class="placeholder" id="panel-placeholder"><p>Escolha um MiniApp ao lado para abrir seu painel aqui.</p></div>
        <iframe id="miniapp-frame" hidden></iframe>
      </section>
      <script id="app-config" type="application/json">{"publicAdmin":false,"baseHref":"/"}</script>
    </body></html>`,
    { url: 'https://appbase.local/' },
  );

  const { window } = dom;
  Object.assign(globalThis, {
    window,
    document: window.document,
    history: window.history,
    location: window.location,
    navigator: window.navigator,
  });
  globalAny.navigator = window.navigator;
  window.document.title = 'AppBase';

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: globalAny.localStorage,
  });
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    value: globalAny.sessionStorage,
  });

  const registryPayload = {
    miniapps: [
      { id: 'public-app', name: 'Catálogo Público', path: 'miniapps/Public/manifest.json', adminOnly: false, visible: true },
      { id: 'admin-panel', name: 'Painel Administrativo', path: 'miniapps/AdminPanel/manifest.json', adminOnly: true, visible: true },
    ],
  } as const;

  const manifestPayload = {
    id: 'public-app',
    name: 'Catálogo Público',
    version: '1.0.0',
  };

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    if (url.endsWith('/miniapps/registry.json')) {
      return new Response(JSON.stringify(registryPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.endsWith('/miniapps/Public/manifest.json')) {
      return new Response(JSON.stringify(manifestPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.endsWith('/miniapps/AdminPanel/manifest.json')) {
      return new Response(JSON.stringify({ ...manifestPayload, id: 'admin-panel', name: 'Painel Administrativo' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('Not Found', { status: 404 });
  };
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    value: globalThis.fetch,
  });

  const mainModule = await import('../src/app/main.ts');
  await mainModule.bootstrap();
  await sleep(100);

  assert.equal(window.location.hash, '#/setup/master', 'primeiro acesso deve exigir cadastro master');

  const signupForm = window.document.querySelector<HTMLFormElement>('#panel-placeholder form');
  assert(signupForm, 'formulário de cadastro deve existir');
  signupForm!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(150);

  assert.equal(window.location.hash, '#/');
  await sleep(150);

  const initialCards = window.document.querySelectorAll('#catalog-cards .card');
  assert.equal(initialCards.length, 2, 'catálogo deve incluir apps públicos e privados após cadastro');

  const session = await import('../src/auth/session.js');
  session.clearMasterAuthentication();
  const gateModule = await import('../src/auth/gate.js');
  const gate = await gateModule.ensureMasterGate();
  assert.equal(gate.allowed, false, 'sem token deve exigir login');
  assert.equal(window.location.hash, '#/login/master', 'logout deve redirecionar para tela de login');
  await sleep(100);

  const loginForm = window.document.querySelector<HTMLFormElement>('#panel-placeholder form');
  assert(loginForm, 'formulário de login deve existir');
  const userInput = loginForm!.querySelector<HTMLInputElement>('input[name="username"]');
  const passInput = loginForm!.querySelector<HTMLInputElement>('input[name="password"]');
  assert(userInput && passInput, 'campos de login devem existir');
  userInput!.value = 'adm';
  passInput!.value = '0000';
  loginForm!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(200);

  assert.equal(window.location.hash, '#/');
  const cardsAfterLogin = window.document.querySelectorAll('#catalog-cards .card');
  assert.equal(cardsAfterLogin.length, 2, 'após login catálogo deve manter apps privados visíveis');

  dom.window.close();

  if (previousWindow === undefined) {
    delete (globalThis as { window?: Window }).window;
  } else {
    Object.assign(globalThis, { window: previousWindow });
  }

  if (previousDocument === undefined) {
    delete (globalThis as { document?: Document }).document;
  } else {
    Object.assign(globalThis, { document: previousDocument });
  }

  if (previousHistory === undefined) {
    delete (globalThis as { history?: History }).history;
  } else {
    Object.assign(globalThis, { history: previousHistory });
  }

  if (previousLocation === undefined) {
    delete (globalThis as { location?: Location }).location;
  } else {
    Object.assign(globalThis, { location: previousLocation });
  }

  if (previousNavigator === undefined) {
    delete globalAny.navigator;
  } else {
    globalAny.navigator = previousNavigator;
  }

  if (previousFetch) {
    globalThis.fetch = previousFetch;
  } else {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  }

  if (previousLocalStorage === undefined) {
    delete globalAny.localStorage;
  } else {
    globalAny.localStorage = previousLocalStorage;
  }
  if (previousSessionStorage === undefined) {
    delete globalAny.sessionStorage;
  } else {
    globalAny.sessionStorage = previousSessionStorage;
  }

  console.log('✓ Fluxo master offline-first (cadastro, login, catálogo completo) ok');
};

const testShellCatalogToggle = async () => {
  await resetIndexedDB();
  const previousWindow = (globalThis as { window?: Window }).window;
  const previousDocument = (globalThis as { document?: Document }).document;
  const previousHistory = (globalThis as { history?: History }).history;
  const previousLocation = (globalThis as { location?: Location }).location;
  const previousNavigator = globalAny.navigator;
  const previousFetch = globalThis.fetch;
  const previousLocalStorage = globalAny.localStorage;
  const previousSessionStorage = globalAny.sessionStorage;
  globalAny.localStorage = new MemoryStorage();
  globalAny.sessionStorage = new MemoryStorage();

  const appState = await import('../src/app/state.js');
  appState.setAppConfig({ publicAdmin: false, baseHref: '/' });
  appState.setRegistryEntries([]);
  appState.getManifestCache().clear();

  const now = new Date().toISOString();
  const deviceId = 'shell-device';
  const masterHash = await sha256(`${deviceId}:0000`);
  const db = await openIdxDB();
  await db.settings.set('masterUser', {
    id: 'master',
    username: 'adm',
    passHash: masterHash,
    createdAt: now,
    updatedAt: now,
    deviceId,
    role: 'master',
  } as any);
  await db.close();
  globalAny.localStorage.setItem('appbase:auth', 'master');
  globalAny.localStorage.setItem('appbase:deviceId', deviceId);

  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <div id="error-banner"></div>
      <section id="catalog"><div id="catalog-cards" role="list"></div></section>
      <section id="panel">
        <header>
          <div>
            <h2 id="panel-title">Catálogo</h2>
            <span id="panel-subtitle">Escolha um MiniApp para abrir no painel central</span>
          </div>
          <button id="panel-close" type="button" hidden>✕</button>
        </header>
        <div id="panel-placeholder"><p>Escolha um MiniApp ao lado para abrir seu painel aqui.</p></div>
        <iframe id="miniapp-frame" hidden></iframe>
      </section>
      <script id="app-config" type="application/json">{"publicAdmin":true,"baseHref":"/"}</script>
    </body></html>`,
    { url: 'https://appbase.local/' },
  );

  const { window } = dom;
  Object.assign(globalThis, {
    window,
    document: window.document,
    history: window.history,
    location: window.location,
    navigator: window.navigator,
  });
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: globalAny.localStorage,
  });
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    value: globalAny.sessionStorage,
  });
  window.document.title = 'AppBase';

  const { ensureMasterGate } = await import('../src/auth/gate.js');
  const gateCheck = await ensureMasterGate();
  assert.equal(gateCheck.allowed, true, 'gate deve permitir quando master pré-autenticado');

  const registryPayload = {
    miniapps: [
      {
        id: 'admin-panel',
        name: 'Painel Administrativo',
        path: 'miniapps/AdminPanel/manifest.json',
        adminOnly: true,
        visible: true,
      },
    ],
  } satisfies { miniapps: Array<{ id: string; name: string; path: string; adminOnly: boolean; visible: boolean }> };

  const manifestPayload = {
    id: 'admin-panel',
    name: 'Painel Administrativo',
    version: '0.1.0',
    adminOnly: true,
    visible: true,
  };

  const fetchStub = async (input: RequestInfo | URL) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.href
        : (input as Request).url;
    if (url.endsWith('/miniapps/registry.json')) {
      return new Response(JSON.stringify(registryPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.endsWith('/miniapps/AdminPanel/manifest.json')) {
      return new Response(JSON.stringify(manifestPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  };
  globalThis.fetch = fetchStub;
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    value: globalThis.fetch,
  });

  const mainModule = await import('../src/app/main.ts');
  await mainModule.bootstrap();
  const router = await import('../src/app/router.ts');

  const gateAfterMain = await ensureMasterGate();
  assert.equal(gateAfterMain.allowed, true, 'bootstrap deve liberar catálogo para master autenticado');

  await sleep(150);
  const state = await import('../src/app/state.js');
  assert.equal(state.getRegistryEntries().length, 1, 'catálogo deve carregar manifest do AdminPanel');

  const queryCard = () =>
    window.document.querySelector<HTMLButtonElement>('[data-app-id="admin-panel"]');

  let card = queryCard();
  assert(card, 'catalogo deve conter card do Painel Administrativo');
  assert.equal(card?.classList.contains('card'), true);
  assert.equal(card?.classList.contains('active'), false);

  card?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(50);
  card = queryCard();
  assert.equal(router.getSelectedAppId(), 'admin-panel', 'seleção deve apontar para admin-panel');
  assert(card?.classList.contains('active'), 'card deve ficar ativo após clique');
  assert.equal(window.location.hash, '#/app/admin-panel');
  const frame = window.document.getElementById('miniapp-frame') as HTMLIFrameElement;
  assert(frame, 'iframe do painel deve existir');
  assert.equal(frame.hidden, false, 'iframe deve ficar visível ao abrir o MiniApp');
  assert(frame.src.endsWith('/miniapps/AdminPanel/index.html'), 'iframe deve apontar para entry do MiniApp');

  card?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(30);
  card = queryCard();
  assert.equal(router.getSelectedAppId(), null, 'segunda interação deve limpar seleção');
  assert.equal(window.location.hash, '#/');
  assert(card && !card.classList.contains('active'), 'card deve remover estado ativo ao deselecionar');

  card?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(50);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  await sleep(30);
  assert.equal(router.getSelectedAppId(), null, 'ESC deve limpar seleção');
  assert.equal(window.location.hash, '#/');
  assert(frame.hidden, 'iframe deve ser ocultado após ESC');

  router.setSelectedAppId(null);
  router.setRouteForSelection(null);
  await sleep(20);
  window.location.hash = '#/app/admin-panel';
  router.applyRouteFromLocation();
  await sleep(50);
  assert.equal(router.getSelectedAppId(), 'admin-panel', 'rota direta deve selecionar admin-panel');
  assert.equal(frame.hidden, false, 'iframe deve ficar visível via rota direta');
  assert.equal(window.location.hash, '#/app/admin-panel');

  dom.window.close();

  if (previousWindow === undefined) {
    delete (globalThis as { window?: Window }).window;
  } else {
    Object.assign(globalThis, { window: previousWindow });
  }

  if (previousDocument === undefined) {
    delete (globalThis as { document?: Document }).document;
  } else {
    Object.assign(globalThis, { document: previousDocument });
  }

  if (previousHistory === undefined) {
    delete (globalThis as { history?: History }).history;
  } else {
    Object.assign(globalThis, { history: previousHistory });
  }

  if (previousLocation === undefined) {
    delete (globalThis as { location?: Location }).location;
  } else {
    Object.assign(globalThis, { location: previousLocation });
  }

  if (previousNavigator === undefined) {
    delete globalAny.navigator;
  } else {
    globalAny.navigator = previousNavigator;
  }

  if (previousFetch) {
    globalThis.fetch = previousFetch;
  } else {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  }

  if (previousLocalStorage === undefined) {
    delete globalAny.localStorage;
  } else {
    globalAny.localStorage = previousLocalStorage;
  }
  if (previousSessionStorage === undefined) {
    delete globalAny.sessionStorage;
  } else {
    globalAny.sessionStorage = previousSessionStorage;
  }

  console.log('✓ Catálogo shell renderiza card do AdminPanel e toggle funciona');
};

const testIndexedDBBackup = async () => {
  await resetIndexedDB();
  globalAny.localStorage?.clear?.();

  const db = await openIdxDB();
  const now = new Date().toISOString();
  await db.profiles.set('u-1', { id: 'u-1', updatedAt: now } as any);
  await db.close();

  const backup = await exportBackup();
  assert.equal(backup.data.profiles.length, 1, 'backup deve conter 1 perfil');

  await resetIndexedDB();
  globalAny.localStorage?.clear?.();

  await importBackup(backup, { mergeStrategy: 'keep-newer' });
  const restored = await openIdxDB();
  const profile = await restored.profiles.get('u-1');
  await restored.close();
  assert(profile, 'perfil restaurado deve existir');

  console.log('✓ IndexedDB backup/export/import ok');
};

const testAutoSaveQueue = async () => {
  const persisted: Array<unknown[]> = [];
  (globalAny.navigator as { onLine: boolean }).onLine = false;

  const saver = createAutoSaver(async (ops) => {
    persisted.push(ops);
  });

  saver.queue({ entityId: 'a', value: 1 });
  saver.queue({ entityId: 'b', value: 2 });
  saver.queue({ entityId: 'c', value: 3 });

  await sleep(500);
  assert.equal(persisted.length, 0, 'não deve persistir enquanto offline');

  (globalAny.navigator as { onLine: boolean }).onLine = true;
  dispatchGlobalEvent('online');
  await sleep(600);

  assert.equal(persisted.length, 1, 'deve persistir após voltar online');
  assert.equal(persisted[0].length, 3, 'todas operações devem ser persistidas');

  saver.dispose();
};

const testAutoSaveRetries = async () => {
  const attempts: number[] = [];
  (globalAny.navigator as { onLine: boolean }).onLine = true;

  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    const saver = createAutoSaver(async () => {
      attempts.push(Date.now());
      throw new Error('persist failure');
    });

    saver.queue({ entityId: 'retry', value: 1 });
    await saver.flush();
    await sleep(9000);
    assert.equal(attempts.length, 5, 'deve tentar no máximo 5 vezes');
    saver.dispose();
  } finally {
    Math.random = originalRandom;
  }

  console.log('✓ Auto-save debounce e retries ok');
};

const testMiniAppScaffold = async () => {
  const registryPath = path.join(ROOT, 'miniapps', 'registry.json');
  const miniappDir = path.join(ROOT, 'miniapps', 'QaMini');

  const originalRegistry = await readFile(registryPath, 'utf-8');
  try {
    await createMiniApp('QaMini', { admin: false, visible: true });

    await access(path.join(miniappDir, 'index.html'));
    await access(path.join(miniappDir, 'main.js'));
    await access(path.join(miniappDir, 'manifest.json'));
    for (const locale of ['pt-br', 'en-us', 'es-419']) {
      await access(path.join(miniappDir, 'i18n', `${locale}.json`));
    }

    const registryRaw = await readFile(registryPath, 'utf-8');
    const registry = JSON.parse(registryRaw) as {
      miniapps: Array<{ id: string; name: string; adminOnly: boolean; visible: boolean }>;
    };
    const entry = registry.miniapps.find((item) => item.id === 'miniapp-qa-mini');
    assert(entry, 'entrada QaMini deve existir no registry');
    assert.equal(entry?.adminOnly, false);
    assert.equal(entry?.visible, true);

    const names = registry.miniapps.map((item) => item.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    assert.deepEqual(names, sorted, 'registry deve estar ordenado por nome');
  } finally {
    await rm(miniappDir, { recursive: true, force: true });
    await writeFile(registryPath, originalRegistry, 'utf-8');
  }

  console.log('✓ Scaffold MiniApp e registry ok');
};

const testSyncProviders = async () => {
  globalAny.localStorage?.clear?.();

  const drive = resolveSyncProvider('drive');
  assert(drive?.isConfigured(), 'DriveStub deve estar configurado');
  const driveFirst = await drive!.push({ foo: 'bar' });
  const driveSecond = await drive!.push({ foo: 'baz' });
  assert.notEqual(driveFirst.rev, driveSecond.rev, 'revisões devem mudar a cada push');
  const drivePull = await drive!.pull();
  assert.equal((drivePull.backup as any)?.foo, 'baz');

  const onedrive = resolveSyncProvider('onedrive');
  assert(onedrive?.isConfigured(), 'OneDriveStub deve estar configurado');
  const onedriveFirst = await onedrive!.push({ foo: 'qux' });
  const onedrivePull = await onedrive!.pull();
  assert.equal((onedrivePull.backup as any)?.foo, 'qux');

  const driveData = globalAny.localStorage?.getItem?.('sync:drive');
  const onedriveData = globalAny.localStorage?.getItem?.('sync:onedrive');
  assert(driveData && onedriveData, 'ambos providers devem persistir dados');
  assert.notEqual(driveData, onedriveData, 'namespaces devem ser distintos');

  console.log('✓ Sync stubs com namespaces distintos ok');
};

const testAdminPanel = async () => {
  await resetIndexedDB();
  globalAny.localStorage = new MemoryStorage();

  const dom = new JSDOM(
    `<!DOCTYPE html><html><body>
      <dl id="preferences"></dl>
      <table id="telemetry-table"></table>
      <button id="export-backup"></button>
      <input id="import-backup" type="file" />
    </body></html>`,
    { url: 'https://appbase.local', pretendToBeVisual: true },
  );

  const { window } = dom;
  Object.defineProperty(window, 'localStorage', {
    value: globalAny.localStorage,
    configurable: true,
  });
  Object.defineProperty(window, 'indexedDB', {
    value: indexedDB,
    configurable: true,
  });
  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
  });
  globalAny.addEventListener = window.addEventListener.bind(window);
  globalAny.removeEventListener = window.removeEventListener.bind(window);
  globalAny.dispatchEvent = (event: Event) => window.dispatchEvent(event);

  const alerts: string[] = [];
  window.alert = (message: unknown) => {
    alerts.push(String(message));
  };
  (globalThis as unknown as { alert?: (message: unknown) => void }).alert = window.alert.bind(window);

  window.HTMLAnchorElement.prototype.click = () => {};

  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock';
  }
  window.URL.createObjectURL = () => 'blob:mock';
  window.URL.revokeObjectURL = () => {};

  const db = await openIdxDB();
  await db.profiles.set('primary-profile', { id: 'primary-profile', updatedAt: new Date().toISOString() } as any);
  await db.telemetry.set('evt-1', { id: 'evt-1', ts: new Date().toISOString(), event: 'login' } as any);
  await db.close();

  const adminPath = pathToFileURL(path.join(ROOT, 'miniapps', 'AdminPanel', 'main.js')).href;
  await import(adminPath);
  await sleep(200);

  const exportButton = window.document.getElementById('export-backup');
  exportButton?.dispatchEvent(new window.Event('click'));
  await sleep(200);
  assert(alerts.some((msg) => msg.includes('Backup exportado.')), 'export deve confirmar via alerta');

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      profiles: [{ id: 'u-import', updatedAt: new Date().toISOString() }],
      settings: [],
      telemetry: [],
    },
  };
  const file = ({
    async text() {
      return JSON.stringify(payload);
    },
  } as unknown) as File;
  const input = window.document.getElementById('import-backup');
  const fileList = {
    0: file,
    length: 1,
    item(index: number) {
      return index === 0 ? file : null;
    },
    *[Symbol.iterator]() {
      yield file;
    },
  } as unknown as FileList;
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: fileList,
  });
  input?.dispatchEvent(new window.Event('change'));
  await sleep(200);

  assert(alerts.some((msg) => msg.includes('Backup importado com sucesso.')), 'deve notificar importação');
  const summaryAlert = alerts.find((msg) => msg.includes('Perfis:'));
  assert(summaryAlert?.includes('Perfis: 1'), 'resumo deve citar perfis');

  const restored = await openIdxDB();
  const importedProfile = await restored.profiles.get('u-import');
  await restored.close();
  assert(importedProfile, 'perfil importado deve existir');

  dom.window.close();

  console.log('✓ AdminPanel export/import ok');
};

const main = async () => {
  try {
    await testMasterAuthFlow();
    await testShellCatalogToggle();
    await testIndexedDBBackup();
    await testAutoSaveQueue();
    await testAutoSaveRetries();
    await testMiniAppScaffold();
    await testSyncProviders();
    await testAdminPanel();
    console.log('Smoke tests concluídos com sucesso.');
  } catch (error) {
    console.error('Smoke tests falharam:', error);
    process.exitCode = 1;
  }
};

await main();
