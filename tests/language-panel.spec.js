const { test, expect } = require('@playwright/test');

const SUPPORTED_LOCALES = [
  { code: 'pt-BR', flag: '🇧🇷', label: 'Brasil' },
  { code: 'en-US', flag: '🇺🇸', label: 'Estados Unidos' },
  { code: 'es-ES', flag: '🇪🇸', label: 'Espanha' },
];

async function openHostPanel(page) {
  const panelAccess = page.locator('[data-panel-access]');
  await expect(panelAccess).toBeVisible();
  if ((await panelAccess.getAttribute('aria-expanded')) !== 'true') {
    await panelAccess.click();
  }
  await expect(page.locator('#painel-stage')).toBeVisible();
}

async function openLocaleMenu(page) {
  const localeButton = page.locator('.ac-header-action[data-action-id="app.locale"]');
  await expect(localeButton).toBeVisible();
  await localeButton.click();
  const menu = page.locator('[data-locale-menu]');
  await expect(menu).toBeVisible();
  await expect(localeButton).toHaveAttribute('aria-expanded', 'true');
  return { localeButton, menu };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
    } catch (error) {
      /* noop */
    }
  });
});

test('menu de idiomas apresenta opções com bandeiras e registra histórico', async ({ page }) => {
  await page.goto('/appbase/index.html');
  const { menu, localeButton } = await openLocaleMenu(page);

  for (const locale of SUPPORTED_LOCALES) {
    const option = menu.locator(`[data-locale-option="${locale.code}"]`);
    await expect(option).toBeVisible();
    await expect(option.locator('.ac-locale-menu__flag')).toHaveText(locale.flag);
    await expect(option.locator('.ac-locale-menu__name')).toHaveText(locale.label);
  }

  const spanishOption = menu.locator('[data-locale-option="es-ES"]');
  await spanishOption.click();
  await expect(localeButton).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeHidden();

  await expect
    .poll(() => page.evaluate(() => window.AppBaseI18n?.getLocale?.()))
    .toBe('es-ES');

  await openHostPanel(page);
  const historyTitle = page.locator('[data-i18n="app.panel.history.title"]');
  await expect(historyTitle).toHaveText('Historial de actividades');
  const firstRow = page.locator('[data-login-log-body] tr').first().locator('td');
  await expect(firstRow.first()).toHaveText('#1');
  await expect(firstRow.nth(1)).toContainText('España');
});

test('menu de idiomas reflete seleção atual e atualiza traduções', async ({ page }) => {
  await page.goto('/appbase/index.html');
  let context = await openLocaleMenu(page);
  await expect(context.menu.locator('[data-locale-option="pt-BR"]'))
    .toHaveClass(/is-selected/);
  await page.keyboard.press('Escape');
  await expect(context.localeButton).toHaveAttribute('aria-expanded', 'false');

  context = await openLocaleMenu(page);
  await context.menu.locator('[data-locale-option="en-US"]').click();
  await expect
    .poll(() => page.evaluate(() => window.AppBaseI18n?.getLocale?.()))
    .toBe('en-US');

  context = await openLocaleMenu(page);
  await expect(context.menu.locator('[data-locale-option="en-US"]'))
    .toHaveClass(/is-selected/);
  await expect(
    context.menu.locator('[data-locale-option="pt-BR"] .ac-locale-menu__name')
  ).toHaveText('Brazil');
  await page.keyboard.press('Escape');
  await expect(context.localeButton).toHaveAttribute('aria-expanded', 'false');
  await expect(context.localeButton).toBeFocused();
});
