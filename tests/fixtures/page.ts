import type { Page } from '@playwright/test';

export function registerPageConsole(page: Page): void {
  page.on('console', (message) => {
    console.log(`[console:${message.type()}] ${message.text()}`);
  });

  page.on('pageerror', (error) => {
    console.error(`[pageerror] ${error.message}`);
  });
}
