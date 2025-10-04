import { expect, type Page } from '@playwright/test';

export type ViewportVariant = {
  name: string;
  width: number;
  height: number;
  isMobile?: boolean;
};

export const REQUIRED_SELECTORS = [
  '#cardResumo',
  '#cardIndicadores',
  '#badgeEvento',
  '#badgeAnfitriao',
  '#badgeCerimonial',
  '#kpi_tasks',
  '#kpi_for',
  '#kpi_guests',
] as const;

export const VIEWPORT_MATRIX: readonly ViewportVariant[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

export async function ensureProjectBootstrap(page: Page): Promise<void> {
  await page.waitForSelector('#chipReady', { state: 'visible', timeout: 20_000 });
  let optionCount = await page.locator('#switchEvent option').count();
  if (optionCount === 0) {
    await page.click('#btnNew');
    await expect(page.locator('#chipReady')).toBeVisible({ timeout: 20_000 });
    await page.waitForFunction(
      () => document.querySelectorAll('#switchEvent option').length > 0,
      { timeout: 20_000 },
    );
    optionCount = await page.locator('#switchEvent option').count();
  }

  expect(optionCount).toBeGreaterThan(0);

  await page.waitForFunction(() => {
    const api = (window as typeof window & {
      __marcoData?: { projectData?: { ping?: () => unknown; backupAll?: () => unknown } };
    }).__marcoData?.projectData;
    return Boolean(api && typeof api.ping === 'function' && typeof api.backupAll === 'function');
  }, { timeout: 20_000 });

  await page.evaluate(async () => {
    const api = (window as typeof window & {
      __marcoData: { projectData: { backupAll: () => Promise<unknown>; ping: () => Promise<unknown> } };
    }).__marcoData.projectData;
    await api.backupAll();
    await api.ping();
  });
}
