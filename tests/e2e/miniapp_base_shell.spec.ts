import { test, expect, Download } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon'
} as const;

let server: http.Server;
let baseURL: string;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relativePath = urlPath === '/' ? '/miniapps/base_shell/index.html' : urlPath;
    const resolvedPath = path.normalize(path.join(repoRoot, relativePath));
    if (!resolvedPath.startsWith(repoRoot)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }
    fs.stat(resolvedPath, (error, stats) => {
      if (error || !stats.isFile()) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const ext = path.extname(resolvedPath).toLowerCase();
      res.setHeader('Content-Type', MIME_TYPES[ext as keyof typeof MIME_TYPES] || 'application/octet-stream');
      fs.createReadStream(resolvedPath).pipe(res);
    });
  });
  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address();
  if (typeof address === 'object' && address) {
    baseURL = `http://127.0.0.1:${address.port}`;
  } else {
    throw new Error('Failed to bind HTTP server');
  }
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
});

test.describe('MiniApp Base shell', () => {
  test('layout, theme, i18n e autenticação local', async ({ page }) => {
    await page.goto(`${baseURL}/miniapps/base_shell/index.html`);

    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('#panel')).toBeVisible();
    await expect(page.locator('.app-footer')).toBeVisible();

    await page.click('#btnCollapse');
    await expect(page.locator('.app-shell')).toHaveClass(/is-collapsed/);

    await page.click('#settings-toggle');
    await expect(page.locator('#settings-submenu')).toBeVisible();

    await page.click('#btnTheme');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.click('#btnLang');
    await expect(page.locator('a.cta').first()).toHaveText('Sign in');

    await page.click('#btnLang');
    await expect(page.locator('a.cta').first()).toHaveText('Ingresar');

    await expect(page.locator('#btnUserPanel')).toHaveAttribute('aria-label', 'Abrir panel de usuario');

    await page.click('#settings-toggle');

    await page.click('a[data-i18n="panel.actions.register"]');
    await expect(page).toHaveURL(/register\.html$/);

    await page.fill('#register-name', 'Alice Owner');
    await page.fill('#register-email', 'alice@example.com');
    await page.fill('#register-password', 'secret1');
    await page.selectOption('#register-role', 'owner');
    await page.click('#register-form .cta');
    await expect(page.locator('#register-feedback')).toHaveText('Registro completado con éxito.');

    await page.fill('#register-name', 'Bruno Member');
    await page.fill('#register-email', 'bruno@example.com');
    await page.fill('#register-password', 'secret2');
    await page.selectOption('#register-role', 'member');
    await page.click('#register-form .cta');
    await expect(page.locator('#register-feedback')).toHaveText('Registro completado con éxito.');

    await page.click('#btnUser');
    const userMenu = page.locator('#user-menu');
    await expect(userMenu).toBeVisible();
    await expect(userMenu.locator('button', { hasText: 'Alice Owner' })).toHaveCount(1);
    await expect(userMenu.locator('button', { hasText: 'Bruno Member' })).toHaveCount(1);
    await page.click('#btnUser');

    await page.click('#btnUser');
    await page.click('#user-menu button[data-action="logout"]');

    await page.click('a[data-i18n="panel.actions.login"]');
    await expect(page).toHaveURL(/login\.html$/);

    await page.fill('#login-email', 'bruno@example.com');
    await page.fill('#login-password', 'secret2');
    await page.click('#login-form .cta');
    await expect(page.locator('#login-feedback')).toHaveText('Sesión iniciada como Bruno Member.');

    await page.click('#btnUser');
    await expect(page.locator('#user-menu')).toBeVisible();
    await page.click('#user-menu button[data-email="alice@example.com"]', { force: true });
    await expect.poll(async () => {
      return page.evaluate(() => {
        const session = window.localStorage.getItem('miniapp.base.session');
        const users = window.localStorage.getItem('miniapp.base.users');
        if (!session || !users) return null;
        const id = JSON.parse(session);
        const parsed = JSON.parse(users);
        const user = parsed.find(candidate => candidate.id === id);
        return user ? user.name : null;
      });
    }).toBe('Alice Owner');
    await expect(page.locator('#current-user')).toHaveText('Alice Owner');

    await page.click('#settings-toggle');
    await expect(page.locator('#btnUserPanel')).toHaveAttribute(
      'aria-label',
      'Abrir panel de usuario de Alice Owner'
    );
    await page.click('#btnUserPanel');
    await expect(page).toHaveURL(/auth\/profile\.html$/);

    const storageCard = page.locator('#storage-card');
    await expect(storageCard).toBeVisible();
    await expect(storageCard).toHaveAttribute('data-status', 'ready');
    await expect(page.locator('#storage-count')).toHaveText('0');
    await expect(page.locator('#storage-projects li')).toHaveText('No se encontraron proyectos.');

    const backupPayload = {
      version: 2,
      exportedAt: Date.now(),
      items: [
        {
          cerimonialista: { nomeCompleto: 'Coordinadora Uno', telefone: '', redeSocial: '' },
          evento: { nome: 'Proyecto Importado Uno' },
          lista: [],
          tipos: [],
          modelos: {},
          vars: {}
        },
        {
          cerimonialista: { nomeCompleto: 'Coordinadora Dos', telefone: '', redeSocial: '' },
          evento: { nome: 'Proyecto Importado Dos' },
          lista: [],
          tipos: [],
          modelos: {},
          vars: {}
        }
      ]
    };

    await page.setInputFiles('#storage-import-file', {
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backupPayload, null, 2), 'utf-8')
    });

    await expect(page.locator('#storage-count')).toHaveText('2');
    await expect(page.locator('#storage-projects li').first()).toContainText('Proyecto Importado');
    await expect(page.locator('#storage-feedback')).toHaveText('Copia de seguridad importada (2 proyectos restaurados).');

    const downloadPromise = page.waitForEvent('download');
    await page.click('#storage-export');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^miniapp-backup-/);
    const exported = await readDownloadFile(download);
    const parsed = JSON.parse(exported);
    expect(Array.isArray(parsed.items)).toBeTruthy();
    expect(parsed.items).toHaveLength(2);
    await expect(page.locator('#storage-feedback')).toHaveText('Copia de seguridad exportada (2 proyectos).');

    await page.click('#storage-wipe');
    await expect(page.locator('#storage-count')).toHaveText('0');
    await expect(page.locator('#storage-projects li')).toHaveText('No se encontraron proyectos.');
    await expect(page.locator('#storage-feedback')).toHaveText('Todos los proyectos fueron eliminados.');
  });

  test('cartão de armazenamento quando IndexedDB não está disponível', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
    });
    await page.goto(`${baseURL}/miniapps/base_shell/auth/profile.html`);
    const storageCard = page.locator('#storage-card');
    await expect(storageCard).toBeVisible();
    await expect(storageCard).toHaveAttribute('data-status', 'unsupported');
    await expect(page.locator('#storage-feedback')).toHaveText('Armazenamento local indisponível.');
    await expect(page.locator('#storage-export')).toBeDisabled();
    await expect(page.locator('#storage-import')).toBeDisabled();
    await expect(page.locator('#storage-wipe')).toBeDisabled();
    await expect(page.locator('#storage-persist')).toHaveAttribute('aria-disabled', 'true');
  });
});

async function readDownloadFile(download: Download): Promise<string> {
  const filePath = await download.path();
  if (filePath) {
    return await fs.promises.readFile(filePath, 'utf-8');
  }
  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error('Download stream unavailable');
  }
  return await streamToString(stream);
}

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  return await new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    stream.on('error', reject);
  });
}
