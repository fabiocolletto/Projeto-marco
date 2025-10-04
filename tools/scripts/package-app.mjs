#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..', '..');

const [targetName, sourceDir = 'dist'] = process.argv.slice(2);

if (!targetName) {
  console.error('[marco-package] Informe o nome do artefato e diretório origem opcional.');
  process.exit(1);
}

const absoluteSource = resolve(process.cwd(), sourceDir);
if (!existsSync(absoluteSource)) {
  console.error(`[marco-package] Diretório de origem não encontrado: ${absoluteSource}`);
  process.exit(1);
}

const artifactsDir = resolve(rootDir, 'artifacts');
mkdirSync(artifactsDir, { recursive: true });

const targetFile = resolve(artifactsDir, `${targetName}.tar.gz`);

const tarResult = spawnSync('tar', ['-czf', targetFile, '-C', absoluteSource, '.'], {
  stdio: 'inherit',
});

if (tarResult.status !== 0) {
  process.exit(tarResult.status ?? 1);
}

console.log(`[marco-package] Artefato gerado em ${targetFile}`);
