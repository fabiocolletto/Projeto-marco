import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const PORT = Number.parseInt(process.env.VISUAL_TEST_PORT || '4173', 10);
const HOST = `http://127.0.0.1:${PORT}`;
const TARGET = `${HOST}/eventos.html`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function startStaticServer() {
  const proc = spawn('npx', ['serve', 'apps', '--listen', String(PORT), '--no-clipboard'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', chunk => {
    process.stdout.write(`[serve] ${chunk}`);
  });
  proc.stderr.on('data', chunk => {
    process.stderr.write(`[serve:err] ${chunk}`);
  });
  return proc;
}

async function waitForServerReady(url, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        return;
      }
    } catch (err) {
      // ignore and retry
    }
    await delay(250);
  }
  throw new Error(`Servidor estático em ${url} não respondeu dentro do timeout.`);
}

async function ensureSelector(page, selector, description, options = {}) {
  const el = await page.waitForSelector(selector, { timeout: 10000, ...options });
  if (!el) {
    throw new Error(`Falha ao localizar: ${description || selector}`);
  }
  return el;
}

async function main() {
  const server = startStaticServer();
  let exitCode = 0;
  const cleanup = () => {
    if (!server.killed) {
      server.kill();
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(1);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(1);
  });

  try {
    await waitForServerReady(HOST);
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      page.on('dialog', async dialog => {
        if (dialog.type() === 'confirm') {
          await dialog.dismiss();
        } else {
          await dialog.accept();
        }
      });

      await page.goto(TARGET, { waitUntil: 'networkidle' });
      await ensureSelector(page, '#switchEvent option', 'lista de eventos pronta');

      const essentials = [
        { selector: '#cardResumo', description: 'Painel de resumo' },
        { selector: '#cardIndicadores', description: 'Painel de indicadores' },
        { selector: '#kpi_for', description: 'KPI Fornecedores' },
        { selector: '#kpi_tasks', description: 'KPI Tarefas' },
        { selector: '#kpi_guests', description: 'KPI Convidados & Convites' },
        { selector: '#secEvento', description: 'Painel de edição do evento' },
        { selector: '#secMensagens', description: 'Painel de mensagens' },
        { selector: '#secSync', description: 'Painel de sincronização' }
      ];
      for (const item of essentials) {
        await ensureSelector(page, item.selector, item.description, { state: 'attached' });
      }

      await ensureSelector(page, '#chipReady', 'pílula de status pronto', { state: 'visible' });

      const screenshotsDir = path.join(__dirname, 'screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });

      await delay(500);
      await page.screenshot({ path: path.join(screenshotsDir, 'ready.png'), fullPage: true });

      await page.click('#btnNew');
      await delay(400);

      await page.click('#btnDelete');
      await delay(400);

      const editButtons = await page.$$('[data-open]');
      if (!editButtons.length) {
        throw new Error('Nenhum botão de edição com data-open foi encontrado.');
      }
      for (const button of editButtons) {
        await button.click();
        await delay(150);
      }
      await page.keyboard.press('Escape');
      await delay(200);

      const eventoEditButton = await ensureSelector(page, 'button[data-open="#secEvento"]', 'botão de editar evento');
      await eventoEditButton.click();
      await ensureSelector(page, '#secEvento[open]', 'painel do evento aberto');

      const nameInput = await ensureSelector(page, '#secEvento [data-bind="evento.nome"]', 'campo nome do evento', { state: 'visible' });
      await nameInput.fill('Evento Playwright');

      await ensureSelector(page, '#chipDirty', 'pílula de edição não salva', { state: 'visible' });
      await page.screenshot({ path: path.join(screenshotsDir, 'editing.png'), fullPage: true });

      await ensureSelector(page, '#chipSaving', 'pílula de salvando', { state: 'visible' });
      await page.screenshot({ path: path.join(screenshotsDir, 'saving.png'), fullPage: true });
      await ensureSelector(page, '#chipSaving', 'pílula de salvando oculta', { state: 'hidden', timeout: 10000 });

      await ensureSelector(page, '#chipReady', 'pílula de status pronto após salvar', { state: 'visible' });

      await ensureSelector(page, 'body', 'espera pelo sharedStore disponível');
      await page.waitForFunction(() => {
        return !!(window.sharedStore && typeof window.sharedStore.backupAll === 'function' && typeof window.sharedStore.ping === 'function');
      }, {}, { timeout: 10000 });

      const backupJson = await page.evaluate(() => window.sharedStore.backupAll());
      if (typeof backupJson !== 'string' || !backupJson.length) {
        throw new Error('sharedStore.backupAll retornou resultado vazio.');
      }
      const pingOk = await page.evaluate(() => window.sharedStore.ping());
      if (!pingOk) {
        throw new Error('sharedStore.ping falhou.');
      }

      console.log('Teste visual concluído com sucesso.');
    } finally {
      await browser.close();
    }
  } catch (err) {
    exitCode = 1;
    console.error(err);
  } finally {
    cleanup();
    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  }
}

main();
