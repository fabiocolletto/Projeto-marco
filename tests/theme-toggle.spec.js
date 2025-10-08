const { test, expect } = require('@playwright/test');

async function resetApp(page) {
  await page.goto('/appbase/index.html', { waitUntil: 'load' });
  await page.waitForLoadState('load');

  await page.evaluate(() => window.localStorage.clear());

  await page.reload({ waitUntil: 'load' });
  await page.waitForLoadState('load');
}

test('alternância de tema atualiza UI e persiste preferência', async ({ page }) => {
  await resetApp(page);

  await page.evaluate(() => {
    window.localStorage.setItem('marco-appbase:theme', 'light');
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForLoadState('load');

  const html = page.locator('html');
  const toggle = page.locator('[data-theme-toggle]');
  const toggleIcon = toggle.locator('[data-theme-toggle-icon]');
  const brandIcon = page.locator('[data-brand-icon]');

  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveAttribute('aria-label', 'Ativar modo escuro');
  await expect(toggle).toHaveAttribute('title', 'Ativar modo escuro');
  await expect(toggleIcon).toHaveText('☀️');

  const lightSrc = await brandIcon.getAttribute('src');
  expect(lightSrc).toContain('icon-light-500');

  await toggle.click();

  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveAttribute('aria-label', 'Ativar modo claro');
  await expect(toggle).toHaveAttribute('title', 'Ativar modo claro');
  await expect(toggleIcon).toHaveText('🌙');
  await expect(brandIcon).toHaveAttribute('src', /icon-dark-500/);

  await page.reload({ waitUntil: 'load' });
  await page.waitForLoadState('load');

  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveAttribute('aria-label', 'Ativar modo claro');
  await expect(toggle).toHaveAttribute('title', 'Ativar modo claro');
  await expect(toggleIcon).toHaveText('🌙');

  const storedTheme = await page.evaluate(() =>
    window.localStorage.getItem('marco-appbase:theme')
  );
  expect(storedTheme).toBe('dark');

  const darkSrc = await brandIcon.getAttribute('src');
  expect(darkSrc).not.toBe(lightSrc);
});
