import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/widget',
  timeout: 45_000,
  fullyParallel: true,
  expect: {
    timeout: 10_000,
  },
  use: {
    headless: true,
    trace: 'retain-on-failure',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
});
