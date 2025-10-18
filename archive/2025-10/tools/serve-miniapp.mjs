#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const [, , miniapp = 'base_shell'] = process.argv;
const port = Number(process.env.PORT ?? 4173);

const miniappRoot = path.join(repoRoot, 'miniapps', miniapp);
const entryFile = path.join(miniappRoot, 'index.html');

async function ensureEntry() {
  try {
    await fsp.access(entryFile);
  } catch (error) {
    console.error(`Miniapp "${miniapp}" not found at ${entryFile}`);
    process.exitCode = 1;
    throw error;
  }
}

function resolveCandidates(urlPath) {
  if (urlPath === '/' || urlPath === `/miniapps/${miniapp}` || urlPath === `/miniapps/${miniapp}/`) {
    return [entryFile];
  }

  const candidates = [];
  const normalized = path.posix.normalize(urlPath);

  if (normalized.includes('..')) {
    return candidates;
  }

  const relativePath = normalized.replace(/^\/+/, '');

  if (!relativePath) {
    return [entryFile];
  }

  const fromMiniapp = path.resolve(miniappRoot, relativePath);
  if (fromMiniapp.startsWith(miniappRoot)) {
    candidates.push(fromMiniapp);
  }

  const fromRepo = path.resolve(repoRoot, relativePath);
  if (fromRepo.startsWith(repoRoot)) {
    candidates.push(fromRepo);
  }

  return candidates;
}

function sendError(res, statusCode, message) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(message);
}

async function start() {
  await ensureEntry();

  const server = http.createServer((req, res) => {
    const requestURL = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const decodedPath = decodeURIComponent(requestURL.pathname);
    const candidates = resolveCandidates(decodedPath);

    if (!candidates.length) {
      sendError(res, 403, 'Forbidden');
      return;
    }

    tryStream(candidates, res);
  });

  server.listen(port, () => {
    console.log(`Miniapp dev server ready on http://localhost:${port}`);
    console.log(`Serving miniapp "${miniapp}" from ${miniappRoot}`);
    console.log('Press Ctrl+C to stop.');
  });
}

async function tryStream([candidate, ...rest], res) {
  if (!candidate) {
    sendError(res, 404, 'Not found');
    return;
  }

  try {
    const stats = await fsp.stat(candidate);

    if (stats.isDirectory()) {
      const nested = path.join(candidate, 'index.html');
      await fsp.access(nested);
      streamFile(nested, res);
      return;
    }

    if (stats.isFile()) {
      streamFile(candidate, res);
      return;
    }
  } catch (error) {
    // Ignore and try next candidate.
  }

  await tryStream(rest, res);
}

function streamFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
}

start().catch(error => {
  if (!process.exitCode) {
    process.exitCode = 1;
  }
  console.error(error);
});
