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

    const shell = page.locator('.app-shell');
    const settingsSubmenu = page.locator('#settings-submenu');

    await expect(shell).not.toHaveClass(/is-collapsed/);

    await page.click('#settings-toggle');
    await expect(shell).toHaveClass(/is-collapsed/);
    await expect(settingsSubmenu).toBeVisible();

    await page.click('#settings-toggle');
    await expect(settingsSubmenu).toBeHidden();
    await expect(shell).toHaveClass(/is-collapsed/);

    await page.click('#btnMenu');
    await expect(shell).not.toHaveClass(/is-collapsed/);

    await page.click('#btnCollapse');
    await expect(shell).toHaveClass(/is-collapsed/);

    await page.click('#settings-toggle');
    await expect(settingsSubmenu).toBeVisible();

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
    await expect(page).toHaveURL(/auth\/profile\.html$/);

    const userManagementCard = page.locator('#user-management');
    await expect(userManagementCard).toBeVisible();
    await page.click('#user-management-create');
    await page.fill('#manage-name', 'Bruno Member');
    await page.fill('#manage-email', 'bruno@example.com');
    await page.fill('#manage-password', 'secret2');
    await page.selectOption('#manage-role', 'member');
    await page.click('#user-management-submit');
    await expect(page.locator('#user-management-feedback')).toHaveText(
      'Usuario Bruno Member creado correctamente.'
    );
    await expect(page.locator('#user-management-list')).toContainText('Alice Owner');
    await expect(page.locator('#user-management-list')).toContainText('Bruno Member');

    await page.click('#btnUser');
    await page.click('#user-menu button[data-action="logout"]');
    await expect(page).toHaveURL(/auth\/login\.html$/);

    await expect(page.locator('#login-register-hint')).toBeHidden();

    await page.fill('#login-email', 'bruno@example.com');
    await page.fill('#login-password', 'secret2');
    await page.click('#login-form .cta');
    await expect(page.locator('#login-feedback')).toHaveText('Sesión iniciada como Bruno Member.');

    await page.click('#btnUserPanel');
    await expect(page).toHaveURL(/auth\/profile\.html$/);
    await expect(page.locator('#user-management')).toBeHidden();

    const profileName = page.locator('#profile-name');
    const profileEmail = page.locator('#profile-email');
    const profileRole = page.locator('#profile-role');
    const profileFeedback = page.locator('#profile-form-feedback');
    await expect(profileName).toHaveValue('Bruno Member');
    await expect(profileEmail).toHaveValue('bruno@example.com');
    await expect(profileRole).toHaveValue('member');

    await profileName.fill('Bruno Partner');
    await profileEmail.fill('bruno.partner@example.com');
    await profileRole.selectOption('member');
    await page.click('#profile-form button[type="submit"]');
    await expect(profileFeedback).toHaveText('Perfil actualizado correctamente.');
    await expect(page.locator('#current-user')).toHaveText('Bruno Partner');

    await profileEmail.fill('alice@example.com');
    await page.click('#profile-form button[type="submit"]');
    await expect(profileFeedback).toHaveText('Correo ya registrado.');
    await page.click('#profile-form button[type="reset"]');
    await expect(profileEmail).toHaveValue('bruno.partner@example.com');

    const passwordFeedback = page.locator('#password-form-feedback');
    await page.fill('#password-current', 'secret2');
    await page.fill('#password-new', 'secret2New');
    await page.fill('#password-confirm', 'secret2New');
    await page.click('#password-form button[type="submit"]');
    await expect(passwordFeedback).toHaveText('Contraseña actualizada correctamente.');
    await expect(page.locator('#password-current')).toHaveValue('');

    await page.click('#profile-logout');
    await expect(page.locator('#profile-feedback')).toHaveText('Cerrar sesión');
    await expect(profileName).toBeDisabled();
    await expect(profileEmail).toBeDisabled();

    await expect(page).toHaveURL(/auth\/login\.html$/);
    await page.fill('#login-email', 'bruno.partner@example.com');
    await page.fill('#login-password', 'secret2New');
    await page.click('#login-form .cta');
    await expect(page.locator('#login-feedback')).toHaveText('Sesión iniciada como Bruno Partner.');

    await page.click('#btnUser');
    await page.click('#user-menu button[data-action="logout"]');
    await expect(page).toHaveURL(/auth\/login\.html$/);

    await page.fill('#login-email', 'alice@example.com');
    await page.fill('#login-password', 'secret1');
    await page.click('#login-form .cta');
    await expect(page.locator('#login-feedback')).toHaveText('Sesión iniciada como Alice Owner.');

    await page.click('#btnUserPanel');
    await expect(page).toHaveURL(/auth\/profile\.html$/);

    await expect(page.locator('#user-management')).toBeVisible();
    const ownerProfileName = page.locator('#profile-name');
    const ownerProfileEmail = page.locator('#profile-email');
    const ownerProfileRole = page.locator('#profile-role');
    const ownerProfileFeedback = page.locator('#profile-form-feedback');
    await ownerProfileName.fill('Alicia Admin');
    await ownerProfileEmail.fill('alicia.admin@example.com');
    await ownerProfileRole.selectOption('owner');
    await page.click('#profile-form button[type="submit"]');
    await expect(ownerProfileFeedback).toHaveText('Perfil actualizado correctamente.');
    await expect(page.locator('#current-user')).toHaveText('Alicia Admin');

    await ownerProfileEmail.fill('bruno.partner@example.com');
    await page.click('#profile-form button[type="submit"]');
    await expect(ownerProfileFeedback).toHaveText('Correo ya registrado.');
    await page.click('#profile-form button[type="reset"]');
    await expect(ownerProfileEmail).toHaveValue('alicia.admin@example.com');

    const ownerPasswordFeedback = page.locator('#password-form-feedback');
    await page.fill('#password-current', 'secret1');
    await page.fill('#password-new', 'newSecret1');
    await page.fill('#password-confirm', 'newSecret1');
    await page.click('#password-form button[type="submit"]');
    await expect(ownerPasswordFeedback).toHaveText('Contraseña actualizada correctamente.');

    const editBrunoButton = page
      .locator('#user-management-list tr', { hasText: 'Bruno Partner' })
      .locator('button', { hasText: 'Editar' });
    await editBrunoButton.click();
    await page.fill('#manage-name', 'Bruno Colaborador');
    await page.click('#user-management-submit');
    await expect(page.locator('#user-management-feedback')).toHaveText(
      'Datos de Bruno Colaborador actualizados correctamente.'
    );
    await expect(page.locator('#user-management-list')).toContainText('Bruno Colaborador');

    await page.click('#profile-logout');
    await expect(page.locator('#profile-feedback')).toHaveText('Cerrar sesión');
    await expect(page).toHaveURL(/auth\/login\.html$/);

    await page.fill('#login-email', 'alicia.admin@example.com');
    await page.fill('#login-password', 'newSecret1');
    await page.click('#login-form .cta');
    await expect(page.locator('#login-feedback')).toHaveText('Sesión iniciada como Alicia Admin.');

    await page.click('#btnUserPanel');
    await expect(page).toHaveURL(/auth\/profile\.html$/);

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
    }).toEqual(['bruno.partner@example.com']);
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('miniapp.base.session'))).toBe('null');
  });
});
