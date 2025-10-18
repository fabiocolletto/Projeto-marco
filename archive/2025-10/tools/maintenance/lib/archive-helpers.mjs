import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { resolveRepositoryRoot } from './analyzer.mjs';

export function resolveManifestPath(rootDir = resolveRepositoryRoot()) {
  return path.join(rootDir, 'archive', 'MANIFEST.json');
}

export async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function loadManifest(rootDir = resolveRepositoryRoot()) {
  const manifestPath = resolveManifestPath(rootDir);
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    return [];
  }
}

export async function saveManifest(entries, rootDir = resolveRepositoryRoot()) {
  const manifestPath = resolveManifestPath(rootDir);
  await ensureDirectory(path.dirname(manifestPath));
  await fs.writeFile(manifestPath, JSON.stringify(entries, null, 2));
}

export async function appendManifestEntry(entry, rootDir = resolveRepositoryRoot()) {
  const manifest = await loadManifest(rootDir);
  manifest.push(entry);
  await saveManifest(manifest, rootDir);
}

export async function moveWithDirectories(src, dest) {
  await ensureDirectory(path.dirname(dest));
  await fs.rename(src, dest);
}

export async function copyWithDirectories(src, dest) {
  await ensureDirectory(path.dirname(dest));
  await fs.copyFile(src, dest);
}

export async function computeSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = await fs.readFile(filePath);
  hash.update(buffer);
  return hash.digest('hex');
}

export async function latestReportDir(rootDir = resolveRepositoryRoot()) {
  const reportsDir = path.join(rootDir, 'reports');
  try {
    const entries = await fs.readdir(reportsDir);
    const sorted = entries.filter((item) => /\d{4}-\d{2}-\d{2}/.test(item)).sort();
    return sorted.length > 0 ? path.join(reportsDir, sorted[sorted.length - 1]) : null;
  } catch (error) {
    return null;
  }
}

export async function readJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

