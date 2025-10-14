import { test, expect } from "@playwright/test";

test("single-miniapp carrega paywall quando licença inativa", async ({ page }) => {
  await page.route(/license\/validate/, route => route.fulfill({ json: { user:"guest", license:{ status:"inactive" } } }));
  await page.goto("/appbase/index.html");
  await expect(page.getByText("Ative sua assinatura")).toBeVisible();
});

test("single-miniapp carrega o MiniApp quando licença ativa", async ({ page }) => {
  await page.route(/license\/validate/, route => route.fulfill({ json: { user:"guest", license:{ status:"active", plan:"pro" } } }));
  await page.goto("/appbase/index.html");
  await expect(page.getByText("Paraná Banco • Consignado")).toBeVisible();
});

test("tema persiste", async ({ page }) => {
  await page.goto("/appbase/index.html");
  await page.evaluate(()=>window.AppBase?.theme?.set?.("dark"));
  await page.reload();
  const isDark = await page.evaluate(()=>window.AppBase?.theme?.get?.() === "dark");
  expect(isDark).toBeTruthy();
});

test("multiusuário troca usuário atual", async ({ page }) => {
  await page.goto("/appbase/index.html");
  const prev = await page.evaluate(()=>window.AppBase?.users?.getCurrent?.()?.ref || "guest");
  await page.evaluate(()=>window.AppBase?.users?.switch?.("tester@example.com"));
  const next = await page.evaluate(()=>window.AppBase?.users?.getCurrent?.()?.ref);
  expect(next).not.toBe(prev);
});
