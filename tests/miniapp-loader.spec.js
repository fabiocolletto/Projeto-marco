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

  test('painel integrado é acionado pelo cabeçalho e o rail fica vazio', async ({
    page,
  }) => {
    await page.goto('/appbase/index.html');

    const railCards = page.locator('[data-miniapp-rail] .ac-miniapp-card');
    await expect(railCards).toHaveCount(0);

    const panelAccess = page.locator('[data-panel-access]');
    const stage = page.locator('#painel-stage');
    const title = page.locator('#painel-stage-title');

    await expect(stage).toBeHidden();
    await panelAccess.click();
    await expect(stage).toBeVisible();
    await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');

    await page.evaluate(async () => window.AppBaseI18n?.setLocale?.('en-US'));
    await expect(title).toHaveText('Control panel');
    await page.evaluate(async () => window.AppBaseI18n?.setLocale?.('es-ES'));
    await expect(title).toHaveText('Panel de control');
  });

  test('boas-vindas registra fallback local mesmo sem card no rail', async ({
    page,
  }) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        const text = message.text();
        if (text.startsWith('Failed to load resource') || text.includes('5horas.com.br')) {
          return;
        }
        errors.push(text);
      }
    });

    await page.route('**/miniapps/boas-vindas/manifest.json', (route) => {
      route.fulfill({ status: 500, body: 'erro' });
    });

    await page.goto('/appbase/index.html');

    await expect(page.locator('[data-miniapp-rail] .ac-miniapp-card')).toHaveCount(0);
    await page.waitForFunction(
      () => typeof window.AppBase !== 'undefined' && window.AppBase.resolve('boas-vindas'),
    );

    const fallbackMeta = await page.evaluate(() => {
      const module = window.AppBase.resolve('boas-vindas');
      return module ? window.AppBase.getModuleMeta('boas-vindas') : null;
    });
    expect(fallbackMeta).not.toBeNull();
    expect(errors).toEqual([]);
  });
});
