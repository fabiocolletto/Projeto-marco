import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mostra versão AppBase v3.0 • Clean", async ({ page }) => {
  await page.goto("http://localhost:4173/appbase/index.html");
  await expect(page.getByText("AppBase v3.0 • Clean")).toBeVisible();
});

test("fluxo de login local e validação mockada", async ({ page }) => {
  await page.route(/license\/validate/, (route) =>
    route.fulfill({
      json: { user: "tester@example.com", license: { status: "active", plan: "pro" } }
    })
  );
  await page.goto("http://localhost:4173/appbase/index.html");
  await page.locator("#email").fill("tester@example.com");
  await page.locator("#btnLogin").click();
  await page.locator("#btnValidate").click();
  await expect(page.getByText("active")).toBeVisible();
});
