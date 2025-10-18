import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { analyzeRepository } from '../lib/analyzer.mjs';
import { appendManifestEntry, loadManifest, computeSha256 } from '../lib/archive-helpers.mjs';
import { restoreFromManifest } from '../restore.mjs';

async function createTempRepo() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'maintenance-'));
  await fs.mkdir(path.join(root, 'appbase'), { recursive: true });
  await fs.mkdir(path.join(root, 'miniapps', 'sample'), { recursive: true });
  await fs.mkdir(path.join(root, 'manuals'), { recursive: true });
  await fs.mkdir(path.join(root, 'src'), { recursive: true });
  await fs.mkdir(path.join(root, 'archive'), { recursive: true });
  await fs.mkdir(path.join(root, 'reports'), { recursive: true });

  const registry = {
    apps: [
      {
        id: 'sample-app',
        route: '/miniapps/sample/index.html',
        active: true,
      },
    ],
  };
  await fs.writeFile(path.join(root, 'appbase', 'registry.json'), JSON.stringify(registry, null, 2));
  const manifest = {
    id: 'sample-app',
    status: 'active',
  };
  await fs.writeFile(path.join(root, 'miniapps', 'sample', 'manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(root, 'miniapps', 'sample', 'index.html'), '<html><head></head><body></body></html>');
  await fs.writeFile(path.join(root, 'src', 'active.js'), "import './helper.js';\nexport const value = 1;\n");
  await fs.writeFile(path.join(root, 'src', 'helper.js'), 'export const helper = true;\n');
  await fs.writeFile(path.join(root, 'unused.js'), 'export const unused = true;\n');
  await fs.writeFile(path.join(root, 'manuals', 'guide.md'), '# Guia\n');

  const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
  await fs.utimes(path.join(root, 'unused.js'), oldDate, oldDate);
  await fs.utimes(path.join(root, 'manuals', 'guide.md'), oldDate, oldDate);

  return root;
}

function hasCandidate(findings, targetPath) {
  return findings.some((item) => item.path === targetPath);
}

test('detecta arquivos órfãos sem impactar manuals', async () => {
  const root = await createTempRepo();
  const now = new Date();
  const result = await analyzeRepository(root, { now });
  assert.ok(hasCandidate(result.findings, 'unused.js'));
  assert.ok(result.manualStatus.length > 0, 'manuals devem ser listados como desatualizados');
  assert.ok(result.findings.every((finding) => !finding.path.startsWith('manuals/')));
});

test('appendManifestEntry adiciona e restoreFromManifest repõe arquivo com hash válido', async () => {
  const root = await createTempRepo();
  const filePath = path.join(root, 'unused.js');
  const archivePath = path.join(root, 'archive', '2024-01', 'unused.js');
  await fs.mkdir(path.dirname(archivePath), { recursive: true });
  await fs.copyFile(filePath, archivePath);
  await fs.unlink(filePath);
  const sha = await computeSha256(archivePath);
  await appendManifestEntry({
    originalPath: 'unused.js',
    newPath: 'archive/2024-01/unused.js',
    sha256: sha,
    size: 1,
    reason: 'test',
    evidence: {},
    archivedAt: new Date().toISOString(),
  }, root);

  const manifest = await loadManifest(root);
  assert.equal(manifest.length, 1);
  const dryRun = await restoreFromManifest({ rootDir: root, path: 'unused.js', apply: false });
  assert.equal(dryRun.hash, sha);
  const restored = await restoreFromManifest({ rootDir: root, path: 'unused.js', apply: true });
  await fs.access(path.join(root, 'unused.js'));
  assert.equal(restored.hash, sha);
});
