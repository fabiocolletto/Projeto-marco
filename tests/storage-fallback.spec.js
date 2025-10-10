const { test, expect } = require('@playwright/test');

async function openPanel(page) {
  const panelAccess = page.locator('[data-panel-access]');
  const stage = page.locator('#painel-stage');
  if (await stage.isHidden()) {
    await panelAccess.click();
    await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');
    await expect(stage).toBeVisible();
  }
  return stage;
}

test.describe('Persistência com IndexedDB indisponível', () => {
  test('AppBase mantém dados utilizando localStorage quando IndexedDB falha', async ({ page }) => {
    await page.addInitScript(() => {
      const flagKey = '__appbaseTestIndexedDbPatched';
      try {
        if (!window.localStorage.getItem(flagKey)) {
          window.localStorage.clear();
          window.localStorage.setItem(flagKey, '1');
        }
      } catch (error) {
        // Ignora falhas ao limpar storage durante o boot do teste.
      }

      const blocker = () => {
        if (typeof DOMException === 'function') {
          throw new DOMException('Blocked by test', 'SecurityError');
        }
        const error = new Error('Blocked by test');
        error.name = 'SecurityError';
        throw error;
      };

      try {
        indexedDB.open = blocker;
      } catch (error) {
        // Alguns navegadores podem impedir a redefinição direta; tenta via defineProperty.
        try {
          Object.defineProperty(indexedDB, 'open', {
            configurable: true,
            get() {
              return blocker;
            },
          });
        } catch (defineError) {
          console.error('Não foi possível simular bloqueio do IndexedDB', defineError);
        }
      }
    });

    await page.goto('/appbase/index.html', { waitUntil: 'load' });

    const stage = await openPanel(page);
    const form = stage.locator('[data-login-form]');
    await expect(form).toBeVisible();

    await form.locator('input[name="nome"]').fill('Fallback Teste');
    await form.locator('input[name="email"]').fill('fallback@example.com');
    await form.locator('input[name="telefone"]').fill('11988887777');
    await form.locator('input[name="senha"]').fill('SenhaForte123');
    await form.locator('[data-action="login-save"]').click();

    await expect(page.locator('[data-login-feedback]')).toHaveText('Cadastro atualizado com sucesso.');

    const storedFallback = await page.evaluate(() => window.localStorage.getItem('marco-appbase:user'));
    expect(storedFallback).not.toBeNull();
    expect(storedFallback).toContain('fallback@example.com');

    await page.reload({ waitUntil: 'load' });

    const panelAccess = page.locator('[data-panel-access]');
    await expect(panelAccess).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#painel-stage')).toBeVisible();
    await expect(page.locator('[data-login-user]')).toHaveText('Fallback Teste');
    await expect(page.locator('[data-login-account]')).toHaveText('fallback');

    await page.evaluate(() => window.localStorage.clear());
  });
});
