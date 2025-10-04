#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..', '..');
const prettierBin = resolve(rootDir, 'node_modules', '.bin', 'prettier');

const cliArgs = process.argv.slice(2);
let mode = 'check';
const patterns = [];

for (const arg of cliArgs) {
  if (arg === 'write' || arg === '--write') {
    mode = 'write';
    continue;
  }
  if (arg === 'check' || arg === '--check') {
    mode = 'check';
    continue;
  }
  patterns.push(arg);
}

if (!existsSync(prettierBin)) {
  console.error('[marco-format] Prettier não está instalado. Execute `npm install`.');
  process.exit(1);
}

const defaultPatterns = ['**/*.{js,ts,mjs,cjs,cts,mts,svelte,json,md,css}'];
const prettierArgs = ['--config', resolve(rootDir, 'prettier.config.cjs')];

if (mode === 'write') {
  prettierArgs.push('--write');
} else {
  prettierArgs.push('--check');
}

prettierArgs.push(...(patterns.length > 0 ? patterns : defaultPatterns));

const result = spawnSync(prettierBin, prettierArgs, {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: { ...process.env },
});

process.exit(result.status ?? 1);
