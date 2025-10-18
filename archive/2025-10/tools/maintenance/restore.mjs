#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { resolveRepositoryRoot } from './lib/analyzer.mjs';
import { computeSha256, copyWithDirectories, loadManifest } from './lib/archive-helpers.mjs';

function parseArgs() {
  const options = new Map();
  for (const arg of process.argv.slice(2)) {
    if (arg === '--apply') {
      options.set('apply', true);
    } else if (arg.startsWith('--path=')) {
      options.set('path', arg.slice('--path='.length));
    } else if (arg.startsWith('--id=')) {
      options.set('id', arg.slice('--id='.length));
    }
  }
  return options;
}

export function findCandidate(manifest, { path: originalPath, id }) {
  if (originalPath) {
    return manifest.find((entry) => entry.originalPath === originalPath);
  }
  if (id) {
    return manifest.find((entry) => entry.sha256 === id);
  }
  return null;
}

async function ensureCanRestore(destPath) {
  try {
    await fs.stat(destPath);
    return false;
  } catch (error) {
    return true;
  }
}

export async function restoreFromManifest({ rootDir = resolveRepositoryRoot(), path: originalPath, id, apply = false } = {}) {
  const manifest = await loadManifest(rootDir);
  if (!manifest || manifest.length === 0) {
    throw new Error('Manifesto de arquivamento vazio. Nenhuma restauração disponível.');
  }
  const candidate = findCandidate(manifest, { path: originalPath, id });
  if (!candidate) {
    throw new Error('Nenhum item correspondente encontrado no MANIFEST.');
  }

  const sourcePath = path.join(rootDir, candidate.newPath);
  const destPath = path.join(rootDir, candidate.originalPath);

  try {
    await fs.access(sourcePath);
  } catch (error) {
    throw new Error(`Arquivo arquivado não encontrado em ${candidate.newPath}.`);
  }

  const hash = await computeSha256(sourcePath);
  if (candidate.sha256 && hash !== candidate.sha256) {
    throw new Error('Falha na validação do hash. A restauração foi abortada.');
  }

  const canRestore = await ensureCanRestore(destPath);
  if (!canRestore) {
    throw new Error(`O caminho de destino ${candidate.originalPath} já existe. Remova ou renomeie antes de restaurar.`);
  }

  if (!apply) {
    return {
      dryRun: true,
      candidate,
      hash,
      sourcePath,
      destPath,
    };
  }

  await copyWithDirectories(sourcePath, destPath);
  return {
    dryRun: false,
    candidate,
    hash,
    sourcePath,
    destPath,
  };
}

async function run() {
  const args = parseArgs();
  try {
    const result = await restoreFromManifest({
      rootDir: resolveRepositoryRoot(),
      path: args.get('path'),
      id: args.get('id'),
      apply: Boolean(args.get('apply')),
    });
    if (result.dryRun) {
      console.log(`[dry-run] Restauraria ${result.candidate.newPath} -> ${result.candidate.originalPath}`);
      console.log(`sha256 verificado: ${result.hash}`);
    } else {
      console.log(`Arquivo restaurado em ${result.candidate.originalPath}.`);
    }
  } catch (error) {
    console.error('Falha na restauração:', error.message || error);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
