const { test, expect } = require('@playwright/test');

async function openHostPanel(page) {
  const panelAccess = page.locator('[data-panel-access]');
  await expect(panelAccess).toBeVisible();
  if ((await panelAccess.getAttribute('aria-expanded')) !== 'true') {
    await panelAccess.click();
  }
  await expect(page.locator('#painel-stage')).toBeVisible();
}

async function openLanguagePanel(page) {
  const localeButton = page.locator('.ac-header-action[data-action-id="app.locale"]');
  await expect(localeButton).toBeVisible();
  await localeButton.click();
  await expect(localeButton).toHaveAttribute('aria-pressed', 'true');
  const langStage = page.locator('[data-lang-stage]');
  await expect(langStage).toBeVisible();
  return { localeButton, langStage };
}

const locales = [
  {
    code: 'pt-BR',
    stageTitle: 'Configurações',
    cardTitle: 'Idioma & Região',
    logTitle: 'Log de comandos',
    applyLabel: 'Aplicar',
  },
  {
    code: 'en-US',
    stageTitle: 'Settings',
    cardTitle: 'Language & Region',
    logTitle: 'Command log',
    applyLabel: 'Apply',
  },
  {
    code: 'es-ES',
    stageTitle: 'Configuración',
    cardTitle: 'Idioma y Región',
    logTitle: 'Registro de comandos',
    applyLabel: 'Aplicar',
  },
];

for (const locale of locales) {
  test(`painel de idiomas ${locale.code}`, async ({ page }) => {
    await page.addInitScript(({ locale }) => {
      try {
        window.localStorage.clear();
        window.localStorage.setItem('app.locale', locale);
      } catch (error) {
        /* noop */
      }
    }, { locale: locale.code });

    await page.goto('/appbase/index.html');
    await openHostPanel(page);
    const { langStage } = await openLanguagePanel(page);

    await expect(page.locator('#painel-stage')).toBeHidden();

    await expect(langStage.locator('#language-stage-title')).toHaveText(locale.stageTitle);
    await expect(
      langStage.locator('[data-i18n="app.settings.lang_card.title"]')
    ).toHaveText(locale.cardTitle);
    await expect(
      langStage.locator('[data-i18n="app.settings.log.title"]')
    ).toHaveText(locale.logTitle);

    const applyButton = langStage.locator('[data-lang-apply]');
    await expect(applyButton).toHaveText(locale.applyLabel);

    const logArea = langStage.locator('[data-lang-log]');
    await expect(logArea).toContainText('settings:init');
    await expect(logArea).toContainText('settings:open');

    await langStage.locator('[data-lang-select]').selectOption(locale.code);
    await applyButton.click();
    await expect(logArea).toContainText(`"locale":"${locale.code}"`);

    await langStage.locator('[data-lang-close]').click();
    await expect(langStage).toBeHidden();
    await expect(page.locator('#painel-stage')).toBeVisible();
  });
}

test('painel de idiomas alterna traduções em sequência', async ({ page }) => {
  await page.goto('/appbase/index.html');
  await openHostPanel(page);
  const { langStage } = await openLanguagePanel(page);

  const select = langStage.locator('[data-lang-select]');
  const apply = langStage.locator('[data-lang-apply]');

  for (const locale of locales) {
    await select.selectOption(locale.code);
    await apply.click();
    await expect(langStage.locator('#language-stage-title')).toHaveText(locale.stageTitle);
  }
});
