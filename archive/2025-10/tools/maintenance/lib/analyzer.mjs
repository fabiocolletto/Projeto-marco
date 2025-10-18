import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_IGNORE = new Set(['.git', 'node_modules', '.idea', '.vscode', 'dist', 'tmp', '.cache']);
const RE_REFERENCE = /(import\s+(?:[^'"\n]+\s+from\s+)?["']([^"']+)["'])|(?:href|src|data-src|data-href)\s*=\s*["']([^"']+)["']|url\(([^)]+)\)/gi;
const RE_EXPORT_NAME = /export\s+(?:const|function|class|let|var)\s+([a-zA-Z0-9_$]+)/g;
const RE_EXPORT_NAMED = /export\s*\{([^}]+)\}/g;
const RE_IMPORT = /import\s+(?:[^'"\n]+\s+from\s+)?["']([^"']+)["']/g;
const RE_DYNAMIC_IMPORT = /import\((['"])([^'"\n]+)\1\)/g;

function toPosix(p) {
  return p.split(path.sep).join('/');
}

export function resolveRepositoryRoot() {
  return path.resolve(__dirname, '../../..');
}

function shouldSkip(name) {
  return DEFAULT_IGNORE.has(name);
}

async function computeFileHash(fullPath) {
  const hash = crypto.createHash('sha256');
  const data = await fs.readFile(fullPath);
  hash.update(data);
  return hash.digest('hex');
}

async function readJsonSafe(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function gatherStringsFromJson(value, bag = []) {
  if (typeof value === 'string') {
    bag.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      gatherStringsFromJson(item, bag);
    }
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) {
      gatherStringsFromJson(v, bag);
    }
  }
  return bag;
}

function normalizeReference(specifier, fromPath) {
  if (!specifier) return null;
  const trimmed = specifier.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed || /^https?:/i.test(trimmed) || /^[a-z]+:\/\//i.test(trimmed) || trimmed.startsWith('mailto:')) {
    return null;
  }
  if (trimmed.startsWith('#')) {
    return null;
  }
  let normalized;
  if (trimmed.startsWith('/')) {
    normalized = trimmed.replace(/^\//, '');
  } else if (trimmed.startsWith('.')) {
    const dir = path.dirname(fromPath);
    normalized = toPosix(path.normalize(path.join(dir, trimmed)));
  } else {
    normalized = trimmed;
  }
  return normalized.replace(/^\.\//, '');
}

function extractReferences(filePath, content, typeHint = '') {
  const matches = new Set();
  if (typeHint === 'json') {
    try {
      const parsed = JSON.parse(content);
      const strings = gatherStringsFromJson(parsed);
      for (const str of strings) {
        const ref = normalizeReference(str, filePath);
        if (ref) {
          matches.add(ref);
        }
      }
    } catch (err) {
      // ignore malformed JSON
    }
    return matches;
  }

  let m;
  while ((m = RE_REFERENCE.exec(content)) !== null) {
    const specifier = m[2] || m[3] || m[4];
    const ref = normalizeReference(specifier, filePath);
    if (ref) {
      matches.add(ref);
    }
  }

  while ((m = RE_DYNAMIC_IMPORT.exec(content)) !== null) {
    const ref = normalizeReference(m[2], filePath);
    if (ref) matches.add(ref);
  }

  return matches;
}

function extractExports(content) {
  const exports = new Set();
  let m;
  while ((m = RE_EXPORT_NAME.exec(content)) !== null) {
    exports.add(m[1]);
  }
  while ((m = RE_EXPORT_NAMED.exec(content)) !== null) {
    const names = m[1].split(',').map((token) => token.trim().split(' as ')[0].trim()).filter(Boolean);
    for (const name of names) {
      exports.add(name);
    }
  }
  return exports;
}

export async function collectInventory(rootDir) {
  const entries = [];
  async function walk(current) {
    const items = await fs.readdir(current, { withFileTypes: true });
    for (const item of items) {
      if (shouldSkip(item.name)) continue;
      const full = path.join(current, item.name);
      if (item.isDirectory()) {
        await walk(full);
        continue;
      }
      const stat = await fs.stat(full);
      const rel = toPosix(path.relative(rootDir, full));
      const hash = await computeFileHash(full);
      entries.push({
        path: rel,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        mtime: new Date(stat.mtimeMs).toISOString(),
        hash,
      });
    }
  }
  await walk(rootDir);
  return entries;
}

function buildMaps(entries) {
  const byPath = new Map();
  for (const entry of entries) {
    byPath.set(entry.path, entry);
  }
  return { byPath };
}

function ensureReportDate(date) {
  return date.toISOString().slice(0, 10);
}

function ageInDays(now, mtimeMs) {
  return Math.floor((now - mtimeMs) / (1000 * 60 * 60 * 24));
}

function extractLinkTargets(filePath, content) {
  const links = [];
  const RE_LINK = /\[[^\]]+\]\(([^)]+)\)|<(?:a|link|script|img)[^>]+(?:href|src)=["']([^"']+)["']/gi;
  let m;
  while ((m = RE_LINK.exec(content)) !== null) {
    const spec = m[1] || m[2];
    const ref = normalizeReference(spec, filePath);
    if (ref) links.push(ref);
  }
  return links;
}

function lintMarkup(filePath, content) {
  const warnings = [];
  if (/\.html?$/.test(filePath)) {
    if (!/<\/html>/i.test(content)) {
      warnings.push('missing closing </html> tag');
    }
    if (!/<head>/i.test(content)) {
      warnings.push('missing <head> element');
    }
  }
  if (/\.css$/i.test(filePath)) {
    const open = (content.match(/\{/g) || []).length;
    const close = (content.match(/\}/g) || []).length;
    if (open !== close) {
      warnings.push('mismatched curly braces');
    }
  }
  return warnings;
}

function determineMiniappIdFromPath(filePath) {
  const parts = filePath.split('/');
  if (parts[0] === 'miniapps' && parts.length > 1) {
    return parts[1];
  }
  return null;
}

export async function analyzeRepository(rootDir, { now = new Date() } = {}) {
  const inventory = await collectInventory(rootDir);
  const { byPath } = buildMaps(inventory);
  const referencedBy = new Map();
  const references = new Map();
  const exportsMap = new Map();
  const linkIssues = [];
  const markupWarnings = [];
  const manualStatus = [];
  const miniappStatus = new Map();
  const registryPath = path.join(rootDir, 'appbase/registry.json');
  const registry = await readJsonSafe(registryPath);
  const registryIds = new Set();
  if (registry && Array.isArray(registry.apps)) {
    for (const app of registry.apps) {
      if (app && typeof app.id === 'string') {
        registryIds.add(app.id);
        if (typeof app.route === 'string') {
          const ref = normalizeReference(app.route, 'appbase/registry.json');
          if (ref) {
            const existing = references.get('appbase/registry.json') || new Set();
            existing.add(ref);
            references.set('appbase/registry.json', existing);
            if (!referencedBy.has(ref)) {
              referencedBy.set(ref, new Set());
            }
            referencedBy.get(ref).add('appbase/registry.json');
          }
        }
      }
    }
  }

  for (const entry of inventory) {
    const fullPath = path.join(rootDir, entry.path);
    const ext = path.extname(entry.path).toLowerCase();
    const content = await fs.readFile(fullPath, 'utf8').catch(() => null);
    if (content === null) continue;
    let hint = '';
    if (ext === '.json') hint = 'json';
    const refs = extractReferences(entry.path, content, hint);
    if (refs.size > 0) {
      references.set(entry.path, refs);
      for (const ref of refs) {
        if (!referencedBy.has(ref)) {
          referencedBy.set(ref, new Set());
        }
        referencedBy.get(ref).add(entry.path);
      }
    }

    const linkTargets = extractLinkTargets(entry.path, content);
    for (const target of linkTargets) {
      const exists = byPath.has(target);
      if (!exists) {
        linkIssues.push({ file: entry.path, target, status: 'missing' });
      }
    }

    const markup = lintMarkup(entry.path, content);
    for (const warning of markup) {
      markupWarnings.push({ file: entry.path, warning });
    }

    if (ext === '.js' || ext === '.mjs') {
      const exports = extractExports(content);
      if (exports.size > 0) {
        exportsMap.set(entry.path, exports);
      }
    }

    if (entry.path.startsWith('manuals/')) {
      const age = ageInDays(now, entry.mtimeMs);
      if (age >= 120) {
        manualStatus.push(`${entry.path} :: desatualizado há ${age} dias`);
      }
    }

    if (entry.path.endsWith('manifest.json') && entry.path.startsWith('miniapps/')) {
      const manifest = await readJsonSafe(fullPath);
      if (manifest) {
        const id = typeof manifest.id === 'string' ? manifest.id : null;
        const status = manifest.status || manifest.version || 'active';
        miniappStatus.set(entry.path, { id, status, path: entry.path, dir: determineMiniappIdFromPath(entry.path) });
      }
    }
  }

  const unusedExports = [];
  const importUsage = new Map();
  for (const [file, refs] of references.entries()) {
    const content = await fs.readFile(path.join(rootDir, file), 'utf8').catch(() => null);
    if (!content) continue;
    let m;
    while ((m = RE_IMPORT.exec(content)) !== null) {
      const spec = normalizeReference(m[1], file);
      if (!spec) continue;
      const named = m[0].match(/\{([^}]+)\}/);
      if (named && named[1]) {
        const names = named[1].split(',').map((token) => token.trim().split(' as ')[0].trim()).filter(Boolean);
        if (names.length > 0) {
          const key = spec;
          if (!importUsage.has(key)) {
            importUsage.set(key, new Set());
          }
          for (const name of names) {
            importUsage.get(key).add(name);
          }
        }
      }
    }
  }

  for (const [file, exports] of exportsMap.entries()) {
    const usage = importUsage.get(file) || new Set();
    for (const exp of exports) {
      if (!usage.has(exp)) {
        unusedExports.push({ file, export: exp });
      }
    }
  }

  const candidates = [];
  const orphans = [];
  let totalSize = 0;
  let potentialSavings = 0;
  for (const entry of inventory) {
    totalSize += entry.size;
    const age = ageInDays(now, entry.mtimeMs);
    const inbound = referencedBy.get(entry.path);
    const isReferenced = inbound && inbound.size > 0;
    const isManual = entry.path.startsWith('manuals/');
    if (!isReferenced && age >= 120 && !isManual) {
      const reason = entry.path.startsWith('assets/') ? 'unreferenced-asset' : 'unreferenced';
      candidates.push({
        path: entry.path,
        reason,
        evidence: { ageDays: age, references: [] },
        size: entry.size,
        hash: entry.hash,
        category: entry.path.startsWith('assets/') ? 'asset' : 'file',
      });
      potentialSavings += entry.size;
    } else if (!isReferenced && !isManual) {
      orphans.push({
        path: entry.path,
        reason: 'no-references',
        evidence: { ageDays: age, references: [] },
        size: entry.size,
        hash: entry.hash,
      });
    }
  }

  const miniappFindings = [];
  for (const info of miniappStatus.values()) {
    if (!info.dir) continue;
    if (!info.id || !registryIds.has(info.id) || `${info.status}`.toLowerCase() === 'deprecated') {
      miniappFindings.push({
        path: `miniapps/${info.dir}`,
        reason: !info.id ? 'manifest-missing-id' : !registryIds.has(info.id) ? 'not-in-registry' : 'deprecated',
        evidence: { manifest: info.path, status: info.status, registry: Array.from(registryIds) },
        size: 0,
        hash: null,
        category: 'miniapp',
      });
    }
  }

  const registryDiff = {
    missingManifests: [],
    missingRegistryEntries: [],
  };

  const manifestIds = new Map();
  for (const info of miniappStatus.values()) {
    if (info.id) {
      manifestIds.set(info.id, info);
    }
  }

  for (const id of registryIds) {
    if (!manifestIds.has(id)) {
      registryDiff.missingManifests.push(id);
    }
  }

  for (const [id, info] of manifestIds.entries()) {
    if (!registryIds.has(id)) {
      registryDiff.missingRegistryEntries.push({ id, manifest: info.path });
    }
  }

  const summary = {
    totalFiles: inventory.length,
    totalSize,
    candidates: candidates.length + miniappFindings.length,
    orphans: orphans.length,
    potentialSavings,
  };

  const findings = [...candidates, ...miniappFindings];

  return {
    reportDate: ensureReportDate(now),
    inventory,
    references,
    referencedBy,
    findings,
    orphans,
    manualStatus,
    linkIssues,
    unusedExports,
    markupWarnings,
    registryDiff,
    summary,
  };
}

export function formatSummaryMarkdown(result) {
  const lines = [];
  lines.push(`# Maintenance Summary (${result.reportDate})`);
  lines.push('');
  lines.push(`- Total files scanned: ${result.summary.totalFiles}`);
  lines.push(`- Repository size (bytes): ${result.summary.totalSize}`);
  lines.push(`- Candidates for archive: ${result.summary.candidates}`);
  lines.push(`- Orphan files detected: ${result.summary.orphans}`);
  lines.push(`- Potential savings (bytes): ${result.summary.potentialSavings}`);
  lines.push('');
  if (result.findings.length > 0) {
    lines.push('## Candidates');
    for (const finding of result.findings.slice(0, 20)) {
      lines.push(`- ${finding.path} (${finding.reason})`);
    }
    if (result.findings.length > 20) {
      lines.push(`- ...and ${result.findings.length - 20} more`);
    }
    lines.push('');
  }
  if (result.orphans.length > 0) {
    lines.push('## Orphans');
    for (const orphan of result.orphans.slice(0, 20)) {
      lines.push(`- ${orphan.path}`);
    }
    if (result.orphans.length > 20) {
      lines.push(`- ...and ${result.orphans.length - 20} more`);
    }
  }
  return lines.join('\n');
}

export function serializeFindings(findings) {
  return findings.map((finding) => ({
    path: finding.path,
    reason: finding.reason,
    evidence: finding.evidence,
    size: finding.size,
    hash: finding.hash,
    category: finding.category || 'file',
  }));
}

export function summarizeManualStatus(manualStatus) {
  if (manualStatus.length === 0) {
    return 'Todos os manuais estão dentro da janela de atualização recomendada.';
  }
  return manualStatus.join('\n');
}

