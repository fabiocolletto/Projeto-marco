#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const repoRoot = process.cwd();
const entry = process.argv[2] || 'appbase/index.html';

const visited = new Set();
const results = [];
const queue = [normalizePath(entry)];

function normalizePath(p) {
  return p.replace(/\\+/g, '/');
}

function resolveReference(fromFile, ref) {
  if (!ref) return null;
  const trimmed = ref.trim();
  if (trimmed === '' || trimmed.startsWith('#')) return null;
  if (/^(?:https?:|data:|mailto:|tel:|javascript:)/i.test(trimmed)) return null;

  const cleanRef = trimmed.replace(/[?#].*$/, '');

  let resolved;
  if (cleanRef.startsWith('/')) {
    resolved = path.join(repoRoot, cleanRef.slice(1));
  } else {
    const baseDir = path.dirname(path.join(repoRoot, fromFile));
    resolved = path.resolve(baseDir, cleanRef);
  }

  if (!resolved.startsWith(repoRoot)) {
    return null;
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return null;
  }

  return normalizePath(path.relative(repoRoot, resolved));
}

function extractHtmlRefs(content) {
  const refs = new Set();
  const regex = /<(script|link|img|source|a|template|iframe)[^>]+?(src|href)=\s*["']([^"']+)["']/gi;
  for (const match of content.matchAll(regex)) {
    refs.add(match[3]);
  }

  const srcsetRegex = /\s(srcset)=\s*["']([^"']+)["']/gi;
  for (const match of content.matchAll(srcsetRegex)) {
    const parts = match[2].split(',');
    for (const part of parts) {
      const url = part.trim().split(/\s+/)[0];
      if (url) refs.add(url);
    }
  }

  return [...refs];
}

function extractCssRefs(content) {
  const refs = new Set();
  const importRegex = /@import\s+(?:url\()?\s*["']?([^"'\);]+)["']?\s*\)?/gi;
  for (const match of content.matchAll(importRegex)) {
    refs.add(match[1]);
  }

  const urlRegex = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
  for (const match of content.matchAll(urlRegex)) {
    refs.add(match[2]);
  }
  return [...refs];
}

function extractJsRefs(content) {
  const refs = new Set();
  const importRegex = /import\s+(?:[^'";]*?from\s*)?["']([^"']+)["']/g;
  for (const match of content.matchAll(importRegex)) {
    refs.add(match[1]);
  }

  const dynamicImportRegex = /import\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of content.matchAll(dynamicImportRegex)) {
    refs.add(match[1]);
  }

  const fetchRegex = /fetch\(\s*["']([^"']+)["']/g;
  for (const match of content.matchAll(fetchRegex)) {
    refs.add(match[1]);
  }

  const newUrlRegex = /new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g;
  for (const match of content.matchAll(newUrlRegex)) {
    refs.add(match[1]);
  }

  return [...refs];
}

while (queue.length) {
  const relPath = queue.shift();
  if (visited.has(relPath)) continue;
  const absPath = path.join(repoRoot, relPath);
  if (!fs.existsSync(absPath)) {
    console.warn(`Warning: ${relPath} not found.`);
    continue;
  }
  const stat = fs.statSync(absPath);
  if (!stat.isFile()) continue;

  visited.add(relPath);
  const content = fs.readFileSync(absPath);
  const sha256 = crypto.createHash('sha256').update(content).digest('hex');
  results.push({ path: normalizePath(relPath), sha256 });

  const ext = path.extname(relPath).toLowerCase();
  let refs = [];
  const text = content.toString('utf8');
  if (ext === '.html' || ext === '.htm') {
    refs = extractHtmlRefs(text);
  } else if (ext === '.css') {
    refs = extractCssRefs(text);
  } else if (['.js', '.mjs', '.ts'].includes(ext)) {
    refs = extractJsRefs(text);
  }

  for (const ref of refs) {
    const resolved = resolveReference(relPath, ref);
    if (resolved && !visited.has(resolved)) {
      queue.push(resolved);
    }
  }
}

results.sort((a, b) => a.path.localeCompare(b.path));

const output = {
  root: normalizePath(entry),
  files: results,
};

console.log(JSON.stringify(output, null, 2));
