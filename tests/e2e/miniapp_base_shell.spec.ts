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

    const profileName = page.locator('#profile-name');
    const profileEmail = page.locator('#profile-email');
    const profileRole = page.locator('#profile-role');
    const profileFeedback = page.locator('#profile-form-feedback');
    await expect(profileName).toHaveValue('Alice Owner');
    await expect(profileEmail).toHaveValue('alice@example.com');
    await expect(profileRole).toHaveValue('owner');

    await profileName.fill('Alicia Admin');
    await profileEmail.fill('alicia.admin@example.com');
    await profileRole.selectOption('member');
    await page.click('#profile-form button[type="submit"]');
    await expect(profileFeedback).toHaveText('Perfil actualizado correctamente.');
    await expect(page.locator('#current-user')).toHaveText('Alicia Admin');

    await profileEmail.fill('bruno@example.com');
    await page.click('#profile-form button[type="submit"]');
    await expect(profileFeedback).toHaveText('Correo ya registrado.');
    await page.click('#profile-form button[type="reset"]');
    await expect(profileEmail).toHaveValue('alicia.admin@example.com');

    const passwordFeedback = page.locator('#password-form-feedback');
    await page.fill('#password-current', 'secret1');
    await page.fill('#password-new', 'newSecret1');
    await page.fill('#password-confirm', 'newSecret1');
    await page.click('#password-form button[type="submit"]');
    await expect(passwordFeedback).toHaveText('Contraseña actualizada correctamente.');
    await expect(page.locator('#password-current')).toHaveValue('');

    await page.click('#profile-logout');
    await expect(page.locator('#profile-feedback')).toHaveText('Cerrar sesión');
    await expect(profileName).toBeDisabled();
    await expect(profileEmail).toBeDisabled();

    await page.goto(`${baseURL}/miniapps/base_shell/auth/login.html`);
    await page.fill('#login-email', 'alicia.admin@example.com');
    await page.fill('#login-password', 'newSecret1');
    await page.click('#login-form .cta');
    await expect(page.locator('#login-feedback')).toHaveText('Sesión iniciada como Alicia Admin.');

    await page.goto(`${baseURL}/miniapps/base_shell/auth/profile.html`);
    await expect(page.locator('#profile-name')).toHaveValue('Alicia Admin');

    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('¿Desea eliminar la cuenta de Alicia Admin?');
      await dialog.accept();
    });
    await page.click('#delete-account');
    await expect(page).toHaveURL(/auth\/login\.html$/);
    await expect.poll(async () => {
      const raw = await page.evaluate(() => window.localStorage.getItem('miniapp.base.users'));
      if (!raw) return [] as string[];
      return JSON.parse(raw).map((user: { email: string }) => user.email).sort();
    }).toEqual(['bruno@example.com']);
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('miniapp.base.session'))).toBe('null');
  });
});
