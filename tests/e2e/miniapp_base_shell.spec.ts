import { test, expect, type Dialog } from '@playwright/test';
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

    await expect(page).toHaveURL(/auth\/login\.html$/);

    const navigationTrigger = page.locator('#btnMiniapps');
    const navigationOverlay = page.locator('#navigation-overlay');
    const miniAppTitle = page.locator('[data-miniapp-title]');
    const miniAppMessage = page.locator('[data-miniapp-message]');
    const userMenuToggle = page.locator('#btnUser');
    const userMenu = page.locator('#user-menu');
    const openNavigation = async () => {
      if (await navigationOverlay.isHidden()) {
        await navigationTrigger.click();
        await expect(navigationOverlay).toBeVisible();
      }
    };
    const closeNavigation = async () => {
      if (await navigationOverlay.isVisible()) {
        const closeButton = navigationOverlay.locator('[data-navigation-close]');
        await expect(closeButton).toBeVisible();
        await closeButton.click();
        await expect(navigationOverlay).toBeHidden();
      }
    };
    const selectNavigationAction = async (action: string) => {
      await openNavigation();
      const actionButton = navigationOverlay.locator(`[data-nav-action="${action}"]`).first();
      await expect(actionButton).toBeVisible();
      await actionButton.click();
      await expect(navigationOverlay).toBeHidden();
    };
    const expectMiniAppCatalogHidden = async () => {
      await openNavigation();
      const miniAppSection = navigationOverlay.locator('[data-navigation-miniapps="true"]');
      await expect(miniAppSection).toBeHidden();
      await closeNavigation();
    };
    const openUserMenu = async () => {
      if (!(await userMenu.isVisible())) {
        await userMenuToggle.click();
        await expect(userMenu).toBeVisible();
      }
    };
    const closeUserMenu = async () => {
      if (await userMenu.isVisible()) {
        await page.keyboard.press('Escape');
        await expect(userMenu).toBeHidden();
      }
    };

    await expect(userMenu).toBeHidden();
    await userMenuToggle.click();
    await expect(userMenu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(userMenu).toBeHidden();

    await openUserMenu();
    await page.click('#btnTheme');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await openUserMenu();
    await page.click('#btnLang');
    await expect(page.locator('#page-title')).toHaveText('Sign in');
    await expect(page.locator('#login-form .cta')).toHaveText('Sign in');

    await openUserMenu();
    await page.click('#btnLang');
    await expect(page.locator('#page-title')).toHaveText('Iniciar sesión');
    await expect(page.locator('#login-form .cta')).toHaveText('Ingresar');

    await expect(page.locator('#btnUserPanel')).toBeHidden();
    await expect(page.locator('#btnUserPanel')).toHaveAttribute('aria-label', 'Abrir panel de usuario');
    await closeUserMenu();

    await openUserMenu();
    await page.click('#user-menu a[href$="register.html"]');
    await expect(page).toHaveURL(/register\.html$/);

    const ownerPhoneCountry = page.locator('#register-phone-country');
    const ownerPhoneInput = page.locator('#register-phone');
    const ownerPhoneE164 = '+5511999999999';
    const ownerPhoneDigits = '5511999999999';
    await expect(ownerPhoneCountry).toHaveValue('55');
    await ownerPhoneInput.fill('11999999999');
    await expect(ownerPhoneInput).toHaveValue('(11) 99999-9999');
    await ownerPhoneCountry.fill('44');
    await ownerPhoneInput.fill('7700900123');
    await expect(ownerPhoneInput).toHaveValue('7700900123');
    await ownerPhoneCountry.fill('55');
    await ownerPhoneInput.fill('11999999999');
    await expect(ownerPhoneInput).toHaveValue('(11) 99999-9999');
    await page.fill('#register-password', 'secret1');
    await page.click('#register-form .cta');
    await expect(page.locator('#register-feedback')).toHaveText(
      'Solicitud de registro enviada para procesamiento.'
    );
    await expect(page).toHaveURL(/auth\/profile\.html$/);

    const userManagementCard = page.locator('#user-management');
    await expect(userManagementCard).toBeVisible();
    await page.click('#user-management-create');
    await page.fill('#manage-name', 'Bruno Member');
    await page.fill('#manage-email', 'bruno@example.com');
    await page.fill('#manage-phone', '+55 11 98888-7777');
    await page.fill('#manage-password', 'secret2');
    await page.selectOption('#manage-role', 'member');
    await page.click('#user-management-submit');
    await expect(page.locator('#user-management-feedback')).toHaveText(
      'Usuario Bruno Member creado correctamente.'
    );
    await expect(page.locator('#user-management-list')).toContainText(ownerPhoneE164);
    await expect(page.locator('#user-management-list')).toContainText('Bruno Member');

    await openUserMenu();
    await page.click('#user-menu button[data-action="logout"]');
    await expect(page).toHaveURL(/auth\/login\.html$/);

    await openUserMenu();
    await expect(page.locator('#user-menu [data-register-guard]')).toBeHidden();
    await closeUserMenu();

    const loginPassword = page.locator('#login-password');
    const togglePassword = page.locator('[data-action="toggle-password"]');
    const togglePasswordLabel = togglePassword.locator('[data-password-visibility-label]');
    const togglePasswordIcon = togglePassword.locator('[data-password-visibility-icon]');
    const rememberCheckbox = page.locator('#login-remember');
    const forgotPassword = page.locator('#user-menu [data-action="forgot-password"]');
    const switchUser = page.locator('#user-menu [data-action="switch-user"]');

    await expect(rememberCheckbox).not.toBeChecked();
    await expect(togglePasswordLabel).toHaveText('Mostrar contraseña');
    await expect(togglePasswordIcon).toHaveText('👁️');
    await expect(loginPassword).toHaveAttribute('type', 'password');

    await togglePassword.click();
    await expect(loginPassword).toHaveAttribute('type', 'text');
    await expect(togglePasswordLabel).toHaveText('Ocultar contraseña');
    await expect(togglePasswordIcon).toHaveText('🙈');
    await togglePassword.click();
    await expect(loginPassword).toHaveAttribute('type', 'password');
    await expect(togglePasswordLabel).toHaveText('Mostrar contraseña');
    await expect(togglePasswordIcon).toHaveText('👁️');

    await page.fill('#login-email', 'bruno@example.com');
    await loginPassword.fill('secret2');
    page.once('dialog', async dialog => {
      expect(dialog.message()).toBe('Enviaremos instrucciones de restablecimiento a bruno@example.com.');
      await dialog.accept();
    });
    await openUserMenu();
    await forgotPassword.click();
    await expect(page.locator('#login-feedback')).toHaveText(
      'Enviaremos instrucciones de restablecimiento a bruno@example.com.'
    );

    await openUserMenu();
    await switchUser.click();
    await expect(page.locator('#login-email')).toHaveValue('');
    await expect(loginPassword).toHaveValue('');
    await expect(page.locator('#login-feedback')).toHaveText(
      'Sesión anterior finalizada. Ingresa las credenciales de la nueva persona usuaria.'
    );
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('miniapp.base.session'))).toBe('null');
    await expect
      .poll(async () => page.evaluate(() => window.sessionStorage.getItem('miniapp.base.session')))
      .toBe('null');
    await expect(rememberCheckbox).not.toBeChecked();
    await expect(togglePasswordLabel).toHaveText('Mostrar contraseña');
    await expect(togglePasswordIcon).toHaveText('👁️');

    await page.fill('#login-email', 'bruno@example.com');
    await loginPassword.fill('secret2');
    await page.click('#login-form .cta');
    await expect(page.locator('#login-feedback')).toHaveText('Sesión iniciada como Bruno Member.');
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('miniapp.base.session'))).toBe('null');
    await expect
      .poll(async () => page.evaluate(() => window.sessionStorage.getItem('miniapp.base.session')))
      .not.toBe('null');

    await openUserMenu();
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
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('miniapp.base.session'))).toBe('null');
    await expect
      .poll(async () => page.evaluate(() => window.sessionStorage.getItem('miniapp.base.session')))
      .toBe('null');
    await page.fill('#login-email', 'bruno.partner@example.com');
    await page.fill('#login-password', 'secret2New');
    await page.click('#login-form .cta');
    await expect(page.locator('#login-feedback')).toHaveText('Sesión iniciada como Bruno Partner.');

    await openUserMenu();
    await page.click('#user-menu button[data-action="logout"]');
    await expect(page).toHaveURL(/auth\/login\.html$/);
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('miniapp.base.session'))).toBe('null');
    await expect
      .poll(async () => page.evaluate(() => window.sessionStorage.getItem('miniapp.base.session')))
      .toBe('null');

    await page.fill('#login-email', ownerPhoneDigits);
    await page.fill('#login-password', 'secret1');
    await page.check('#login-remember');
    await page.click('#login-form .cta');
    await expect(page.locator('#login-feedback')).toHaveText(`Sesión iniciada como ${ownerPhoneE164}.`);
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem('miniapp.base.session')))
      .not.toBe('null');
    await expect
      .poll(async () => page.evaluate(() => window.sessionStorage.getItem('miniapp.base.session')))
      .toBe('null');

    await page.goto(`${baseURL}/miniapps/base_shell/index.html`);
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('#panel')).toBeVisible();
    await expect(page.locator('.app-footer')).toBeVisible();
    await expect(navigationOverlay).toBeHidden();

    await expectMiniAppCatalogHidden();
    await expect(miniAppTitle).toHaveText('¡Bienvenido!');
    await expect(miniAppMessage).toHaveText(
      'Elige una opción del menú para comenzar a explorar tu mini app.'
    );

    await expect(userMenu).toBeHidden();
    await userMenuToggle.click();
    await expect(userMenu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(userMenu).toBeHidden();

    await openNavigation();
    await expect(navigationTrigger).toHaveAttribute('aria-expanded', 'true');

    await closeNavigation();
    await expect(navigationTrigger).toHaveAttribute('aria-expanded', 'false');

    await openUserMenu();
    await page.click('#btnLang');
    await expect(miniAppTitle).toHaveText('Bem-vindo(a)!');
    await expect(miniAppMessage).toHaveText(
      'Selecione uma opção no menu para começar a explorar seu miniaplicativo.'
    );

    await openUserMenu();
    await page.click('#btnLang');
    await expect(miniAppTitle).toHaveText('Welcome!');
    await expect(miniAppMessage).toHaveText(
      'Pick an option from the menu to start exploring your mini app.'
    );

    await openUserMenu();
    await page.click('#btnLang');
    await expect(miniAppTitle).toHaveText('¡Bienvenido!');
    await expect(miniAppMessage).toHaveText(
      'Elige una opción del menú para comenzar a explorar tu mini app.'
    );

    await selectNavigationAction('home');
    await expect(miniAppTitle).toHaveText('¡Bienvenido!');
    await expect(miniAppMessage).toHaveText(
      'Elige una opción del menú para comenzar a explorar tu mini app.'
    );
    await expectMiniAppCatalogHidden();

    await openUserMenu();
    await expect(page.locator('#btnUserPanel')).toBeVisible();
    await expect(page.locator('#btnUserPanel')).toHaveAttribute(
      'aria-label',
      'Abrir panel de usuario'
    );
    await expect(page.locator('a[data-i18n="panel.actions.register"]')).toBeHidden();
    await closeUserMenu();

    await openUserMenu();
    await page.click('#btnUserPanel');
    await expect(page).toHaveURL(/auth\/profile\.html$/);

    await expect(page.locator('#user-management')).toBeVisible();
    const ownerProfileName = page.locator('#profile-name');
    const ownerProfileEmail = page.locator('#profile-email');
    const ownerProfileRole = page.locator('#profile-role');
    const ownerProfileFeedback = page.locator('#profile-form-feedback');
    await expect(ownerProfileRole).toHaveValue('owner');
    await ownerProfileName.fill('Alicia Admin');
    await ownerProfileEmail.fill('alicia.admin@example.com');
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
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('miniapp.base.session'))).toBe('null');
    await expect
      .poll(async () => page.evaluate(() => window.sessionStorage.getItem('miniapp.base.session')))
      .toBe('null');

    await page.fill('#login-email', 'alicia.admin@example.com');
    await page.fill('#login-password', 'newSecret1');
    await page.click('#login-form .cta');
    await expect(page.locator('#login-feedback')).toHaveText('Sesión iniciada como Alicia Admin.');

    await page.click('#btnUserPanel');
    await expect(page).toHaveURL(/auth\/profile\.html$/);

    const transferButton = page
      .locator('#user-management-list tr', { hasText: 'Bruno Colaborador' })
      .locator('button', { hasText: 'Transferir propiedad' });
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('¿Desea transferir la propiedad a Bruno Colaborador?');
      await dialog.accept();
    });
    await transferButton.click();
    await expect(ownerProfileRole).toHaveValue('member');
    await expect(page.locator('#user-management')).toBeHidden();

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

    await openUserMenu();
    const navigationPromise = page.waitForNavigation({ url: /auth\/login\.html$/ });
    const resetDialogPromise = new Promise(resolve => {
      page.once('dialog', async dialog => {
        resolve(dialog);
        await dialog.accept();
      });
    });
    await page.click('#user-menu button[data-action="reset-data"]');
    const resetDialog = (await resetDialogPromise) as Dialog;
    expect(resetDialog.message()).toContain('¿Seguro que deseas eliminar todos los datos registrados en este dispositivo?');
    await navigationPromise;

    await expect(page.locator('#login-feedback')).toHaveText(
      'Todos los datos fueron eliminados. Redirigiendo a la pantalla de inicio de sesión.'
    );

    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('miniapp.base.users'))).toBeNull();
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('miniapp.base.session'))).toBeNull();
    await expect.poll(async () => page.evaluate(() => window.sessionStorage.getItem('miniapp.base.session'))).toBeNull();
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem('miniapp.base.lang')))
      .toBe('pt-br');
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('miniapp.base.theme'))).toBeNull();
  });

  test('rodapé expande e recolhe informações extras', async ({ page }) => {
    await page.goto(`${baseURL}/miniapps/base_shell/auth/login.html`);

    const footer = page.locator('#app-footer');
    const toggle = footer.locator('[data-footer-toggle]');
    const extras = footer.locator('[data-footer-extra]');
    const revision = extras.locator('[data-revision]');
    const memStatus = extras.locator('#mem-status');

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(extras).toHaveAttribute('hidden', '');
    await expect(extras).toHaveJSProperty('hidden', true);

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(extras).not.toHaveAttribute('hidden');
    await expect(extras).toBeVisible();
    await expect(revision).toBeVisible();
    await expect(memStatus).toBeVisible();

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(extras).toHaveAttribute('hidden', '');
    await expect(extras).toHaveJSProperty('hidden', true);
  });
});
