#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { resolveRepositoryRoot } from './lib/analyzer.mjs';

const THRESHOLD = 5 * 1024 * 1024; // 5MB
const POINTER_SIGNATURE = 'version https://git-lfs.github.com/spec/v1';
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'tmp', '.cache']);

async function scan(rootDir) {
  const queue = [''];
  const offenders = [];
  while (queue.length > 0) {
    const relative = queue.pop();
    const full = path.join(rootDir, relative);
    const items = await fs.readdir(full, { withFileTypes: true });
    for (const item of items) {
      if (IGNORE_DIRS.has(item.name)) continue;
      const childRel = path.join(relative, item.name);
      const childFull = path.join(rootDir, childRel);
      if (item.isDirectory()) {
        queue.push(childRel);
        continue;
      }
      const stat = await fs.stat(childFull);
      if (stat.size <= THRESHOLD) continue;
      const buffer = await fs.readFile(childFull, { encoding: 'utf8' }).catch(() => null);
      const isPointer = buffer && buffer.includes(POINTER_SIGNATURE);
      if (!isPointer) {
        offenders.push({ path: childRel.split(path.sep).join('/'), size: stat.size });
      }
    }
  }
  return offenders;
}

async function run() {
  const rootDir = resolveRepositoryRoot();
  const offenders = await scan(rootDir);
  if (offenders.length === 0) {
    console.log('Nenhum binário acima de 5MB fora do LFS foi identificado.');
    return;
  }
  console.log('Arquivos sugeridos para rastreamento via Git LFS:');
  for (const offender of offenders) {
    const mb = (offender.size / (1024 * 1024)).toFixed(2);
    console.log(`- ${offender.path} (${mb} MB)`);
  }
}

run().catch((error) => {
  console.error('Falha na verificação de LFS:', error);
  process.exitCode = 1;
});
