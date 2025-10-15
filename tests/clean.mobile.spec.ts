import { test, expect } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

const CLEAN_URL = "/appbase/index.html";

test.use({ viewport: MOBILE_VIEWPORT });

test.describe("AppBase Clean shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/license\/validate/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: "tester@example.com",
          license: { status: "active", plan: "pro" },
        }),
      })
    );

    await page.goto(CLEAN_URL);
  });

  test("exibe a versão correta no cabeçalho", async ({ page }) => {
    const versionTag = page.getByTestId("app-version");
    await expect(versionTag).toHaveText("AppBase v3.0 • Clean");
  });

  test("realiza login local e valida licença", async ({ page }) => {
    await page.getByTestId("email-input").fill("tester@example.com");
    await page.getByTestId("login-button").click();

    await expect(page.getByTestId("session-indicator")).toContainText("tester@example.com");

    await page.getByTestId("validate-button").click();
    await expect(page.getByTestId("status-log")).toContainText("active");
  });

  test("não exibe overlay em viewport mobile", async ({ page }) => {
    const overlay = page.getByTestId("desktop-overlay");
    await expect(overlay).toHaveAttribute("aria-hidden", "true");
  });
});
