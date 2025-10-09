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

  test('renderiza Painel de Controle e reage à troca de idioma', async ({ page }) => {
    await page.goto('/appbase/index.html');

    const rail = page.locator('[data-miniapp-rail]');
    const cards = rail.locator('.ac-miniapp-card');
    await expect(cards).toHaveCount(2);

    const painelCard = cards.first();
    const painelTitle = painelCard.locator('.ac-miniapp-card__title');
    const demoCard = cards.nth(1);
    const demoTitle = demoCard.locator('.ac-miniapp-card__title');
    const demoSubtitle = demoCard.locator('.ac-miniapp-card__subtitle');

    await expect(painelCard).toBeVisible();
    await expect(painelTitle).toHaveText('Painel de Controle');
    await expect(demoTitle).toHaveText('Boas-vindas Marco');
    await expect(demoSubtitle).toHaveText(
      'Teste o fluxo completo com o painel oficial habilitado.'
    );

    await page.evaluate(async () => window.AppBaseI18n?.setLocale?.('en-US'));
    await expect(painelTitle).toHaveText('Control Panel');
    await expect(demoTitle).toHaveText('Marco Welcome');
    await expect(demoSubtitle).toHaveText(
      'Exercise the full flow with the official panel enabled.'
    );

    await page.evaluate(async () => window.AppBaseI18n?.setLocale?.('es-ES'));
    await expect(painelTitle).toHaveText('Panel de Control');
    await expect(demoTitle).toHaveText('Bienvenida Marco');
    await expect(demoSubtitle).toHaveText(
      'Pruebe el flujo completo con el panel oficial habilitado.'
    );

    await painelCard.click();
    await expect(page.locator('#painel-stage')).toBeVisible();

    await demoCard.locator('.ac-btn').click();
    await expect(page.locator('#painel-stage')).toBeVisible();
  });

  test('ativa fallback local quando o manifest falha', async ({ page }) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        const text = message.text();
        if (
          text.startsWith('Failed to load resource') ||
          text.includes('miniapps/control_panel/manifest.json') ||
          text.includes('miniapps/boas-vindas/manifest.json') ||
          text.includes('5horas.com.br')
        ) {
          return;
        }
        errors.push(text);
      }
    });

    await page.route('**/miniapps/control_panel/manifest.json', (route) => {
      route.fulfill({ status: 500, body: 'erro' });
    });
    await page.route('**/miniapps/boas-vindas/manifest.json', (route) => {
      route.fulfill({ status: 500, body: 'erro' });
    });

    await page.goto('/appbase/index.html');

    const rail = page.locator('[data-miniapp-rail]');
    const cards = rail.locator('.ac-miniapp-card');
    const painelFallback = cards.first();
    const painelNote = painelFallback.locator('.ac-miniapp-card__note');
    const demoFallback = cards.nth(1);
    const demoNote = demoFallback.locator('.ac-miniapp-card__note');

    await expect(painelFallback).toHaveAttribute('data-fallback', 'true');
    await expect(painelNote).toHaveText('Carregado via fallback local');
    await expect(demoFallback).toHaveAttribute('data-fallback', 'true');
    await expect(demoNote).toHaveText('Carregado via fallback local');
    expect(errors).toEqual([]);
  });

  test('card Boas-vindas reflete traduções e badges ativos', async ({ page }) => {
    await page.goto('/appbase/index.html');

    const demoCard = page.locator('[data-miniapp-rail] .ac-miniapp-card').nth(1);
    const demoTitle = demoCard.locator('.ac-miniapp-card__title');
    await expect(demoCard).toHaveAttribute('role', 'listitem');
    await expect(demoCard).toHaveAttribute('tabindex', '0');
    await expect(demoCard).toHaveAttribute('data-miniapp', 'boas-vindas');

    await page.evaluate(async () => window.AppBaseI18n?.setLocale?.('en-US'));
    await expect(demoTitle).toHaveText('Marco Welcome');

    await page.evaluate(async () => window.AppBaseI18n?.setLocale?.('es-ES'));
    await expect(demoTitle).toHaveText('Bienvenida Marco');
  });
});
