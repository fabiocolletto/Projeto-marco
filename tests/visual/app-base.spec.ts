import type { Page, TestInfo } from '@playwright/test';

import { expect, test, type WeddingFixture } from '../fixtures/marco.js';
import { registerPageConsole } from '../fixtures/page.js';
import {
  REQUIRED_SELECTORS,
  VIEWPORT_MATRIX,
  ensureProjectBootstrap,
} from '../fixtures/project.js';
import manifestConfig from '../../apps/web/src/lib/appHost/manifest.config.json';

const EXPECTED_VERTICALS = manifestConfig.length;

async function captureAndAttach(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const buffer = await page.screenshot({ fullPage: true });
  expect(buffer.length).toBeGreaterThan(0);
  await testInfo.attach(name, {
    body: buffer,
    contentType: 'image/png',
  });
}

async function runEventosScenario(page: Page, wedding: WeddingFixture, testInfo: TestInfo): Promise<void> {
  await testInfo.step('Garantir bootstrap da vertical de eventos', async () => {
    await ensureProjectBootstrap(page);
  });

  for (const selector of REQUIRED_SELECTORS) {
    await testInfo.step(`Elemento obrigatório disponível: ${selector}`, async () => {
      await expect(page.locator(selector)).toBeVisible();
    });
  }

  const kpiCount = await page.locator('#cardIndicadores .mini.kpi').count();
  expect(kpiCount).toBeGreaterThanOrEqual(3);

  await captureAndAttach(page, testInfo, 'eventos-ready.png');

  await testInfo.step('Validar cabeçalhos com fixture de casamento', async () => {
    await Promise.all([
      expect(page.locator('#evTitle')).toHaveText(wedding.evento.nome),
      expect(page.locator('#switchEvent')).toContainText(wedding.evento.nome),
      expect(page.locator('#badgeEvento')).toContainText(wedding.evento.nome),
      expect(page.locator('#badgeEvento')).toContainText(wedding.evento.tipo),
      expect(page.locator('#badgeEvento')).toContainText(wedding.evento.local),
      expect(page.locator('#badgeAnfitriao')).toContainText(wedding.evento.anfitriao.nome),
      expect(page.locator('#badgeCerimonial')).toContainText(wedding.cerimonialista.nomeCompleto),
    ]);
  });

  const editButtons = await page.$$('[data-open]');
  const visited = new Set<string>();
  for (const handle of editButtons) {
    const target = await handle.getAttribute('data-open');
    if (!target || visited.has(target)) continue;
    visited.add(target);
    await handle.click();
    const panel = page.locator(target);
    await expect(panel).toHaveJSProperty('open', true);
    await expect(panel.locator('.details-wrap')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveJSProperty('open', false);
  }

  await page.locator('[data-open="#secEvento"]').click();
  const nameInput = page.locator('input[data-bind="evento.nome"]');
  await expect(nameInput).toBeVisible();
  await nameInput.click();

  const editingValue = `${wedding.evento.nome} (edição Playwright)`;
  await nameInput.fill(editingValue);
  await expect(page.locator('#chipDirty')).toBeVisible();
  await captureAndAttach(page, testInfo, 'eventos-editing.png');

  await page.locator('[data-open="#secConvidados"]').click();
  const guestsPanel = page.locator('#secConvidados');
  await expect(guestsPanel).toHaveJSProperty('open', true);
  const guestApp = page.locator('#convidados_host .ac-convidados');
  await expect(guestApp).toBeVisible();
  const guestRows = page.locator('#convidados_host .row');
  const initialGuests = await guestRows.count();
  await page.locator('#convidados_host #btnAdd').click();
  await expect(guestRows).toHaveCount(initialGuests + 1);
  await page.keyboard.press('Escape');
  await expect(guestsPanel).toHaveJSProperty('open', false);

  await page.locator('[data-open="#secEvento"]').click();
  await expect(page.locator('#secEvento')).toHaveAttribute('open', '');
  await nameInput.fill(wedding.evento.nome);
  await page.waitForTimeout(800);
  await expect(page.locator('#chipReady')).toBeVisible({ timeout: 10_000 });

  await page.evaluate(() => {
    const ready = document.getElementById('chipReady');
    const saving = document.getElementById('chipSaving');
    if (!saving) throw new Error('Indicador de salvamento não encontrado');
    if (ready) ready.style.display = 'none';
    saving.style.display = 'inline-block';
  });

  await expect(page.locator('#chipSaving')).toBeVisible({ timeout: 5_000 });
  await captureAndAttach(page, testInfo, 'eventos-saving.png');

  await page.evaluate(() => {
    const ready = document.getElementById('chipReady');
    const saving = document.getElementById('chipSaving');
    if (saving) saving.style.display = 'none';
    if (ready) ready.style.display = 'inline-block';
  });

  await expect(page.locator('#chipReady')).toBeVisible({ timeout: 10_000 });

  for (const viewport of VIEWPORT_MATRIX) {
    await testInfo.step(`Responsividade ${viewport.name}`, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      if (viewport.isMobile) {
        await page.emulateMedia({ media: 'screen' });
      }
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(16);
      await expect(page.locator('#chipReady')).toBeVisible({ timeout: 10_000 });
      await captureAndAttach(page, testInfo, `eventos-ready-${viewport.name}.png`);
    });
  }

  await page.setViewportSize({ width: VIEWPORT_MATRIX[0].width, height: VIEWPORT_MATRIX[0].height });
  await page.waitForTimeout(300);

  const storeHealth = await page.evaluate(async () => {
    const api = (window as typeof window & { __marcoData?: { projectData?: any } }).__marcoData?.projectData;
    if (!api) {
      throw new Error('projectData não disponível');
    }
    const [backupResult, pingResult, metasMaybe] = await Promise.all([
      api.backupAll?.(),
      api.ping?.(),
      Promise.resolve(api.listProjects?.()),
    ]);
    return { backupResult, pingResult, metasMaybe };
  });

  expect(storeHealth).toBeTruthy();
  expect(storeHealth.pingResult).toBeTruthy();
  const metas = Array.isArray(storeHealth.metasMaybe) ? storeHealth.metasMaybe : [];
  expect(metas.some((meta: { nome?: string }) => meta?.nome === wedding.evento.nome)).toBe(true);
}

test.describe('App host — experiência base', () => {
  test.beforeEach(async ({ page }) => {
    registerPageConsole(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('.app-host__nav button')).toHaveCount(EXPECTED_VERTICALS);
  });

  test('permite alternar verticais e executar fluxo da vertical de eventos', async ({ page, wedding }, testInfo) => {
    await expect(page.locator('.app-host__header h1')).toHaveText('Gestão de eventos');
    await expect(page.locator('.app-placeholder__title')).toHaveText('Visão geral');

    await test.step('Alternar para a vertical de sincronização', async () => {
      await page.getByRole('button', { name: /Sincronização/ }).click();
      await expect(page).toHaveURL(/app=sync/);
      await expect(page.locator('.app-host__nav button.active')).toContainText('Sincronização');
      await expect(page.locator('.app-placeholder__title')).toHaveText('Sincronização');
      await expect(page.locator('.app-placeholder__description')).toContainText('central de sincronização');
    });

    await test.step('Executar fluxo completo da vertical de eventos', async () => {
      await page.getByRole('button', { name: /Evento/ }).click();
      await expect(page).toHaveURL(/app=evento/);
      await expect(page.locator('.app-host__nav button.active')).toContainText('Evento');
      await expect(page.locator('#switchEvent')).toBeVisible();
      await runEventosScenario(page, wedding, testInfo);
    });
  });
});
