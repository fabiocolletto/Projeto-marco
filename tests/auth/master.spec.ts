import 'fake-indexeddb/auto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';

declare global {
  // eslint-disable-next-line no-var
  var indexedDB: IDBFactory;
}

const resetDatabase = async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('appbase_db');
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('IndexedDB error'));
  });
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

let dom: JSDOM | null = null;

const mountShellDom = () => {
  document.body.innerHTML = `
    <div id="error-banner"></div>
    <div id="catalog">
      <div id="catalog-cards"></div>
    </div>
    <section id="panel">
      <header>
        <div>
          <h2 id="panel-title"></h2>
          <span id="panel-subtitle"></span>
        </div>
        <button id="panel-close" type="button"></button>
      </header>
      <div class="placeholder" id="panel-placeholder">
        <p>Escolha um MiniApp ao lado para abrir seu painel aqui.</p>
      </div>
      <iframe id="miniapp-frame"></iframe>
      <footer></footer>
    </section>
  `;
};

beforeEach(async () => {
  await resetDatabase();
  if (dom) {
    dom.window.close();
    dom = null;
  }
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'https://appbase.local/' });
  const { window } = dom;
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    history: window.history,
    navigator: window.navigator,
  });
  (globalThis as { localStorage?: Storage }).localStorage = window.localStorage;
  (globalThis as { sessionStorage?: Storage }).sessionStorage = window.sessionStorage;
  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    value: indexedDB,
  });
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.location.hash = '#/';
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  vi.resetModules();
});

afterEach(() => {
  dom?.window.close();
  dom = null;
});

describe('Master auth flow', () => {
  it('redirects to master setup when no user exists', async () => {
    mountShellDom();
    const { ensureMasterGate } = await import('../../src/auth/gate.js');
    const result = await ensureMasterGate();
    expect(result.allowed).toBe(false);
    expect(window.location.hash).toBe('#/setup/master');
  });

  it('auto provisions default master credentials on first run', async () => {
    mountShellDom();
    const { autoProvisionMaster } = await import('../../src/auth/provision.js');
    const seeded = await autoProvisionMaster();
    expect(seeded).toBe(true);

    const { getMaster } = await import('../../src/auth/store.js');
    const master = await getMaster();
    expect(master).not.toBeNull();
    expect(master?.username).toBe('adm');
    expect(globalThis.localStorage?.getItem('appbase:auth')).toBe('master');
  });

  it('registers default master credentials and persists auth', async () => {
    mountShellDom();
    const { ensureMasterGate } = await import('../../src/auth/gate.js');
    await ensureMasterGate();

    const form = document.querySelector('form');
    expect(form).not.toBeNull();
    form?.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();
    await flushPromises();

    const { getMaster } = await import('../../src/auth/store.js');
    const master = await getMaster();
    expect(master).not.toBeNull();
    expect(master?.username).toBe('adm');
    expect(globalThis.localStorage?.getItem('appbase:auth')).toBe('master');
    expect(window.location.hash).toBe('#/');
  });

  it('redirects to master login when master already exists on first access', async () => {
    mountShellDom();
    const { autoProvisionMaster } = await import('../../src/auth/provision.js');
    await autoProvisionMaster();

    window.localStorage.clear();
    window.sessionStorage.clear();
    window.location.hash = '#/';

    const { ensureMasterGate } = await import('../../src/auth/gate.js');
    const gate = await ensureMasterGate();
    expect(gate.allowed).toBe(false);
    expect(window.location.hash).toBe('#/login/master');
  });

  it('keeps full catalog available after restart when master authenticated', async () => {
    mountShellDom();
    const { ensureMasterGate } = await import('../../src/auth/gate.js');
    await ensureMasterGate();

    const form = document.querySelector('form');
    form?.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();
    await flushPromises();

    vi.resetModules();
    document.head.innerHTML = '';
    mountShellDom();

    const { ensureMasterGate: ensureAfterRestart } = await import('../../src/auth/gate.js');
    const gate = await ensureAfterRestart();
    expect(gate.allowed).toBe(true);
    expect(window.location.hash).toBe('#/');

    const { setRegistryEntries } = await import('../../src/app/state.js');
    const { renderShell } = await import('../../src/app/renderShell.js');

    setRegistryEntries([
      { id: 'public', name: 'Público', path: './public', adminOnly: false },
      { id: 'privado', name: 'Privado', path: './privado', adminOnly: true },
    ]);
    renderShell();

    const cards = document.querySelectorAll('#catalog-cards .card');
    expect(cards.length).toBe(2);
    const badges = Array.from(cards).map((card) => card.querySelector('.badge')?.textContent ?? '');
    expect(badges).toContain('Privado');
  });

  it('updates password hash when changing credentials in the widget', async () => {
    mountShellDom();
    const { ensureMasterGate } = await import('../../src/auth/gate.js');
    await ensureMasterGate();

    const form = document.querySelector('form');
    form?.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();
    await flushPromises();

    const { getMaster } = await import('../../src/auth/store.js');
    const masterBefore = await getMaster();
    expect(masterBefore).not.toBeNull();
    const oldHash = masterBefore?.passHash;

    const { renderMasterSignup } = await import('../../src/widgets/MasterSignup.js');
    const container = document.createElement('div');
    document.body.append(container);
    renderMasterSignup(container, { master: masterBefore ?? undefined, mode: 'edit' });

    const editForm = container.querySelector('form');
    expect(editForm).not.toBeNull();
    const passwordInput = editForm?.querySelector('input[name="password"]');
    const confirmInput = editForm?.querySelector('input[name="confirmPassword"]');
    if (passwordInput && confirmInput) {
      (passwordInput as HTMLInputElement).value = 'novaSenha123';
      (confirmInput as HTMLInputElement).value = 'novaSenha123';
    }
    editForm?.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();
    await flushPromises();

    const masterAfter = await getMaster();
    expect(masterAfter?.passHash).toBeDefined();
    const { sha256 } = await import('../../src/auth/crypto.js');
    const expectedHash = await sha256(`${masterBefore?.deviceId}:novaSenha123`);
    expect(masterAfter?.passHash).toBe(expectedHash);
    expect(masterAfter?.passHash).not.toBe(oldHash);
  });
});
