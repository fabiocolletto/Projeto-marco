const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs/promises');

const PORT = process.env.VISUAL_TEST_PORT || 4173;
const HOST = process.env.VISUAL_TEST_HOST || '127.0.0.1';
const BASE_URL = `http://${HOST}:${PORT}`;

let serverProcess;

async function waitForServer(url, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        return;
      }
    } catch (_) {
      // ignore until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Servidor não respondeu em ${timeout}ms em ${url}`);
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });

  serverProcess = spawn('npx', ['serve', 'apps', '--listen', `${PORT}`], {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'inherit',
  });

  serverProcess.on('error', (err) => {
    throw err;
  });

  await waitForServer(`${BASE_URL}/eventos.html`);
});

test.afterAll(async () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGINT');
    await new Promise((resolve) => {
      if (serverProcess.exitCode !== null) {
        resolve();
        return;
      }
      serverProcess.once('exit', () => resolve());
      setTimeout(resolve, 2000);
    });
  }
});

async function ensureBootstrap(page) {
  await page.goto(`${BASE_URL}/eventos.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#chipReady', { state: 'visible', timeout: 20000 });

  const requiredSelectors = [
    '#badgeEvento',
    '#badgeAnfitriao',
    '#badgeCerimonial',
    '#kpi_tasks',
    '#kpi_for',
    '#kpi_guests',
    '#secTarefas',
    '#secFornecedores',
    '#secConvidados',
    '#secMensagens',
    '#secSync',
    '#hdr_sync_status',
  ];

  for (const selector of requiredSelectors) {
    const handle = await page.$(selector);
    expect(handle, `Elemento obrigatório ausente: ${selector}`).not.toBeNull();
  }
}

test('Fluxo visual da página de eventos', async ({ page }) => {
  const screenshotsDir = path.join(__dirname, 'screenshots');

  await ensureBootstrap(page);

  await page.screenshot({
    path: path.join(screenshotsDir, 'eventos-ready.png'),
    fullPage: true,
  });

  const nameInput = page.locator('[data-bind="evento.nome"]');
  const novoNome = `Evento Visual ${Date.now()}`;
  await nameInput.fill(novoNome);
  await page.waitForSelector('#chipDirty', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(100);
  await page.screenshot({
    path: path.join(screenshotsDir, 'eventos-edicao.png'),
    fullPage: true,
  });

  await page.waitForSelector('#chipSaving', { state: 'visible', timeout: 10000 });
  await page.screenshot({
    path: path.join(screenshotsDir, 'eventos-salvando.png'),
    fullPage: true,
  });
  await page.waitForSelector('#chipReady', { state: 'visible', timeout: 10000 });

  await test.step('Interações com botões principais', async () => {
    await page.click('#btnNew');
    await page.waitForSelector('#chipReady', { state: 'visible', timeout: 10000 });

    const dialogPromise = page.waitForEvent('dialog');
    await page.click('#btnDelete');
    const dialog = await dialogPromise;
    await dialog.dismiss();
  });

  await test.step('Abrir seções pelos ícones de edição', async () => {
    const sections = await page.$$eval('[data-open]', (elements) =>
      Array.from(new Set(elements.map((el) => el.getAttribute('data-open')).filter(Boolean)))
    );

    expect(sections.length, 'Nenhum ícone com data-open encontrado').toBeGreaterThan(0);

    for (const section of sections) {
      const trigger = page.locator(`[data-open="${section}"]`).first();
      await trigger.click();
      await expect(page.locator(section), `Painel não abriu: ${section}`).toHaveJSProperty('open', true);
    }

    await page.keyboard.press('Escape');
  });

  await test.step('Validações do sharedStore', async () => {
    await page.waitForFunction(
      () =>
        typeof window !== 'undefined' &&
        window.sharedStore &&
        typeof window.sharedStore.backupAll === 'function' &&
        typeof window.sharedStore.ping === 'function',
      null,
      { timeout: 10000 }
    );

    const storeResult = await page.evaluate(async () => {
      const store = window.sharedStore;
      if (!store) {
        throw new Error('window.sharedStore indisponível');
      }
      if (typeof store.backupAll !== 'function') {
        throw new Error('sharedStore.backupAll ausente');
      }
      if (typeof store.ping !== 'function') {
        throw new Error('sharedStore.ping ausente');
      }
      const backup = await store.backupAll();
      const ping = await store.ping();
      return { backup, ping };
    });

    expect(storeResult.backup, 'backupAll retornou valor inválido').toBeTruthy();
    expect(storeResult.ping, 'ping retornou resultado negativo').not.toBe(false);
  });
});
