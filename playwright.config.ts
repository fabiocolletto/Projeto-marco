import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/visual',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    baseURL: 'http://127.0.0.1:4173',
  },
  webServer: {
    command: 'npm --workspace web run preview -- --host 0.0.0.0 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  reporter: [['list']],
});
