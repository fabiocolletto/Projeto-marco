import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'fs/promises';
import path from 'path';
import type { TestInfo } from '@playwright/test';

type WeddingFixture = {
  evento: {
    nome: string;
    tipo: string;
    data: string;
    hora: string;
    local: string;
    endereco: {
      cep: string;
      logradouro: string;
      numero: string;
      bairro: string;
      cidade: string;
      uf: string;
      complemento: string;
    };
    anfitriao: {
      nome: string;
      telefone: string;
      redeSocial: string;
      endCorrespondencia: {
        cep: string;
        logradouro: string;
        numero: string;
        bairro: string;
        cidade: string;
        uf: string;
        complemento: string;
      };
      endEntrega: {
        cep: string;
        logradouro: string;
        numero: string;
        bairro: string;
        cidade: string;
        uf: string;
        complemento: string;
      };
    };
  };
  cerimonialista: {
    nomeCompleto: string;
    telefone: string;
    redeSocial: string;
  };
};

async function ensureBootstrap(page: Page): Promise<void> {
  await page.waitForSelector('#chipReady', { state: 'visible', timeout: 20000 });
  let optionCount = await page.locator('#switchEvent option').count();
  if (optionCount === 0) {
    await page.click('#btnNew');
    await expect(page.locator('#chipReady')).toBeVisible({ timeout: 20000 });
    await page.waitForFunction(
      () => document.querySelectorAll('#switchEvent option').length > 0,
      { timeout: 20000 }
    );
    optionCount = await page.locator('#switchEvent option').count();
  }
  expect(optionCount).toBeGreaterThan(0);
  await page.waitForFunction(() => {
    const api = (window as typeof window & { __marcoData?: { projectData?: { ping?: () => unknown; backupAll?: () => unknown } } })
      .__marcoData?.projectData;
    return Boolean(api && typeof api.ping === 'function' && typeof api.backupAll === 'function');
  }, { timeout: 20000 });
  await page.evaluate(async () => {
    const api = (window as typeof window & {
      __marcoData: { projectData: { backupAll: () => Promise<unknown>; ping: () => Promise<unknown> } };
    }).__marcoData.projectData;
    await api.backupAll();
    await api.ping();
  });
}

