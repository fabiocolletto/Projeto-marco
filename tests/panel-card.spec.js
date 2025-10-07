const { test, expect } = require('@playwright/test');

function formatPhoneDigits(value) {
  const digits = String(value || '').replace(/\D+/g, '').slice(0, 11);
  if (!digits) {
    return '';
  }
  if (digits.length <= 2) {
    return `(${digits}`;
  }
  const area = digits.slice(0, 2);
  if (digits.length <= 6) {
    return `(${area}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    const middle = digits.slice(2, digits.length - 4);
    const last = digits.slice(-4);
    return `(${area}) ${middle}-${last}`;
  }
  const middle = digits.slice(2, 7);
  const last = digits.slice(7, 11);
  return `(${area}) ${middle}-${last}`;
}

async function resetApp(page) {
  await page.goto('/appbase/index.html', { waitUntil: 'load' });
  await page.waitForLoadState('load');

  await page.evaluate(() => window.localStorage.clear());

  await page.reload({ waitUntil: 'load' });
  await page.waitForLoadState('load');
}

async function showLoginOverlay(page) {
  const overlay = page.locator('[data-login-overlay]');
  const hiddenState = await overlay.getAttribute('aria-hidden');
  if (hiddenState !== 'false') {
    const trigger = page.locator('[data-login-trigger]');
    await trigger.click();
    await expect(overlay).toHaveAttribute('aria-hidden', 'false');
  }
  return overlay;
}

async function selectOverlayUser(page, { name, email }) {
  const overlay = await showLoginOverlay(page);
  let locator = overlay.locator('[data-login-user-list] button');
  if (name) {
    locator = locator.filter({ hasText: name });
  }
  if (email) {
    locator = locator.filter({ hasText: email });
  }
  const tile = locator.first();
  await expect(tile).toBeVisible();
  await tile.click();
  return overlay;
}

async function enterPinOnPad(page, target, pin) {
  const pad = page.locator(`[data-pin-pad="${target}"]`);
  await expect(pad).toBeVisible();
  const clearButton = pad.locator('[data-pin-action="clear"]');
  if ((await clearButton.count()) > 0) {
    await clearButton.click();
  }
  for (const digit of String(pin || '')) {
    await pad.locator(`[data-pin-digit="${digit}"]`).click();
  }
  return pad;
}

async function submitOverlayPin(page, pin) {
  const pad = await enterPinOnPad(page, 'overlay', pin);
  const confirmButton = pad.locator('[data-pin-confirm]');
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
}

async function createUser(page, { nome, email, telefone, pin }) {
  const overlay = page.locator('[data-login-overlay]');
  if ((await overlay.getAttribute('aria-hidden')) === 'false') {
    const createButton = page.locator('[data-login-create]');
    await createButton.click();
  } else {
    const stageLogin = page.locator('[data-stage-login]');
    const stage = page.locator('#painel-stage');
    if (await stage.isHidden()) {
      await stageLogin.click();
    }
  }

  const stage = page.locator('#painel-stage');
  await expect(stage).toBeVisible();
  const form = stage.locator('[data-login-form]');
  await expect(form).toBeVisible();

  await form.locator('input[name="nome"]').fill(nome);
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="telefone"]').fill(telefone);
  await expect(form.locator('input[name="telefone"]')).toHaveValue(
    formatPhoneDigits(telefone)
  );
  await enterPinOnPad(page, 'form', pin);

  await form.locator('[data-action="login-save"]').click();
  await expect(page.locator('[data-login-form] [data-login-feedback]')).toHaveText(
    'Cadastro atualizado com sucesso.'
  );
}

async function logoutPreserve(page) {
  const button = page.locator('[data-action="logout-preserve"]');
  await expect(button).toBeEnabled({ timeout: 10000 });
  await button.click({ timeout: 60000 });
}

async function logoutClear(page) {
  const button = page.locator('[data-action="logout-clear"]');
  await expect(button).toBeEnabled({ timeout: 10000 });
  await button.click({ timeout: 60000 });
}

test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));
});

test('primeiro cadastro via PIN habilita painel e indicadores', async ({ page }) => {
  await resetApp(page);

  const stage = page.locator('#painel-stage');
  const stageEmpty = page.locator('[data-stage-empty]');
  const panelAccess = page.locator('[data-panel-access]');

  await expect(stage).toBeHidden();
  await expect(stageEmpty).toBeVisible();
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'false');

  await createUser(page, {
    nome: 'Maria Fernanda',
    email: 'maria@example.com',
    telefone: '11999990000',
    pin: '1234',
  });

  await expect(stage).toBeVisible();
  await expect(stageEmpty).toBeHidden();
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');
  await expect(panelAccess).toHaveAttribute('aria-label', 'Fechar painel do usuário');
  await expect(page.locator('[data-login-user]')).toHaveText('Maria Fernanda');
  await expect(page.locator('[data-login-account]')).toHaveText('maria');
  await expect(page.locator('[data-login-last]')).not.toHaveText('—');
  await expect(page.locator('[data-panel-status-label]')).toHaveText('Conectado');
  await expect(page.locator('[data-panel-login-count]')).toHaveText('1');
  await expect(page.locator('[data-panel-last-login]')).not.toHaveText('—');
  await expect(page).toHaveTitle('Projeto Marco — Maria');

  await page.reload({ waitUntil: 'load' });
  await page.waitForLoadState('load');

  await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');
  await expect(stage).toBeVisible();
  await expect(page.locator('[data-login-user]')).toHaveText('Maria Fernanda');
});

test('overlay de login exige PIN correto para retomar sessão', async ({ page }) => {
  await resetApp(page);

  await createUser(page, {
    nome: 'Joana Prado',
    email: 'joana@example.com',
    telefone: '21999990000',
    pin: '9876',
  });

  await logoutPreserve(page);

  const stage = page.locator('#painel-stage');
  const stageEmpty = page.locator('[data-stage-empty]');
  const panelAccess = page.locator('[data-panel-access]');
  await expect(stage).toBeHidden();
  await expect(stageEmpty).toBeVisible();
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-panel-status-label]')).toHaveText('Desconectado');
  const dirtyStatus = page.locator('[data-footer-dirty-status]');
  await expect(dirtyStatus).toHaveAttribute('aria-disabled', 'true');
  await expect(dirtyStatus.locator('[data-footer-dirty-label]')).toHaveText('Indisponível offline');

  const overlay = await showLoginOverlay(page);
  await expect(overlay.locator('[data-login-user-list] button')).toHaveCount(1);
  await selectOverlayUser(page, { name: 'Joana Prado', email: 'joana@example.com' });
  await submitOverlayPin(page, '0000');
  await expect(overlay).toHaveAttribute('aria-hidden', 'false');
  await expect(overlay.locator('[data-login-feedback]')).toHaveText('PIN incorreto. Tente novamente.');

  await selectOverlayUser(page, { name: 'Joana Prado', email: 'joana@example.com' });
  await submitOverlayPin(page, '9876');
  await expect(overlay).toHaveAttribute('aria-hidden', 'true');
  await expect(stage).toBeVisible();
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-panel-status-label]')).toHaveText('Conectado');
});

test('atualização do cadastro exige PIN atual', async ({ page }) => {
  await resetApp(page);

  await createUser(page, {
    nome: 'Carlos Souza',
    email: 'carlos@example.com',
    telefone: '31999990000',
    pin: '1357',
  });

  const form = page.locator('[data-login-form]');
  await expect(form).toBeVisible();

  await form.locator('input[name="telefone"]').fill('11987654321');
  await expect(form.locator('input[name="telefone"]')).toHaveValue(
    formatPhoneDigits('11987654321')
  );

  await enterPinOnPad(page, 'form', '0000');
  await form.locator('[data-action="login-save"]').click();
  await expect(page.locator('[data-login-form] [data-login-feedback]')).toHaveText(
    'O PIN informado não corresponde ao PIN atual.'
  );

  await enterPinOnPad(page, 'form', '1357');
  await form.locator('[data-action="login-save"]').click();
  await expect(page.locator('[data-login-form] [data-login-feedback]')).toHaveText(
    'Cadastro atualizado com sucesso.'
  );
  await expect(form.locator('input[name="telefone"]')).toHaveValue(
    formatPhoneDigits('11987654321')
  );
});

test('múltiplos usuários alternam via PIN e remoção exige confirmação', async ({ page }) => {
  await resetApp(page);

  await createUser(page, {
    nome: 'Maria Fernanda',
    email: 'maria@example.com',
    telefone: '11999990000',
    pin: '1234',
  });

  await showLoginOverlay(page);
  await createUser(page, {
    nome: 'Bruno Lima',
    email: 'bruno@example.com',
    telefone: '11911110000',
    pin: '5678',
  });
  await expect(page.locator('[data-login-user]')).toHaveText('Bruno Lima');

  await logoutPreserve(page);
  const overlay = await showLoginOverlay(page);
  await expect(overlay.locator('[data-login-user-list] button')).toHaveCount(2);
  await selectOverlayUser(page, { name: 'Maria Fernanda', email: 'maria@example.com' });
  await submitOverlayPin(page, '1234');
  await expect(overlay).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-login-user]')).toHaveText('Maria Fernanda');

  await logoutClear(page);
  const confirmOverlay = page.locator('[data-confirm-overlay]');
  await expect(confirmOverlay).toHaveAttribute('aria-hidden', 'false');
  await page.locator('[data-confirm-accept]').click();
  await expect(confirmOverlay).toHaveAttribute('aria-hidden', 'true');

  const overlayAfterRemoval = await showLoginOverlay(page);
  await expect(overlayAfterRemoval.locator('[data-login-user-list] button')).toHaveCount(1);
  await selectOverlayUser(page, { name: 'Bruno Lima', email: 'bruno@example.com' });
  await submitOverlayPin(page, '5678');
  await expect(overlayAfterRemoval).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-login-user]')).toHaveText('Bruno Lima');
  await expect(page.locator('[data-panel-status-label]')).toHaveText('Conectado');
});
