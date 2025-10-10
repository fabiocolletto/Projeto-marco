const { test, expect } = require('@playwright/test');

async function ensurePanelOpen(page) {
  const panelAccess = page.locator('[data-panel-access]');
  await expect(panelAccess).toBeVisible();
  if ((await panelAccess.getAttribute('aria-expanded')) !== 'true') {
    await panelAccess.click();
    await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');
  }
  const stage = page.locator('#painel-stage');
  await expect(stage).toBeVisible();
  return stage;
}

async function registerUser(page, { nome, email, telefone = '', senha = 'SenhaForte123' }) {
  const stage = await ensurePanelOpen(page);
  const form = stage.locator('[data-login-form]');
  await expect(form).toBeVisible();

  await form.locator('input[name="nome"]').fill(nome);
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="telefone"]').fill(telefone);
  await form.locator('input[name="senha"]').fill(senha);

  await form.locator('[data-action="login-save"]').click();
  await expect(page.locator('[data-login-feedback]')).toHaveText(
    'Cadastro atualizado com sucesso.'
  );
}

async function changeLocale(page, locale) {
  const localeButton = page.locator('.ac-header-action[data-action-id="app.locale"]');
  await expect(localeButton).toBeVisible();
  await localeButton.click();
  const menu = page.locator('[data-locale-menu]');
  await expect(menu).toBeVisible();
  await menu.locator(`[data-locale-option="${locale}"]`).click();
  await expect(localeButton).toHaveAttribute('aria-expanded', 'false');
  await expect
    .poll(() => page.evaluate(() => window.AppBaseI18n?.getLocale?.()))
    .toBe(locale);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
      if (window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch (error) {
      /* noop */
    }

    try {
      const request = indexedDB.deleteDatabase('marco-appbase');
      request.onsuccess = request.onerror = () => {
        // Garante tentativa de limpeza antes do boot.
      };
    } catch (error) {
      // Ignora falhas ao tentar limpar IndexedDB.
    }
  });
});

test('cadastro permanece após mudança de idioma e recarga da página', async ({ page }) => {
  await page.goto('/appbase/index.html');
  await registerUser(page, {
    nome: 'Joana Teste',
    email: 'joana@example.com',
    telefone: '11988887777',
  });

  await changeLocale(page, 'en-US');
  await expect(page.locator('[data-panel-status-label]').first()).toHaveText('Connected');

  await page.reload({ waitUntil: 'load' });
  await page.waitForLoadState('load');

  const stage = await ensurePanelOpen(page);
  await expect
    .poll(() => page.evaluate(() => window.AppBaseI18n?.getLocale?.()))
    .toBe('en-US');

  await expect(page.locator('[data-panel-access]')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-login-user]')).toHaveText('Joana Teste');
  await expect(page.locator('[data-login-account]')).toHaveText('joana');
  await expect(stage.locator('[data-login-form] input[name="nome"]')).toHaveValue('Joana Teste');
  await expect(stage.locator('[data-login-form] input[name="email"]')).toHaveValue('joana@example.com');
  await expect(stage.locator('[data-login-form] input[name="telefone"]')).toHaveValue('(11) 98888-7777');

  const firstHistoryCell = page.locator('[data-login-log-body] tr').first().locator('td').first();
  await expect(firstHistoryCell).toContainText('United States');
});
