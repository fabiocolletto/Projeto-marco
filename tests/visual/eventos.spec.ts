import { test, expect } from '@playwright/test';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';
import type { Server } from 'http';
import type { TestInfo } from '@playwright/test';

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

async function createStaticServer(): Promise<{ server: Server; url: string }>{
  const rootDir = path.resolve(process.cwd());
  const server = createServer(async (req, res) => {
    const rawPath = decodeURIComponent(req.url?.split('?')[0] ?? '/');
    try {
      const relPath = rawPath === '/' ? 'apps/eventos.html' : rawPath.replace(/^\/+/, '');
      const normalized = path.normalize(relPath);
      const filePath = path.join(rootDir, normalized);
      const relative = path.relative(rootDir, filePath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Forbidden');
        return;
      }
      const data = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = contentTypes[ext] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch (error) {
      res.writeHead(rawPath === '/' ? 500 : 404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Servidor HTTP não pôde ser inicializado');
  }

  const url = `http://127.0.0.1:${address.port}/apps/eventos.html`;
  return { server, url };
}

test.describe('Eventos — fluxo visual', () => {
  let server: Server;
  let pageUrl: string;

  test.beforeAll(async () => {
    const handle = await createStaticServer();
    server = handle.server;
    pageUrl = handle.url;
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test('captura estados críticos e valida interações', async ({ page }, testInfo: TestInfo) => {
    page.on('console', (msg) => {
      console.log(`[console] ${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      console.error(`[pageerror] ${err.message}`);
    });
    await page.goto(pageUrl, { waitUntil: 'networkidle' });

    await expect(page.locator('#switchEvent')).toBeVisible();
    await expect(page.locator('#chipReady')).toBeVisible();

    await page.waitForFunction(() => Boolean((window as any).sharedStore?.backupAll));
    await page.evaluate(async () => {
      await (window as any).sharedStore.backupAll();
      await (window as any).sharedStore.ping();
    });

    const readyBuffer = await page.screenshot({ fullPage: true });
    expect(readyBuffer.length).toBeGreaterThan(0);
    await testInfo.attach('eventos-ready.png', {
      body: readyBuffer,
      contentType: 'image/png',
    });

    const initialOptionCount = await page.locator('#switchEvent option').count();

    await page.click('#btnNew');
    await expect
      .poll(async () => page.locator('#switchEvent option').count())
      .toBeGreaterThan(initialOptionCount);
    const countAfterCreate = await page.locator('#switchEvent option').count();

    const deletePromise = new Promise<void>((resolve) => {
      page.once('dialog', (dialog) => {
        expect(dialog.type()).toBe('confirm');
        dialog.dismiss();
        resolve();
      });
    });
    await page.click('#btnDelete');
    await deletePromise;
    await expect(page.locator('#switchEvent option')).toHaveCount(countAfterCreate);

    const editButtons = await page.$$('[data-open]');
    const visited = new Set<string>();
    for (const handle of editButtons) {
      const target = await handle.getAttribute('data-open');
      if (!target || visited.has(target)) continue;
      visited.add(target);
      await handle.click();
      const panel = page.locator(target);
      await expect(panel).toHaveJSProperty('open', true);
      await expect(panel.locator('.details-wrap')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(panel).toHaveJSProperty('open', false);
    }

    await page.locator('[data-open="#secEvento"]').click();
    const nameInput = page.locator('input[data-bind="evento.nome"]');
    await expect(nameInput).toBeVisible();
    await nameInput.click();
    await nameInput.fill('Evento Automatizado');
    await expect(page.locator('#chipDirty')).toBeVisible();
    const editingBuffer = await page.screenshot({ fullPage: true });
    expect(editingBuffer.length).toBeGreaterThan(0);
    await testInfo.attach('eventos-editing.png', {
      body: editingBuffer,
      contentType: 'image/png',
    });

    await page.locator('[data-open="#secConvidados"]').click();
    const guestsPanel = page.locator('#secConvidados');
    await expect(guestsPanel).toHaveJSProperty('open', true);
    const guestApp = page.locator('#convidados_host .ac-convidados');
    await expect(guestApp).toBeVisible();
    const guestRows = page.locator('#convidados_host .row');
    const initialGuests = await guestRows.count();
    await page.locator('#convidados_host #btnAdd').click();
    await expect(guestRows).toHaveCount(initialGuests + 1);
    await page.keyboard.press('Escape');
    await expect(guestsPanel).toHaveJSProperty('open', false);

    await page.evaluate(() => {
      const ready = document.getElementById('chipReady');
      const saving = document.getElementById('chipSaving');
      if (!saving) throw new Error('Indicador de salvamento não encontrado');
      if (ready) ready.style.display = 'none';
      saving.style.display = 'inline-block';
    });
    await expect(page.locator('#chipSaving')).toBeVisible({ timeout: 5000 });
    const savingBuffer = await page.screenshot({ fullPage: true });
    expect(savingBuffer.length).toBeGreaterThan(0);
    await testInfo.attach('eventos-saving.png', {
      body: savingBuffer,
      contentType: 'image/png',
    });
    await page.evaluate(() => {
      const ready = document.getElementById('chipReady');
      const saving = document.getElementById('chipSaving');
      if (saving) saving.style.display = 'none';
      if (ready) ready.style.display = 'inline-block';
    });
    await expect(page.locator('#chipReady')).toBeVisible({ timeout: 10000 });

  });
});
