#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..', '..');

const [rawSource = 'apps/web/build'] = process.argv.slice(2);
let sourceDir = resolve(process.cwd(), rawSource);
if (!existsSync(sourceDir)) {
  const fallback = resolve(rootDir, rawSource);
  if (existsSync(fallback)) {
    sourceDir = fallback;
  } else {
    console.error(`[package-verticals] Diretório de origem não encontrado: ${sourceDir}`);
    process.exit(1);
  }
}

const manifestPath = resolve(rootDir, 'apps', 'web', 'src', 'lib', 'appHost', 'manifest.config.json');
let manifestEntries;
try {
  const content = readFileSync(manifestPath, 'utf8');
  manifestEntries = JSON.parse(content);
} catch (error) {
  console.error('[package-verticals] Não foi possível ler manifest.config.json:', error);
  process.exit(1);
}

if (!Array.isArray(manifestEntries)) {
  console.error('[package-verticals] Manifesto inválido: esperado array de entradas.');
  process.exit(1);
}

const artifactsDir = resolve(rootDir, 'artifacts');
mkdirSync(artifactsDir, { recursive: true });

for (const entry of manifestEntries) {
  if (!entry || typeof entry.id !== 'string') {
    continue;
  }

  const stagingRoot = mkdtempSync(join(tmpdir(), `marco-${entry.id}-`));
  const bundleDir = join(stagingRoot, 'bundle');
  cpSync(sourceDir, bundleDir, { recursive: true });

  const manifestDir = join(bundleDir, 'manifest');
  mkdirSync(manifestDir, { recursive: true });
  writeFileSync(join(manifestDir, 'active.json'), JSON.stringify(entry, null, 2));

  const targetFile = resolve(artifactsDir, `web-${entry.id}.tar.gz`);
  const tarResult = spawnSync('tar', ['-czf', targetFile, '-C', bundleDir, '.'], {
    stdio: 'inherit',
  });

  rmSync(stagingRoot, { recursive: true, force: true });

  if (tarResult.status !== 0) {
    console.error(`[package-verticals] Falha ao gerar artefato para ${entry.id}`);
    process.exit(tarResult.status ?? 1);
  }

  console.log(`[package-verticals] Artefato gerado em ${targetFile}`);
}
