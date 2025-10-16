#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url);
const REQUIRED_FILES = [
  path.join(ROOT.pathname, 'appbase', 'index.html'),
  path.join(ROOT.pathname, 'appbase', 'app.js'),
  path.join(ROOT.pathname, 'appbase', 'app.css')
];

function main() {
  const missing = REQUIRED_FILES.filter((file) => !fs.existsSync(file));
  if (missing.length > 0) {
    console.error('[lighthouse] arquivos base ausentes:', missing.map((f) => path.relative(ROOT.pathname, f)).join(', '));
    process.exit(1);
  }
  console.log('[lighthouse] Smoke check OK — execute lighthouse real nos ambientes de staging.');
}

main();
