import { test, expect } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  test('exibe header minimalista e mantém principais fluxos de autenticação', async ({ page }) => {
    await page.goto(`${baseURL}/miniapps/base_shell/index.html`);

    await expect(page).toHaveURL(/auth\/login\.html$/);

    const header = page.locator('.app-header');
    await expect(header).toBeVisible();
    await expect(header.locator('> *')).toHaveCount(1);
    await expect(header).toHaveCSS('justify-content', 'flex-end');

    const menuButton = header.getByRole('button', { name: 'menu' });
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveText('menu');

    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();

    await page.click('[data-action="open-register"]');
    await expect(page).toHaveURL(/auth\/register\.html$/);
    await expect(page.getByRole('heading', { name: /Criar conta/i })).toBeVisible();

    const phoneCountry = page.locator('#register-phone-country');
    const phoneInput = page.locator('#register-phone');
    await expect(phoneCountry).toHaveValue('55');
    await phoneInput.fill('11999999999');
    await expect(phoneInput).toHaveValue('(11) 99999-9999');

    await page.fill('#register-password', 'SenhaForte1!');
    await page.click('#register-form .cta');
    await expect(page.locator('#register-feedback')).toHaveText(
      'Cadastro enviado para processamento. Aguarde a confirmação.'
    );
    await expect(page).toHaveURL(/auth\/profile\.html$/);

    const profileHeader = page.locator('.app-header');
    await expect(profileHeader.locator('.app-header__menu-button')).toHaveText('menu');

    const profileName = page.locator('#profile-name');
    const profileEmail = page.locator('#profile-email');
    const profileRole = page.locator('#profile-role');
    await expect(profileName).toHaveValue('(11) 99999-9999');
    await expect(profileEmail).toHaveValue('alice@example.com');
    await expect(profileRole).toHaveValue('owner');

    await profileName.fill('Bruno Partner');
    await profileEmail.fill('bruno.partner@example.com');
    await profileRole.selectOption('owner');
    await page.click('#profile-form button[type="submit"]');
    await expect(page.locator('#profile-form-feedback')).toHaveText('Perfil atualizado com sucesso.');

    await page.fill('#password-current', 'SenhaForte1!');
    await page.fill('#password-new', 'SenhaForte2@');
    await page.fill('#password-confirm', 'SenhaForte2@');
    await page.click('#password-form button[type="submit"]');
    await expect(page.locator('#password-form-feedback')).toHaveText('Senha atualizada com sucesso.');

    await page.click('#profile-logout');
    await expect(page.locator('#profile-feedback')).toHaveText('Sair');
    await expect(page).toHaveURL(/auth\/login\.html$/);

    await page.fill('#login-email', 'bruno.partner@example.com');
    await page.fill('#login-password', 'SenhaForte2@');
    await page.click('#login-form .cta');
    await expect(page.locator('#login-feedback')).toHaveText('Sessão iniciada como Bruno Partner.');

    await page.goto(`${baseURL}/miniapps/base_shell/index.html`);
    await expect(page.locator('.app-header__menu-button')).toHaveText('menu');
    await expect(page.locator('#panel')).toBeVisible();
  });
});
