import { expect, test } from '@playwright/test';
import { access } from 'node:fs/promises';

const widgetHtmlUrl = new URL('../../dist/app-base-widget.html', import.meta.url);

async function ensureWidgetHtmlExists() {
  try {
    await access(widgetHtmlUrl);
  } catch (error) {
    throw new Error(
      `Widget HTML não encontrado em ${widgetHtmlUrl.pathname}. Execute "npm run build:widget" antes de rodar os testes.`,
      { cause: error }
    );
  }
}

test.describe('Widget AppBase standalone HTML', () => {
  test.beforeAll(async () => {
    await ensureWidgetHtmlExists();
  });

  test('abre o AppBase automaticamente quando carregado via file://', async ({ page }) => {
    await page.goto(widgetHtmlUrl.toString());

    await expect.poll(async () => {
      return page.evaluate(() =>
        Boolean(window.__APP_BASE_WIDGET_READY__)
      );
    }).toBe(true);

    await expect(page.locator('.app-base-layout')).toBeVisible();
    await expect(page.locator('.app-base-layout__top')).toBeVisible();
    await expect(page.locator('.app-base-layout__nav')).toBeVisible();
    await expect(page.locator('.app-base-layout__workspace')).toBeVisible();
  });
});
