const { test, expect } = require('@playwright/test');

function formatPhoneDigits(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  if (!digits) {
    return '';
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
  await expect(
    page.locator('[data-miniapp-rail] .ac-miniapp-card')
  ).toHaveCount(2, { timeout: 20000 });
}

async function openSessionOverlay(page) {
  const stage = page.locator('#painel-stage');
  const accessButton = page.locator('[data-panel-access]');
  const overlay = page.locator('[data-panel-overlay][data-overlay-id="session"]');
  const overlayTrigger = page.locator('[data-overlay-trigger="session"]');

  if (await stage.isHidden()) {
    await accessButton.click();
    await expect(accessButton).toHaveAttribute('aria-expanded', 'true');
    await expect(stage).toBeVisible({ timeout: 15000 });
  }

  await expect(overlayTrigger).toBeVisible({ timeout: 15000 });

  if (await overlay.getAttribute('aria-hidden') !== 'false') {
    await overlayTrigger.click();
  }

  await expect(overlay).toHaveAttribute('aria-hidden', 'false');
  return overlay;
}

async function ensureLoginForm(page) {
  const overlay = await openSessionOverlay(page);
  const form = overlay.locator('[data-login-form]');
  await expect(form).toBeVisible();
  return form;
}

async function registerUser(page, { nome, email, telefone = '', senha = 'SenhaForte123' }) {
  const form = await ensureLoginForm(page);

  await form.locator('input[name="nome"]').fill(nome);
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="telefone"]').fill(telefone);
  if (telefone) {
    await expect(form.locator('input[name="telefone"]').first()).toHaveValue(
      formatPhoneDigits(telefone),
      { timeout: 2000 }
    );
  }
  await form.locator('input[name="senha"]').fill(senha);

  await form.locator('[data-action="login-save"]').click();
  await expect(page.locator('[data-login-feedback]')).toHaveText(
    'Cadastro atualizado com sucesso.'
  );
}

async function logoutPreserve(page) {
  await openSessionOverlay(page);
  const button = page.locator('[data-action="logout-preserve"]');
  await expect(button).toBeEnabled({ timeout: 10000 });
  await button.click({ timeout: 60000 });
}

async function logoutClear(page) {
  await openSessionOverlay(page);
  const button = page.locator('[data-action="logout-clear"]');
  await expect(button).toBeEnabled({ timeout: 10000 });
  await button.click({ timeout: 60000 });
}

test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));
});

test('cadastro atualiza painel e botão do cabeçalho', async ({ page }) => {
  await resetApp(page);

  const stage = page.locator('#painel-stage');
  const stageEmpty = page.locator('[data-stage-empty]');
  const panelAccess = page.locator('[data-panel-access]');

  await expect(stage).toBeHidden();
  await expect(stageEmpty).toBeVisible();
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'false');

  await registerUser(page, {
    nome: 'Maria Fernanda',
    email: 'maria@example.com',
    telefone: '11999990000',
  });

  await expect(stage).toBeVisible();
  await expect(stageEmpty).toBeHidden();
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');
  await expect(panelAccess).toHaveAttribute('aria-label', 'Fechar painel do usuário');
  await expect(page.locator('[data-login-user]')).toHaveText('Maria Fernanda');
  await expect(page.locator('[data-login-account]')).toHaveText('maria');
  await expect(page.locator('[data-login-last]')).not.toHaveText('—');
  const headerStatusLabel = page.locator('[data-panel-status-label]').first();
  await expect(headerStatusLabel).toHaveText('Conectado');
  await expect(page.locator('[data-panel-login-count]')).toHaveText('1');
  await expect(page.locator('[data-panel-last-login]')).not.toHaveText('—');
  await expect(page).toHaveTitle('Projeto Marco — Maria');

  await page.reload({ waitUntil: 'load' });
  await page.waitForLoadState('load');
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');
  await expect(stage).toBeVisible();
});

test('botão do cabeçalho controla o painel sem acionar camadas extras', async ({
  page,
}) => {
  await resetApp(page);
  await registerUser(page, {
    nome: 'Carlos Souza',
    email: 'carlos@example.com',
  });

  const stage = page.locator('#painel-stage');
  const stageEmpty = page.locator('[data-stage-empty]');
  const panelAccess = page.locator('[data-panel-access]');
  const stageClose = page.locator('[data-stage-close]');

  await expect(stage).toBeVisible();
  await expect(stageEmpty).toBeHidden();
  await expect(stage.locator('[data-overlay-open="login"]')).toHaveCount(0);

  await panelAccess.click();
  await expect(stage).toBeHidden();
  await expect(stageEmpty).toBeVisible();
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'false');

  await panelAccess.click();
  await expect(stage).toBeVisible();
  await expect(stageEmpty).toBeHidden();
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');
  await expect(stage.locator('[data-overlay-open="login"]')).toHaveCount(0);

  await stageClose.click();
  await expect(stage).toBeHidden();
  await expect(stageEmpty).toBeVisible();
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'false');

  await panelAccess.click();
  await expect(stage).toBeVisible();
  await expect(stageEmpty).toBeHidden();
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');
});

