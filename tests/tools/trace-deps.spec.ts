import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

test('trace runtime deps', async ({ page }) => {
  const fetched = new Set<string>();
  const repoRoot = process.cwd();
  const targetUrl =
    process.env.APPBASE_TRACE_URL || 'http://127.0.0.1:4173/appbase/index.html';

  page.on('request', (request) => {
    try {
      const url = new URL(request.url());
      if (url.protocol === 'file:') {
        const absolutePath = fileURLToPath(url);
        const relativePath = path.relative(repoRoot, absolutePath);
        if (!relativePath.startsWith('..')) {
          fetched.add(relativePath.replace(/\\+/g, '/'));
        }
        return;
      }

      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
        const pathname = url.pathname.replace(/^\//, '');
        if (pathname) {
          fetched.add(pathname);
        }
      }
    } catch (error) {
      // ignore malformed URLs
    }
  });

  await page.goto(targetUrl);
  await page.waitForTimeout(1500);

  console.log('RUNTIME_DEPS_START');
  [...fetched].sort().forEach((item) => console.log(item));
  console.log('RUNTIME_DEPS_END');
});
