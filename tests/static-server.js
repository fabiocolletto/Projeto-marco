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

function resolveFile(rootDir, pathname) {
  let filePath = path.resolve(rootDir, `.${pathname}`);

  if (!filePath.startsWith(rootDir)) {
    return null;
  }

  return filePath;
}

async function serveFile(res, filePath) {
  const data = await fs.promises.readFile(filePath);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

async function handleRequest(rootDir, req, res) {
  try {
    const requestUrl = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(requestUrl.pathname);

    let filePath = resolveFile(rootDir, pathname);

    if (!filePath) {
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
      filePath = path.join(resolveFile(rootDir, pathname) || '', 'index.html');
      stat = await fs.promises.stat(filePath).catch(() => null);
    }

    if (!stat) {
      throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
    }

    await serveFile(res, filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(500);
      res.end('Server error');
    }
  }
}

async function createStaticServer({
  port = Number(process.env.PORT) || 4173,
  host = '127.0.0.1',
} = {}) {
  const rootDir = path.resolve(__dirname, '..');
  const server = http.createServer((req, res) => {
    handleRequest(rootDir, req, res);
  });

  await new Promise((resolve) => {
    server.listen(port, host, resolve);
  });

  const close = () =>
    new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

  return {
    server,
    port: server.address().port,
    host,
    close,
  };
}

module.exports = { createStaticServer };

if (require.main === module) {
  createStaticServer()
    .then(({ port, host, close }) => {
      const shutdown = async () => {
        await close();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      console.log(`Static server running at http://${host}:${port}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
