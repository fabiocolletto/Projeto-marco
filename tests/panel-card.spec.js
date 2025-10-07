const { test, expect } = require('@playwright/test');

async function resetApp(page) {
  await page.goto('/index.html');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

async function openLoginOverlay(page) {
  const overlay = page.locator('[data-overlay="login"]');
  const trigger = page.locator('[data-overlay-open="login"]:visible').first();
  await trigger.click();
  await expect(overlay).toHaveAttribute('aria-hidden', 'false');
  return overlay;
}

async function registerUser(page, { nome, email, telefone = '' }) {
  const overlay = await openLoginOverlay(page);

  await overlay.locator('input[name="nome"]').fill(nome);
  await overlay.locator('input[name="email"]').fill(email);
  await overlay.locator('input[name="telefone"]').fill(telefone);

  await overlay.locator('[data-action="login-save"]').click();
  await expect(overlay.locator('[data-login-feedback]')).toHaveText(
    'Cadastro atualizado com sucesso.'
  );

  const closeButton = overlay.locator('[data-overlay-close]').first();
  await closeButton.click();
  await expect(overlay).toHaveAttribute('aria-hidden', 'true');
}

test('cadastro atualiza etiqueta e painel', async ({ page }) => {
  await resetApp(page);

  const stage = page.locator('#painel-stage');
  const stageEmpty = page.locator('[data-stage-empty]');
  const overlay = page.locator('[data-overlay="login"]');

  await expect(stage).toBeHidden();
  await expect(stageEmpty).toBeVisible();
  await expect(overlay).toHaveAttribute('aria-hidden', 'true');

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
  await expect(page).toHaveTitle('Projeto Marco — Maria');

  await page.reload();
  await expect(page.locator('[data-user-name]')).toHaveText('Maria');
  await expect(stage).toBeVisible();
});

test('etiqueta abre o painel e o botão ⋯ alterna o estado', async ({ page }) => {
  await resetApp(page);
  await registerUser(page, {
    nome: 'Carlos Souza',
    email: 'carlos@example.com',
  });

  const stage = page.locator('#painel-stage');
  const cardTitle = page.locator('[data-miniapp="painel"] .ac-miniapp-card__title');
  const toggleButton = page.locator('[data-miniapp="painel"] [data-toggle-panel]');

  await expect(stage).toBeVisible();

  await toggleButton.click();
  await expect(stage).toBeHidden();

  await cardTitle.click();
  await expect(stage).toBeVisible();

  await cardTitle.click();
  await expect(stage).toBeVisible();

  await toggleButton.click();
  await expect(stage).toBeHidden();

  await toggleButton.click();
  await expect(stage).toBeVisible();
});

test('histórico registra login e logoff com preservação e limpeza de dados', async ({
  page,
}) => {
  await resetApp(page);
  await registerUser(page, {
    nome: 'Ana Paula',
    email: 'ana@example.com',
  });

  const overlay = page.locator('[data-overlay="login"]');
  const logRows = page.locator('[data-login-log-body] tr');
  const tableWrap = page.locator('[data-login-log-table]');

  await expect(logRows).toHaveCount(1);
  await expect(logRows.first().locator('td').first()).toHaveText('Login realizado');
  await expect(page.locator('[data-action="logout-preserve"]')).toBeEnabled();
  await expect(page.locator('[data-action="logout-clear"]')).toBeEnabled();

  for (let cycle = 0; cycle < 3; cycle += 1) {
    const overlayLogout = await openLoginOverlay(page);
    await overlayLogout.locator('[data-action="logout-preserve"]').click();
    await expect(overlay).toHaveAttribute('aria-hidden', 'true');

    await expect(page.locator('#painel-stage')).toBeHidden();
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

    const overlayLogin = await openLoginOverlay(page);
    await overlayLogin.locator('[data-action="login-save"]').click();
    await expect(
      overlayLogin.locator('[data-login-feedback]')
    ).toHaveText('Cadastro atualizado com sucesso.');
    await overlayLogin.locator('[data-overlay-close]').first().click();
    await expect(overlay).toHaveAttribute('aria-hidden', 'true');

    await expect(page.locator('#painel-stage')).toBeVisible();
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

  const overlayClear = await openLoginOverlay(page);
  await overlayClear.locator('[data-action="logout-clear"]').click();
  await expect(overlay).toHaveAttribute('aria-hidden', 'true');

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
