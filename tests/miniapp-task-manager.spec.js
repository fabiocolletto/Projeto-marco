const { test, expect } = require('@playwright/test');

async function clearStorage(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.clear();
    } catch (error) {
      /* noop */
    }
  });
}

function formatDate(offsetDays) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

test.describe('MiniApp gestor de tarefas', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('permite cadastrar, atualizar e remover tarefas com prazos', async ({ page }) => {
    const yesterday = formatDate(-1);
    const today = formatDate(0);

    await page.goto('/appbase/index.html');

    const railToggle = page.locator('[data-miniapp-menu-toggle]');
    if (await railToggle.isVisible()) {
      await railToggle.click();
    }

    const card = page.locator('[data-miniapp-rail] [data-miniapp="gestor-tarefas"]');
    await expect(card).toBeVisible();
    await card.locator('button').first().click();

    const stage = page.locator('#painel-stage');
    await expect(stage).toHaveAttribute('data-miniapp-stage', 'gestor-tarefas');
    const panel = page.locator('[data-miniapp-panel="gestor-tarefas"]');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.miniapp-task-manager__form')).toBeVisible();
    await expect(panel.locator('.miniapp-task-manager__table')).toBeVisible();

    const titleInput = panel.locator('#gestor-tarefas-task-title');
    const dueInput = panel.locator('#gestor-tarefas-task-due');
    const statusSelect = panel.locator('#gestor-tarefas-task-status');
    const submitButton = panel.locator('.miniapp-task-manager__submit');
    const rows = panel.locator('tbody tr');
    const summary = panel.locator('.miniapp-task-manager__summary');

    async function addTask({ title, due = null, status = null }) {
      await titleInput.fill(title);
      if (due) {
        await dueInput.fill(due);
      }
      if (status) {
        await statusSelect.selectOption(status);
      }
      await submitButton.click();
    }

    await addTask({ title: 'Tarefa atrasada', due: yesterday, status: 'pending' });
    await expect(rows).toHaveCount(1);

    await addTask({ title: 'Tarefa hoje', due: today, status: 'in_progress' });
    await expect(rows).toHaveCount(2);

    await addTask({ title: 'Tarefa sem prazo', status: 'blocked' });
    await expect(rows).toHaveCount(3);

    await expect(summary).toContainText('3 tarefas');
    await expect(summary).toContainText('1 pendentes');
    await expect(summary).toContainText('1 em andamento');
    await expect(summary).toContainText('1 bloqueadas');
    await expect(summary).toContainText('0 concluídas');

    await expect(rows.nth(0)).toContainText('Tarefa atrasada');
    await expect(rows.nth(0)).toContainText('Atrasada');
    await expect(rows.nth(1)).toContainText('Tarefa hoje');
    await expect(rows.nth(1)).toContainText('Entrega hoje');
    await expect(rows.nth(2)).toContainText('Tarefa sem prazo');
    await expect(rows.nth(2)).toContainText('Sem prazo definido');

    const statusControl = rows.nth(1).locator('select');
    await statusControl.selectOption('done');
    await expect(summary).toContainText('1 concluídas');
    await expect(summary).toContainText('0 em andamento');

    const deleteButton = rows.nth(2).locator('button');
    await deleteButton.click();
    await expect(rows).toHaveCount(2);
    await expect(summary).toContainText('2 tarefas');
  });
});