test.describe('Eventos — fluxo visual', () => {
  const fixturePath = path.resolve(__dirname, 'fixtures', 'casamento-evento.json');
  test('captura estados críticos e valida interações', async ({ page }, testInfo: TestInfo) => {
    page.on('console', (msg) => {
      console.log(`[console] ${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      console.error(`[pageerror] ${err.message}`);
    });
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.locator('#switchEvent')).toBeVisible();
    await ensureBootstrap(page);

    const requiredSelectors = [
      '#cardResumo',
      '#cardIndicadores',
      '#badgeEvento',
      '#badgeAnfitriao',
      '#badgeCerimonial',
      '#kpi_tasks',
      '#kpi_for',
      '#kpi_guests',
    ];

    for (const selector of requiredSelectors) {
      await test.step(`Elemento obrigatório disponível: ${selector}`, async () => {
        await expect(page.locator(selector)).toBeVisible();
      });
    }

    const kpiCount = await page.locator('#cardIndicadores .mini.kpi').count();
    expect(kpiCount).toBeGreaterThanOrEqual(3);

    const readyBuffer = await page.screenshot({ fullPage: true });
    expect(readyBuffer.length).toBeGreaterThan(0);
    await testInfo.attach('eventos-ready.png', {
      body: readyBuffer,
      contentType: 'image/png',
    });

    const fixtureRaw = await readFile(fixturePath, 'utf-8');
    const weddingFixture = JSON.parse(fixtureRaw) as WeddingFixture;

    const openSection = async (selector: string) => {
      const trigger = page.locator(`button[data-open="${selector}"]`);
      await trigger.click();
      await expect(page.locator(selector)).toHaveAttribute('open', '');
    };

    await test.step('Cadastro completo de casamento', async () => {
      await page.click('#btnNew');
      await expect(page.locator('#chipReady')).toBeVisible({ timeout: 20000 });

      await openSection('#secEvento');
      await page.fill('input[data-bind="evento.nome"]', weddingFixture.evento.nome);
      await page.selectOption('select[data-bind="evento.tipo"]', { label: weddingFixture.evento.tipo });
      await page.fill('#ev-datetime', `${weddingFixture.evento.data}T${weddingFixture.evento.hora}`);
      await page.fill('input[data-bind="evento.local"]', weddingFixture.evento.local);
      await page.fill('input[data-bind="evento.endereco.cep"]', weddingFixture.evento.endereco.cep);
      await page.fill('input[data-bind="evento.endereco.logradouro"]', weddingFixture.evento.endereco.logradouro);
      await page.fill('input[data-bind="evento.endereco.numero"]', weddingFixture.evento.endereco.numero);
      await page.fill('input[data-bind="evento.endereco.bairro"]', weddingFixture.evento.endereco.bairro);
      await page.fill('input[data-bind="evento.endereco.cidade"]', weddingFixture.evento.endereco.cidade);
      await page.fill('input[data-bind="evento.endereco.uf"]', weddingFixture.evento.endereco.uf);
      await page.fill('input[data-bind="evento.endereco.complemento"]', weddingFixture.evento.endereco.complemento);

      await openSection('#secAnfitriao');
      const anfitriao = weddingFixture.evento.anfitriao;
      await page.fill('input[data-bind="evento.anfitriao.nome"]', anfitriao.nome);
      await page.fill('input[data-bind="evento.anfitriao.telefone"]', anfitriao.telefone);
      await page.fill('input[data-bind="evento.anfitriao.redeSocial"]', anfitriao.redeSocial);
      await page.fill('input[data-bind="evento.anfitriao.endCorrespondencia.cep"]', anfitriao.endCorrespondencia.cep);
      await page.fill('input[data-bind="evento.anfitriao.endCorrespondencia.logradouro"]', anfitriao.endCorrespondencia.logradouro);
      await page.fill('input[data-bind="evento.anfitriao.endCorrespondencia.numero"]', anfitriao.endCorrespondencia.numero);
      await page.fill('input[data-bind="evento.anfitriao.endCorrespondencia.bairro"]', anfitriao.endCorrespondencia.bairro);
      await page.fill('input[data-bind="evento.anfitriao.endCorrespondencia.cidade"]', anfitriao.endCorrespondencia.cidade);
      await page.fill('input[data-bind="evento.anfitriao.endCorrespondencia.uf"]', anfitriao.endCorrespondencia.uf);
      await page.fill('input[data-bind="evento.anfitriao.endCorrespondencia.complemento"]', anfitriao.endCorrespondencia.complemento);
      await page.fill('input[data-bind="evento.anfitriao.endEntrega.cep"]', anfitriao.endEntrega.cep);
      await page.fill('input[data-bind="evento.anfitriao.endEntrega.logradouro"]', anfitriao.endEntrega.logradouro);
      await page.fill('input[data-bind="evento.anfitriao.endEntrega.numero"]', anfitriao.endEntrega.numero);
      await page.fill('input[data-bind="evento.anfitriao.endEntrega.bairro"]', anfitriao.endEntrega.bairro);
      await page.fill('input[data-bind="evento.anfitriao.endEntrega.cidade"]', anfitriao.endEntrega.cidade);
      await page.fill('input[data-bind="evento.anfitriao.endEntrega.uf"]', anfitriao.endEntrega.uf);
      await page.fill('input[data-bind="evento.anfitriao.endEntrega.complemento"]', anfitriao.endEntrega.complemento);

      await openSection('#secCerimonial');
      await page.fill('input[data-bind="cerimonialista.nomeCompleto"]', weddingFixture.cerimonialista.nomeCompleto);
      await page.fill('input[data-bind="cerimonialista.telefone"]', weddingFixture.cerimonialista.telefone);
      await page.fill('input[data-bind="cerimonialista.redeSocial"]', weddingFixture.cerimonialista.redeSocial);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      await expect(page.locator('#chipReady')).toBeVisible({ timeout: 20000 });
    });

    const currentEventId = await page.evaluate(() => {
      const select = document.querySelector('#switchEvent') as HTMLSelectElement | null;
      return select?.value ?? '';
    });
    expect(currentEventId).toBeTruthy();

    const beforeHeaderCreate = await page.locator('#switchEvent option').count();
    await page.click('#btnNew');
    await expect(page.locator('#switchEvent option')).toHaveCount(beforeHeaderCreate + 1, { timeout: 20000 });
    const countAfterCreate = beforeHeaderCreate + 1;

    const deletePromise = new Promise<void>((resolve) => {
      page.once('dialog', (dialog) => {
        expect(dialog.type()).toBe('confirm');
        dialog.dismiss();
        resolve();
      });
    });
    await page.click('#btnDelete');
    await deletePromise;
    await expect(page.locator('#switchEvent option')).toHaveCount(countAfterCreate);

    await test.step('Reabrindo evento de casamento', async () => {
      await page.waitForSelector(`#switchEvent option[value="${currentEventId}"]`, { state: 'attached', timeout: 20000 });
      await page.selectOption('#switchEvent', currentEventId);
      await expect(page.locator('#chipReady')).toBeVisible({ timeout: 20000 });
    });

    await test.step('Badges atualizados', async () => {
      await expect(page.locator('#evTitle')).toHaveText(weddingFixture.evento.nome);
      await expect(page.locator('#switchEvent')).toContainText(weddingFixture.evento.nome);
      await expect(page.locator('#badgeEvento')).toContainText(weddingFixture.evento.nome);
      await expect(page.locator('#badgeEvento')).toContainText(weddingFixture.evento.tipo);
      await expect(page.locator('#badgeEvento')).toContainText(weddingFixture.evento.local);
      await expect(page.locator('#badgeAnfitriao')).toContainText(weddingFixture.evento.anfitriao.nome);
      await expect(page.locator('#badgeCerimonial')).toContainText(weddingFixture.cerimonialista.nomeCompleto);
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
    const editingValue = `${weddingFixture.evento.nome} (edição Playwright)`;
    await nameInput.fill(editingValue);
    await expect(page.locator('#chipDirty')).toBeVisible();
    const editingBuffer = await page.screenshot({ fullPage: true });
    expect(editingBuffer.length).toBeGreaterThan(0);
    await testInfo.attach('eventos-editing.png', {
      body: editingBuffer,
      contentType: 'image/png',
    });

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
    await nameInput.fill(weddingFixture.evento.nome);
    await page.waitForTimeout(800);
    await expect(page.locator('#chipReady')).toBeVisible({ timeout: 10000 });

    await page.evaluate(() => {
      const ready = document.getElementById('chipReady');
      const saving = document.getElementById('chipSaving');
      if (!saving) throw new Error('Indicador de salvamento não encontrado');
      if (ready) ready.style.display = 'none';
      saving.style.display = 'inline-block';
    });
    await expect(page.locator('#chipSaving')).toBeVisible({ timeout: 5000 });
    const savingBuffer = await page.screenshot({ fullPage: true });
    expect(savingBuffer.length).toBeGreaterThan(0);
    await testInfo.attach('eventos-saving.png', {
      body: savingBuffer,
      contentType: 'image/png',
    });
    await page.evaluate(() => {
      const ready = document.getElementById('chipReady');
      const saving = document.getElementById('chipSaving');
      if (saving) saving.style.display = 'none';
      if (ready) ready.style.display = 'inline-block';
    });
    await expect(page.locator('#chipReady')).toBeVisible({ timeout: 10000 });

    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 1024, height: 1366 },
      { name: 'mobile', width: 390, height: 844 },
    ] as const;

    for (const viewport of viewports) {
      await test.step(`Responsividade ${viewport.name}`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(500);
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth - doc.clientWidth;
        });
        expect(overflow).toBeLessThanOrEqual(16);
        await expect(page.locator('#chipReady')).toBeVisible({ timeout: 10000 });
        const buffer = await page.screenshot({ fullPage: true });
        expect(buffer.length).toBeGreaterThan(0);
        await testInfo.attach(`eventos-ready-${viewport.name}.png`, {
          body: buffer,
          contentType: 'image/png',
        });
      });
    }

    await page.setViewportSize({ width: viewports[0].width, height: viewports[0].height });
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
    expect(metas.some((meta: { nome?: string }) => meta?.nome === weddingFixture.evento.nome)).toBe(true);
  });
});
