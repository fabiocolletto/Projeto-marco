const { test, expect } = require('@playwright/test');
const http = require('http');
const path = require('path');
const fs = require('fs');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function startStaticServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, 'http://localhost');
      const pathname = decodeURIComponent(requestUrl.pathname);
      let filePath = path.resolve(rootDir, `.${pathname}`);

      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end();
        return;
      }

      let stat = await fs.promises.stat(filePath).catch(() => null);

      if (stat && stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        stat = await fs.promises.stat(filePath).catch(() => null);
      }

      if (!stat && (pathname === '/' || pathname.endsWith('/'))) {
        filePath = path.join(path.resolve(rootDir, `.${pathname}`), 'index.html');
        stat = await fs.promises.stat(filePath).catch(() => null);
      }

      if (!stat) {
        throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
      }

      const data = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      });
      res.end(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    }
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address();
  return { server, port };
}

async function closeServer(server) {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function closeLoginOverlay(page) {
  const overlay = page.locator('[data-overlay="login"]');
  if ((await overlay.getAttribute('aria-hidden')) === 'false') {
    const closeButton = overlay.locator('[data-overlay-close]');
    await closeButton.click();
    await expect(overlay).toHaveAttribute('aria-hidden', 'true');
  }
}

let serverInstance;
let baseURL;

test.beforeAll(async () => {
  const rootDir = path.resolve(__dirname, '..', 'appbase');
  const { server, port } = await startStaticServer(rootDir);
  serverInstance = server;
  baseURL = `http://127.0.0.1:${port}`;
});

test.afterAll(async () => {
  await closeServer(serverInstance);
});

test('etiqueta abre o painel e o botão ⋯ alterna o estado', async ({ page }) => {
  await page.goto(`${baseURL}/index.html`);
  await closeLoginOverlay(page);

  const stage = page.locator('#painel-stage');
  const cardTitle = page.locator('[data-miniapp="painel"] .ac-miniapp-card__title');
  const toggleButton = page.locator('[data-miniapp="painel"] [data-toggle-panel]');

  await expect(stage).toBeHidden();

  await cardTitle.click();
  await expect(stage).toBeVisible();

  await cardTitle.click();
  await expect(stage).toBeVisible();

  await toggleButton.click();
  await expect(stage).toBeHidden();

  await toggleButton.click();
  await expect(stage).toBeVisible();
});
