const { test, expect } = require('@playwright/test');

async function resetApp(page) {
  await page.goto('/index.html');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

async function ensureLoginForm(page) {
  const stage = page.locator('#painel-stage');
  const stageEmptyAction = page.locator('[data-stage-empty-action]');

  if (await stage.isHidden()) {
    await stageEmptyAction.click();
  }

  await expect(stage).toBeVisible();
  const form = stage.locator('[data-login-form]');
  await expect(form).toBeVisible();
  return form;
}

async function registerUser(page, { nome, email, telefone = '' }) {
  const form = await ensureLoginForm(page);

  await form.locator('input[name="nome"]').fill(nome);
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="telefone"]').fill(telefone);

  await form.locator('[data-action="login-save"]').click();
  await expect(page.locator('[data-login-feedback]')).toHaveText(
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

test('cadastro atualiza etiqueta e painel', async ({ page }) => {
  await resetApp(page);

  const stage = page.locator('#painel-stage');
  const stageEmpty = page.locator('[data-stage-empty]');

  await expect(stage).toBeHidden();
  await expect(stageEmpty).toBeVisible();

  await registerUser(page, {
    nome: 'Maria Fernanda',
    email: 'maria@example.com',
    telefone: '11999990000',
  });

  await expect(stage).toBeVisible();
  await expect(stageEmpty).toBeHidden();
  await expect(page.locator('[data-toggle-panel]')).toHaveAttribute(
    'aria-expanded',
    'true'
  );

  await expect(page.locator('[data-user-name]')).toHaveText('Maria');
  await expect(page.locator('[data-login-user]')).toHaveText('Maria Fernanda');
  await expect(page.locator('[data-login-account]')).toHaveText('maria');
  await expect(page.locator('[data-login-last]')).not.toHaveText('—');
  await expect(page.locator('[data-meta-value="login"]')).not.toHaveText('—');
  await expect(page.locator('[data-panel-status-label]')).toHaveText('Conectado');
  await expect(page.locator('[data-panel-login-count]')).toHaveText('1');
  await expect(page.locator('[data-panel-last-login]')).not.toHaveText('—');
  await expect(page).toHaveTitle('Projeto Marco — Maria');

  await page.reload();
  await expect(page.locator('[data-user-name]')).toHaveText('Maria');
  await expect(stage).toBeVisible();
});

test('etiqueta controla o painel sem acionar camadas extras', async ({ page }) => {
  await resetApp(page);
  await registerUser(page, {
    nome: 'Carlos Souza',
    email: 'carlos@example.com',
  });

  const stage = page.locator('#painel-stage');
  const stageEmpty = page.locator('[data-stage-empty]');
  const cardTitle = page.locator('[data-miniapp="painel"] .ac-miniapp-card__title');
  const toggleButton = page.locator('[data-miniapp="painel"] [data-toggle-panel]');

  await expect(stage).toBeVisible();
  await expect(stageEmpty).toBeHidden();
  await expect(stage.locator('[data-overlay-open="login"]')).toHaveCount(0);

  await toggleButton.click();
  await expect(stage).toBeHidden();
  await expect(stageEmpty).toBeVisible();
  await expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

  await cardTitle.click();
  await expect(stage).toBeVisible();
  await expect(stageEmpty).toBeHidden();
  await expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  await expect(stage.locator('[data-overlay-open="login"]')).toHaveCount(0);

  await cardTitle.click();
  await expect(stage).toBeVisible();
  await expect(stageEmpty).toBeHidden();

  await toggleButton.click();
  await expect(stage).toBeHidden();
  await expect(stageEmpty).toBeVisible();
  await expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

  await toggleButton.click();
  await expect(stage).toBeVisible();
  await expect(stageEmpty).toBeHidden();
  await expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
});

test('sessão encerrada mantém painel sob controle da etiqueta', async ({ page }) => {
  await resetApp(page);
  await registerUser(page, {
    nome: 'Joana Prado',
    email: 'joana@example.com',
  });

  await logoutPreserve(page);

  const card = page.locator('[data-miniapp="painel"]');
  const stage = page.locator('#painel-stage');
  const stageEmpty = page.locator('[data-stage-empty]');
  const toggleButton = page.locator('[data-miniapp="painel"] [data-toggle-panel]');

  await expect(stage).toBeHidden();
  await expect(stageEmpty).toBeVisible();
  await expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-panel-status-label]')).toHaveText('Desconectado');

  await card.click();
  await expect(stage).toBeVisible();
  await expect(stageEmpty).toBeHidden();
  await expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
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
    await expect(page.locator('[data-stage-empty-action]')).toHaveText('Acessar novamente');

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

  await expect(page.locator('[data-user-name]')).toHaveText('Não configurado');
  await expect(logRows).toHaveCount(0);
  await expect(
    page.locator('[data-stage-empty] [data-login-log-empty]')
  ).toBeVisible();
  await expect(page.locator('[data-action="logout-clear"]')).toBeDisabled();
  await expect(page.locator('[data-stage-empty-message]')).toHaveText(
    'Nenhum usuário cadastrado. Inicie o cadastro para ativar o painel.'
  );
  await expect(page.locator('[data-stage-empty-action]')).toHaveText('Começar cadastro');
});