test('sessão encerrada mantém painel sob controle do cabeçalho', async ({
  page,
}) => {
  await resetApp(page);
  await registerUser(page, {
    nome: 'Joana Prado',
    email: 'joana@example.com',
  });

  await logoutPreserve(page);

  const stage = page.locator('#painel-stage');
  const stageEmpty = page.locator('[data-stage-empty]');
  const panelAccess = page.locator('[data-panel-access]');

  await expect(stage).toBeHidden();
  await expect(stageEmpty).toBeVisible();
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'false');
  const headerStatusLabel = page.locator('[data-panel-status-label]').first();
  await expect(headerStatusLabel).toHaveText('Desconectado');
  const dirtyStatus = page.locator('[data-footer-dirty-status]');
  await expect(dirtyStatus).toHaveAttribute('aria-disabled', 'true');
  await expect(dirtyStatus.locator('[data-footer-dirty-label]')).toHaveText(
    'Indisponível offline'
  );
  await expect(dirtyStatus.locator('[data-footer-dirty-dot]')).toHaveClass(/ac-dot--idle/);

  await panelAccess.click();
  await expect(stage).toBeVisible();
  await expect(stageEmpty).toBeHidden();
  await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');
  await expect(stage.locator('[data-overlay-open="login"]')).toHaveCount(0);
});

test('histórico registra login e logoff com preservação e limpeza de dados', async ({
  page,
}) => {
  await resetApp(page);
  await registerUser(page, {
    nome: 'Ana Paula',
    email: 'ana@example.com',
  });

  const stage = page.locator('#painel-stage');
  const logRows = page.locator('[data-login-log-body] tr');
  const tableWrap = page.locator('[data-login-log-table]');
  const feedback = page.locator('[data-login-feedback]');

  await expect(logRows).toHaveCount(1);
  await expect(logRows.first().locator('td').first()).toHaveText('Login realizado');
  await expect(page.locator('[data-action="logout-preserve"]')).toBeEnabled();
  await expect(page.locator('[data-action="logout-clear"]')).toBeEnabled();

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await logoutPreserve(page);

    await expect(stage).toBeHidden();
    await expect(page.locator('[data-stage-empty]')).toBeVisible();
    await expect(page.locator('[data-stage-empty-message]')).toHaveText(
      'Sessão encerrada. Acesse novamente para visualizar o painel.'
    );
    await expect(page.locator('[data-stage-empty] button')).toHaveCount(0);

    await expect(logRows.first().locator('td').first()).toHaveText(
      'Logoff (dados mantidos)'
    );
    await expect(logRows).toHaveCount(2 * cycle + 2);
    await expect(page.locator('[data-action="logout-preserve"]')).toBeDisabled();
    await expect(page.locator('[data-action="logout-clear"]')).toBeEnabled();

    const form = await ensureLoginForm(page);
    await form.locator('[data-action="login-save"]').click();
    await expect(feedback).toHaveText('Cadastro atualizado com sucesso.');

    await expect(stage).toBeVisible();
    await expect(logRows.first().locator('td').first()).toHaveText('Login realizado');
    await expect(logRows).toHaveCount(2 * cycle + 3);
    await expect(page.locator('[data-action="logout-preserve"]')).toBeEnabled();
  }

  await expect(logRows).toHaveCount(7);
  await expect(tableWrap).toBeVisible();
  const hasScroll = await tableWrap.evaluate(
    (element) => element.scrollHeight > element.clientHeight
  );
  expect(hasScroll).toBeTruthy();

  await logoutClear(page);

  await expect(page.locator('[data-login-user]')).toHaveText('Não configurado');
  await expect(page.locator('[data-panel-access]')).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  await expect(logRows).toHaveCount(0);
  await expect(
    page.locator('[data-stage-empty] [data-login-log-empty]')
  ).toBeVisible();
  await expect(page.locator('[data-action="logout-clear"]')).toBeDisabled();
  await expect(page.locator('[data-stage-empty-message]')).toHaveText(
    'Nenhum usuário cadastrado. Abra o painel pelo cabeçalho para iniciar o cadastro.'
  );
  await expect(page.locator('[data-stage-empty] button')).toHaveCount(0);
});
