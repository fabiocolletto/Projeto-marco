import { test, expect, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

const PORT = Number(process.env.VISUAL_TEST_PORT || 4173);
const HOST = `http://127.0.0.1:${PORT}`;
const EVENTOS_URL = `${HOST}/eventos.html`;
const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures', 'casamento-evento.json');

let serverProcess: ChildProcess | undefined;

async function waitForServer(url: string, timeout = 20000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Servidor não respondeu em ${timeout}ms: ${url}`);
}

async function ensureBootstrap(page: Page): Promise<void> {
  await page.goto(EVENTOS_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#chipReady', { state: 'visible', timeout: 20000 });
  await page.waitForFunction(
    () => {
      const store = (window as typeof window & { sharedStore?: unknown }).sharedStore as
        | { ping?: () => unknown; backupAll?: () => unknown }
        | undefined;
      return !!store && typeof store.ping === 'function' && typeof store.backupAll === 'function';
    },
    { timeout: 20000 }
  );
  const optionsCount = await page.locator('#switchEvent option').count();
  expect(optionsCount).toBeGreaterThan(0);
}

type WeddingFixture = {
  evento: {
    nome: string;
    tipo: string;
    data: string;
    hora: string;
    local: string;
    endereco: {
      cep: string;
      logradouro: string;
      numero: string;
      bairro: string;
      cidade: string;
      uf: string;
      complemento: string;
    };
    anfitriao: {
      nome: string;
      telefone: string;
      redeSocial: string;
      endCorrespondencia: {
        cep: string;
        logradouro: string;
        numero: string;
        bairro: string;
        cidade: string;
        uf: string;
        complemento: string;
      };
      endEntrega: {
        cep: string;
        logradouro: string;
        numero: string;
        bairro: string;
        cidade: string;
        uf: string;
        complemento: string;
      };
    };
  };
  cerimonialista: {
    nomeCompleto: string;
    telefone: string;
    redeSocial: string;
  };
};

async function prepareWeddingExample(page: Page, fixture: WeddingFixture): Promise<string> {
  await test.step('Criando evento casamento de exemplo', async () => {
    await page.click('#btnNew');
    await page.waitForSelector('#chipReady', { state: 'visible', timeout: 20000 });

    const openSection = async (selector: string) => {
      const trigger = page.locator(`button[data-open="${selector}"]`);
      await trigger.click();
      await expect(page.locator(selector)).toHaveAttribute('open', '');
    };

    await openSection('#secEvento');
    await page.fill('input[data-bind="evento.nome"]', fixture.evento.nome);
    await page.selectOption('select[data-bind="evento.tipo"]', { label: fixture.evento.tipo });
    await page.fill('#ev-datetime', `${fixture.evento.data}T${fixture.evento.hora}`);
    await page.fill('input[data-bind="evento.local"]', fixture.evento.local);
    await page.fill('input[data-bind="evento.endereco.cep"]', fixture.evento.endereco.cep);
    await page.fill('input[data-bind="evento.endereco.logradouro"]', fixture.evento.endereco.logradouro);
    await page.fill('input[data-bind="evento.endereco.numero"]', fixture.evento.endereco.numero);
    await page.fill('input[data-bind="evento.endereco.bairro"]', fixture.evento.endereco.bairro);
    await page.fill('input[data-bind="evento.endereco.cidade"]', fixture.evento.endereco.cidade);
    await page.fill('input[data-bind="evento.endereco.uf"]', fixture.evento.endereco.uf);
    await page.fill('input[data-bind="evento.endereco.complemento"]', fixture.evento.endereco.complemento);

    await openSection('#secAnfitriao');
    const anfitriao = fixture.evento.anfitriao;
    await page.fill('input[data-bind="evento.anfitriao.nome"]', anfitriao.nome);
    await page.fill('input[data-bind="evento.anfitriao.telefone"]', anfitriao.telefone);
    await page.fill('input[data-bind="evento.anfitriao.redeSocial"]', anfitriao.redeSocial);
    await page.fill('input[data-bind="evento.anfitriao.endCorrespondencia.cep"]', anfitriao.endCorrespondencia.cep);
    await page.fill(
      'input[data-bind="evento.anfitriao.endCorrespondencia.logradouro"]',
      anfitriao.endCorrespondencia.logradouro
    );
    await page.fill(
      'input[data-bind="evento.anfitriao.endCorrespondencia.numero"]',
      anfitriao.endCorrespondencia.numero
    );
    await page.fill('input[data-bind="evento.anfitriao.endCorrespondencia.bairro"]', anfitriao.endCorrespondencia.bairro);
    await page.fill('input[data-bind="evento.anfitriao.endCorrespondencia.cidade"]', anfitriao.endCorrespondencia.cidade);
    await page.fill('input[data-bind="evento.anfitriao.endCorrespondencia.uf"]', anfitriao.endCorrespondencia.uf);
    await page.fill(
      'input[data-bind="evento.anfitriao.endCorrespondencia.complemento"]',
      anfitriao.endCorrespondencia.complemento
    );
    await page.fill('input[data-bind="evento.anfitriao.endEntrega.cep"]', anfitriao.endEntrega.cep);
    await page.fill('input[data-bind="evento.anfitriao.endEntrega.logradouro"]', anfitriao.endEntrega.logradouro);
    await page.fill('input[data-bind="evento.anfitriao.endEntrega.numero"]', anfitriao.endEntrega.numero);
    await page.fill('input[data-bind="evento.anfitriao.endEntrega.bairro"]', anfitriao.endEntrega.bairro);
    await page.fill('input[data-bind="evento.anfitriao.endEntrega.cidade"]', anfitriao.endEntrega.cidade);
    await page.fill('input[data-bind="evento.anfitriao.endEntrega.uf"]', anfitriao.endEntrega.uf);
    await page.fill('input[data-bind="evento.anfitriao.endEntrega.complemento"]', anfitriao.endEntrega.complemento);

    await openSection('#secCerimonial');
    await page.fill('input[data-bind="cerimonialista.nomeCompleto"]', fixture.cerimonialista.nomeCompleto);
    await page.fill('input[data-bind="cerimonialista.telefone"]', fixture.cerimonialista.telefone);
    await page.fill('input[data-bind="cerimonialista.redeSocial"]', fixture.cerimonialista.redeSocial);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    const savingChip = page.locator('#chipSaving');
    await savingChip.waitFor({ state: 'visible', timeout: 20000 });
    await expect(page.locator('#chipReady')).toBeVisible({ timeout: 20000 });
  });
  const currentId = await page.evaluate(() => {
    const select = document.querySelector('#switchEvent') as HTMLSelectElement | null;
    return select?.value || '';
  });
  expect(currentId).toBeTruthy();
  return currentId;
}

test.beforeAll(async () => {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  serverProcess = spawn('npx', ['serve', 'apps', '-l', String(PORT)], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });
  serverProcess.once('exit', (code) => {
    if (code) {
      console.error(`Servidor static finalizou com código ${code}`);
    }
  });
  await waitForServer(EVENTOS_URL);
});

test.afterAll(async () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
});

test('fluxo visual do dashboard de eventos', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureBootstrap(page);

  const fixtureRaw = await fs.readFile(FIXTURE_PATH, 'utf-8');
  const weddingFixture = JSON.parse(fixtureRaw) as WeddingFixture;

  const weddingProjectId = await prepareWeddingExample(page, weddingFixture);

  await test.step('Validando badges preenchidos com casamento', async () => {
    await expect(page.locator('#evTitle')).toHaveText(weddingFixture.evento.nome);
    await expect(page.locator('#switchEvent')).toContainText(weddingFixture.evento.nome);
    await expect(page.locator('#badgeEvento')).toContainText(weddingFixture.evento.nome);
    await expect(page.locator('#badgeEvento')).toContainText(weddingFixture.evento.tipo);
    await expect(page.locator('#badgeEvento')).toContainText(weddingFixture.evento.local);
    await expect(page.locator('#badgeAnfitriao')).toContainText(weddingFixture.evento.anfitriao.nome);
    await expect(page.locator('#badgeCerimonial')).toContainText(weddingFixture.cerimonialista.nomeCompleto);
  });

  const requiredSelectors = [
    '#cardResumo',
    '#cardIndicadores',
    '#badgeEvento',
    '#badgeAnfitriao',
    '#badgeCerimonial',
    '#kpi_tasks',
    '#kpi_for',
    '#kpi_guests',
  ];

  for (const sel of requiredSelectors) {
    await test.step(`Verificando elemento obrigatório: ${sel}`, async () => {
      await expect(page.locator(sel), `Elemento obrigatório ausente: ${sel}`).toBeVisible();
    });
  }

  const kpiCount = await page.locator('#cardIndicadores .mini.kpi').count();
  expect(kpiCount).toBeGreaterThanOrEqual(3);

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 1024, height: 1366 },
    { name: 'mobile', width: 390, height: 844 },
  ] as const;

  for (const viewport of viewports) {
    await test.step(`Responsividade ${viewport.name}`, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(16);
      await page.waitForSelector('#chipReady', { state: 'visible', timeout: 10000 });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `ready-${viewport.name}.png`),
        fullPage: true,
      });
    });
  }

  await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
  await page.waitForTimeout(300);

  await test.step('Ações de cabeçalho', async () => {
    await page.click('#btnNew');
    await page.waitForSelector('#chipReady', { state: 'visible', timeout: 10000 });

    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });
    await page.click('#btnDelete');
    await page.waitForSelector('#chipReady', { state: 'visible', timeout: 10000 });
  });

  await test.step('Reabrindo evento de casamento após ações de cabeçalho', async () => {
    await page.waitForSelector(`#switchEvent option[value="${weddingProjectId}"]`, { timeout: 10000 });
    await page.selectOption('#switchEvent', weddingProjectId);
    await page.waitForSelector('#chipReady', { state: 'visible', timeout: 10000 });
    await expect(page.locator('#evTitle')).toHaveText(weddingFixture.evento.nome);
  });

  const pencilButtons = page.locator('button[data-open]');
  const pencilCount = await pencilButtons.count();
  expect(pencilCount).toBeGreaterThan(0);

  for (let i = 0; i < pencilCount; i += 1) {
    await test.step(`Abrindo painel ${i + 1} de ${pencilCount}`, async () => {
      const btn = pencilButtons.nth(i);
      const target = await btn.getAttribute('data-open');
      await btn.click();
      if (target) {
        await expect(page.locator(target), `Painel ${target} não abriu`).toHaveAttribute('open', '');
      }
    await page.keyboard.press('Escape');
    });
  }

  const nomeEvento = page.locator('input[data-bind="evento.nome"]');
  await test.step('Capturando estado de edição', async () => {
    await page.click('button[data-open="#secEvento"]');
    const editingValue = `${weddingFixture.evento.nome} (edição Playwright)`;
    await nomeEvento.fill(editingValue);
    await page.waitForSelector('#chipDirty', { state: 'visible', timeout: 5000 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'editing-desktop.png'),
      fullPage: true,
    });
  });

  const savingChip = page.locator('#chipSaving');
  await nomeEvento.fill(weddingFixture.evento.nome);
  await savingChip.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'saving-desktop.png'), fullPage: true });
  await expect(page.locator('#chipReady')).toBeVisible({ timeout: 10000 });

  const storeHealth = await page.evaluate(async () => {
    const store = (window as typeof window & { sharedStore?: unknown }).sharedStore as
      | {
          backupAll?: () => Promise<unknown>;
          ping?: () => Promise<unknown>;
        }
      | undefined;
    if (!store) {
      throw new Error('sharedStore não disponível');
    }
    if (typeof store.backupAll !== 'function') {
      throw new Error('sharedStore.backupAll indisponível');
    }
    if (typeof store.ping !== 'function') {
      throw new Error('sharedStore.ping indisponível');
    }
    const [backupResult, pingResult, metasMaybe] = await Promise.all([
      store.backupAll?.(),
      store.ping?.(),
      Promise.resolve(store.listProjects?.()),
    ]);
    const metas = Array.isArray(metasMaybe) ? metasMaybe : [];
    return { backupResult, pingResult, metas };
  });

  expect(storeHealth).toBeTruthy();
  expect(storeHealth.pingResult).toBeTruthy();
  expect(storeHealth.metas.some((meta: { nome?: string }) => meta?.nome === weddingFixture.evento.nome)).toBe(true);
});

export {};
