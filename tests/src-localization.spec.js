const { test, expect } = require('@playwright/test');

const LOCALE_LOADING_POLL_INTERVAL = 50;

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test.describe('Localização da interface (archive/src-r0/)', () => {
  test('aplica apenas a última troca de idioma ao abortar requisições antigas', async ({ page }) => {
    let firstLocaleRequest = true;

    await page.route('**/src/locales/en-US.json', async (route) => {
      if (firstLocaleRequest) {
        firstLocaleRequest = false;
        await wait(300);
        try {
          await route.continue();
        } catch (error) {
          if (error?.name === 'AbortError') {
            return;
          }
          const message = error?.message ?? '';
          if (
            message.includes('aborted') ||
            message.includes('Request is already handled') ||
            message.includes('Target closed')
          ) {
            return;
          }
          throw error;
        }
        return;
      }
      await route.continue();
    });

    await page.goto('/archive/src-r0/index.html');

    const select = page.locator('[data-action="change-locale"]');
    await expect(select).toBeVisible();
    await expect(select).toHaveValue('pt-BR');

    await select.selectOption('en-US');
    await expect(select).toHaveAttribute('aria-busy', 'true');
    await expect
      .poll(
        () => page.evaluate(() => document.documentElement.dataset.localeLoading ?? ''),
        { interval: LOCALE_LOADING_POLL_INTERVAL }
      )
      .toBe('true');

    await select.selectOption('pt-BR');

    await expect
      .poll(() => page.evaluate(() => window.__localeAbortCount ?? 0))
      .toBeGreaterThan(0);

    await expect
      .poll(
        () => page.evaluate(() => document.documentElement.lang),
        { interval: LOCALE_LOADING_POLL_INTERVAL }
      )
      .toBe('pt-BR');

    await expect
      .poll(
        () => page.evaluate(() => document.documentElement.dataset.localeLoading ?? ''),
        { interval: LOCALE_LOADING_POLL_INTERVAL }
      )
      .toBe('');

    await expect(select).not.toHaveAttribute('aria-busy', 'true');
    await expect(select).toHaveValue('pt-BR');

    const statusIndicator = page.locator('[data-ref="status-indicator"]');
    await expect(statusIndicator).toContainText('Sessão ativa');
    await expect(statusIndicator).not.toContainText('Active session');
  });
});
