#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { resolveRepositoryRoot } from './lib/analyzer.mjs';
import { appendManifestEntry, computeSha256, ensureDirectory, latestReportDir, moveWithDirectories, readJsonFile } from './lib/archive-helpers.mjs';

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    if (arg === '--apply') {
      args.set('apply', true);
    } else if (arg.startsWith('--report=')) {
      args.set('report', arg.split('=')[1]);
    }
  }
  return args;
}

function buildArchiveTarget(relativePath, monthKey) {
  return path.join('archive', monthKey, relativePath);
}

function buildAssetArchiveTarget(relativePath, monthKey) {
  const trimmed = relativePath.replace(/^assets\//, '');
  return path.join('assets', '_archive', monthKey, trimmed);
}

function pathToPosix(p) {
  return p.split(path.sep).join('/');
}

async function gatherFilesUnder(rootDir, relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  const entries = [];
  const stat = await fs.stat(fullPath);
  if (!stat.isDirectory()) {
    entries.push(relativePath);
    return entries;
  }
  const walk = async (currentRel) => {
    const currentFull = path.join(rootDir, currentRel);
    const items = await fs.readdir(currentFull, { withFileTypes: true });
    for (const item of items) {
      const childRel = path.join(currentRel, item.name);
      if (item.isDirectory()) {
        await walk(childRel);
      } else {
        entries.push(pathToPosix(childRel));
      }
    }
  };
  await walk(relativePath);
  return entries;
}

async function ensureMiniappReadme(rootDir, targetDir, reason) {
  const readmePath = path.join(rootDir, targetDir, 'README.md');
  const lines = [];
  lines.push(`# Miniapp arquivado`);
  lines.push('');
  lines.push(`Motivo: ${reason}`);
  lines.push('');
  lines.push('Para restaurar utilize o script `npm run archive:restore -- --path=<caminho-original>` ou informe o `sha256` presente no MANIFEST.');
  await ensureDirectory(path.dirname(readmePath));
  await fs.writeFile(readmePath, lines.join('\n'));
}

async function processEntry(rootDir, finding, { apply, monthKey, archivedAt }) {
  const repoPath = path.join(rootDir, finding.path);
  const exists = await fs.stat(repoPath).catch(() => null);
  if (!exists) {
    console.warn(`Ignorando ${finding.path} - arquivo não encontrado.`);
    return { moved: false };
  }
  const isDirectory = exists.isDirectory();
  const candidates = await gatherFilesUnder(rootDir, finding.path);
  const actions = [];

  for (const relative of candidates) {
    const fullSrc = path.join(rootDir, relative);
    const stat = await fs.stat(fullSrc);
    const sha = await computeSha256(fullSrc);
    let destinationRel;
    let ensureLfs = false;

    if (finding.category === 'miniapp') {
      const [, miniappId] = relative.split('/');
      const targetDir = path.join('miniapps', '_archive', miniappId);
      const rest = relative.split('/').slice(2).join('/');
      destinationRel = rest ? path.join(targetDir, rest) : path.join(targetDir, path.basename(relative));
      if (apply) {
        await ensureDirectory(path.join(rootDir, targetDir));
        await moveWithDirectories(fullSrc, path.join(rootDir, destinationRel));
        await ensureMiniappReadme(rootDir, path.join('miniapps', '_archive', miniappId), finding.reason);
      }
    } else if (finding.category === 'asset' && stat.size > 5 * 1024 * 1024) {
      destinationRel = buildAssetArchiveTarget(relative, monthKey);
      ensureLfs = true;
      if (apply) {
        await moveWithDirectories(fullSrc, path.join(rootDir, destinationRel));
      }
    } else {
      destinationRel = buildArchiveTarget(relative, monthKey);
      if (apply) {
        await moveWithDirectories(fullSrc, path.join(rootDir, destinationRel));
      }
    }

    if (!apply) {
      actions.push({
        originalPath: relative,
        newPath: destinationRel,
        sha256: sha,
        size: stat.size,
        reason: finding.reason,
        evidence: finding.evidence,
        archivedAt,
        apply: false,
        lfsSuggested: ensureLfs,
      });
      continue;
    }

    await appendManifestEntry({
      originalPath: relative,
      newPath: destinationRel,
      sha256: sha,
      size: stat.size,
      reason: finding.reason,
      evidence: finding.evidence,
      archivedAt,
      lfsSuggested: ensureLfs,
    }, rootDir);

    actions.push({
      originalPath: relative,
      newPath: destinationRel,
      sha256: sha,
      size: stat.size,
      reason: finding.reason,
      archivedAt,
      lfsSuggested: ensureLfs,
      apply: true,
    });
  }

  if (apply && isDirectory) {
    await fs.rm(repoPath, { recursive: true, force: true });
  }

  return { moved: apply, actions };
}

async function run() {
  const args = parseArgs();
  const apply = Boolean(args.get('apply'));
  const rootDir = resolveRepositoryRoot();
  let reportDir;
  if (args.has('report')) {
    reportDir = path.join(rootDir, 'reports', args.get('report'));
  } else {
    reportDir = await latestReportDir(rootDir);
  }
  if (!reportDir) {
    console.error('Nenhum relatório encontrado. Execute a auditoria primeiro.');
    process.exitCode = 1;
    return;
  }
  const findingsPath = path.join(reportDir, 'findings.json');
  const findings = await readJsonFile(findingsPath);
  if (!findings || findings.length === 0) {
    console.log('Nenhum candidato a arquivamento encontrado.');
    return;
  }

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const archivedAt = now.toISOString();

  if (!apply) {
    console.log('Modo dry-run. Nenhum arquivo será movido. Use --apply para executar.');
  }

  for (const finding of findings) {
    if (finding.path.startsWith('manuals/')) {
      console.log(`Ignorando manual ${finding.path}. Políticas impedem arquivamento automático.`);
      continue;
    }
    const outcome = await processEntry(rootDir, finding, { apply, monthKey, archivedAt });
    for (const action of outcome.actions || []) {
      if (!apply) {
        console.log(`[dry-run] ${action.originalPath} -> ${action.newPath}`);
      } else {
        console.log(`Arquivado: ${action.originalPath} -> ${action.newPath}`);
      }
      if (action.lfsSuggested) {
        console.log(`  - Sugerido adicionar ao Git LFS: ${action.originalPath}`);
      }
    }
  }
}

run().catch((error) => {
  console.error('Falha na política de arquivamento:', error);
  process.exitCode = 1;
});
