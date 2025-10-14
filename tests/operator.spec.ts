import { test, expect } from "@playwright/test";

test("Painel monta e atalho Shift+M abre overlay", async ({ page }) => {
  await page.goto("http://localhost:4173/appbase/index.html");
  const wrap = page.locator("#op-wrap");
  await wrap.waitFor();
  await page.keyboard.down("Shift");
  await page.keyboard.press("M");
  await page.keyboard.up("Shift");
  await expect(wrap).toBeVisible();
});
