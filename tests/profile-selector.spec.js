const { test, expect } = require('@playwright/test');

async function ensurePanelOpen(page) {
  const panelAccess = page.locator('[data-panel-access]');
  await expect(panelAccess).toBeVisible();
  if ((await panelAccess.getAttribute('aria-expanded')) !== 'true') {
    await panelAccess.click();
    await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');
  }
  const stage = page.locator('#painel-stage');
  await expect(stage).toBeVisible();
  return stage;
}

async function registerUser(page, { nome, email, telefone = '', senha = 'SenhaForte123' }) {
  const stage = await ensurePanelOpen(page);
  const form = stage.locator('[data-login-form]');
  await expect(form).toBeVisible();

  await form.locator('input[name="nome"]').fill(nome);
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="telefone"]').fill(telefone);
  await form.locator('input[name="senha"]').fill(senha);

  await form.locator('[data-action="login-save"]').click();
  await expect(page.locator('[data-login-feedback]')).toHaveText('Cadastro atualizado com sucesso.');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage?.clear();
    } catch (error) {
      // noop
    }
    try {
      indexedDB.deleteDatabase('marco-appbase');
    } catch (error) {
      // noop
    }
  });
});

test('exibe fluxo padrão quando não há perfis salvos', async ({ page }) => {
  await page.goto('/appbase/index.html');
  const selector = page.locator('[data-profile-selector]');
  await expect(selector).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-stage-empty]')).toBeVisible();
});

test('carrega automaticamente o único perfil salvo', async ({ page }) => {
  await page.addInitScript(() => {
    const profile = {
      id: 'joana@example.com',
      email: 'joana@example.com',
      updatedAt: '2024-05-01T12:00:00.000Z',
      state: {
        user: {
          nomeCompleto: 'Joana Teste',
          email: 'joana@example.com',
          telefone: '11988887777',
          senha: 'SenhaForte123',
        },
        lastLogin: '2024-05-01T12:00:00.000Z',
        sessionActive: true,
        history: [],
      },
    };
    window.localStorage.setItem('marco-appbase:profiles', JSON.stringify([profile]));
  });

  await page.goto('/appbase/index.html');

  const selector = page.locator('[data-profile-selector]');
  await expect(selector).toHaveAttribute('aria-hidden', 'true');

  const stage = await ensurePanelOpen(page);
  await expect(stage.locator('input[name="nome"]')).toHaveValue('Joana Teste');
  await expect(stage.locator('input[name="email"]')).toHaveValue('joana@example.com');
  await expect(stage.locator('input[name="telefone"]')).toHaveValue('(11) 98888-7777');
});

test('permite escolher entre múltiplos perfis antes do boot', async ({ page }) => {
  await page.addInitScript(() => {
    const firstProfile = {
      id: 'joana@example.com',
      email: 'joana@example.com',
      updatedAt: '2024-05-01T12:00:00.000Z',
      state: {
        user: {
          nomeCompleto: 'Joana Teste',
          email: 'joana@example.com',
          telefone: '11988887777',
          senha: 'SenhaForte123',
        },
        lastLogin: '2024-05-01T12:00:00.000Z',
        sessionActive: true,
        history: [],
      },
    };
    const secondProfile = {
      id: 'mario@example.com',
      email: 'mario@example.com',
      updatedAt: '2024-05-02T10:00:00.000Z',
      state: {
        user: {
          nomeCompleto: 'Mário Perfil',
          email: 'mario@example.com',
          telefone: '21977776666',
          senha: 'SenhaForte123',
        },
        lastLogin: '2024-05-02T10:00:00.000Z',
        sessionActive: true,
        history: [],
      },
    };
    window.localStorage.setItem('marco-appbase:profiles', JSON.stringify([firstProfile, secondProfile]));
  });

  await page.goto('/appbase/index.html');

  const selector = page.locator('[data-profile-selector]');
  await expect(selector).toHaveAttribute('aria-hidden', 'false');
  const options = page.locator('[data-profile-selector-list] button');
  await expect(options).toHaveCount(2);
  await options.filter({ hasText: 'Mário Perfil' }).first().click();
  await expect(selector).toHaveAttribute('aria-hidden', 'true');

  const stage = await ensurePanelOpen(page);
  await expect(stage.locator('input[name="email"]')).toHaveValue('mario@example.com');
  await expect(page.locator('[data-login-user]')).toHaveText('Mário Perfil');
});

test('persiste perfis no IndexedDB e no localStorage', async ({ page }) => {
  await page.goto('/appbase/index.html');

  await registerUser(page, {
    nome: 'Persistência IDB',
    email: 'persist@example.com',
    telefone: '11955554444',
  });

  const storedProfiles = await page.evaluate(() => {
    const raw = window.localStorage.getItem('marco-appbase:profiles');
    return raw ? JSON.parse(raw) : null;
  });
  expect(storedProfiles).not.toBeNull();
  expect(storedProfiles[0]?.state?.user?.email).toBe('persist@example.com');

  const persisted = await page.evaluate(async () => {
    const openRequest = indexedDB.open('marco-appbase');
    const database = await new Promise((resolve, reject) => {
      openRequest.onerror = () => reject(openRequest.error);
      openRequest.onsuccess = () => resolve(openRequest.result);
    });
    try {
      const transaction = database.transaction('profiles', 'readonly');
      const store = transaction.objectStore('profiles');
      const allRequest = store.getAll();
      const records = await new Promise((resolve, reject) => {
        allRequest.onerror = () => reject(allRequest.error);
        allRequest.onsuccess = () => resolve(allRequest.result);
      });
      return records;
    } finally {
      database.close();
    }
  });

  expect(Array.isArray(persisted)).toBe(true);
  expect(persisted.some((profile) => profile?.state?.user?.email === 'persist@example.com')).toBe(true);
});
