const { test, expect } = require('@playwright/test');

async function clearStorage(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
    } catch (error) {
      /* noop */
    }
  });
}

test.describe('MiniApp loader', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('renderiza Painel de Controles e reage à troca de idioma', async ({ page }) => {
    await page.goto('/appbase/index.html');

    const rail = page.locator('[data-miniapp-rail]');
    const card = rail.locator('.ac-miniapp-card').first();
    const title = card.locator('.ac-miniapp-card__title');

    await expect(card).toBeVisible();
    await expect(title).toHaveText('Painel de Controles');

    await page.evaluate(async () => window.AppBaseI18n?.setLocale?.('en-US'));
    await expect(title).toHaveText('Control Panel');

    await page.evaluate(async () => window.AppBaseI18n?.setLocale?.('es-ES'));
    await expect(title).toHaveText('Panel de Controles');

    await card.click();
    await expect(page.locator('#painel-stage')).toBeVisible();
  });

  test('ativa fallback local quando o manifest falha', async ({ page }) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    await page.route('**/miniapps/painel-controles/manifest.json', (route) => {
      route.fulfill({ status: 500, body: 'erro' });
    });

    await page.goto('/appbase/index.html');

    const rail = page.locator('[data-miniapp-rail]');
    const card = rail.locator('.ac-miniapp-card').first();
    const note = card.locator('.ac-miniapp-card__note');

    await expect(card).toHaveAttribute('data-fallback', 'true');
    await expect(note).toHaveText('Carregado via fallback local');
    expect(errors).toEqual([]);
  });
});
