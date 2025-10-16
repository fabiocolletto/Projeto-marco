#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url);
const REQUIRED_HEADINGS = {
  'docs/README_appbase.md': ['## Idiomas suportados', '## Registro de miniapps', '## Contratos e paridade'],
  'docs/OPERATIONS.md': ['## A) Adicionar novo idioma', '## B) Adicionar miniapp ao menu', '## C) Evoluir contrato (schema major)'],
  'docs/CONTRIBUTING.md': ['## Fluxo de trabalho', '## Commits', '## Versionamento']
};

async function listMarkdownFiles() {
  const files = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const resolved = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        await walk(resolved);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(resolved);
      }
    }
  }
  await walk(path.join(ROOT.pathname, 'docs'));
  files.push(path.join(ROOT.pathname, 'CHANGELOG.md'));
  return files;
}

function extractLinks(markdown) {
  const regex = /\[[^\]]+\]\(([^)]+)\)/g;
  const links = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    links.push(match[1]);
  }
  return links;
}

function buildHeadingSlugs(markdown) {
  const regex = /^#{1,6}\s+(.+)$/gm;
  const slugs = new Set();
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const text = match[1]
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    if (text) {
      slugs.add(text);
    }
  }
  return slugs;
}

async function verifyLinks(filePath, markdown) {
  const dir = path.dirname(filePath);
  const issues = [];
  const currentSlugs = buildHeadingSlugs(markdown);
  for (const link of extractLinks(markdown)) {
    if (link.startsWith('http://') || link.startsWith('https://')) {
      continue;
    }
    if (link.startsWith('mailto:')) continue;
    const [relativePath, hash] = link.split('#');
    const targetPath = relativePath ? path.join(dir, relativePath) : filePath;
    try {
      await fs.access(targetPath);
      if (hash) {
        const targetContent = relativePath ? await fs.readFile(targetPath, 'utf-8') : markdown;
        const slugs = relativePath ? buildHeadingSlugs(targetContent) : currentSlugs;
        if (!slugs.has(hash.toLowerCase())) {
          issues.push(`Âncora ausente: ${link}`);
        }
      }
    } catch (error) {
      issues.push(`Link quebrado: ${link}`);
    }
  }
  return issues;
}

async function verifyHeadings(filePath, markdown) {
  const relative = path.relative(ROOT.pathname, filePath).replace(/\\/g, '/');
  const required = REQUIRED_HEADINGS[relative];
  if (!required) return [];
  const issues = [];
  for (const heading of required) {
    if (!markdown.includes(heading)) {
      issues.push(`Heading obrigatório ausente: ${heading}`);
    }
  }
  return issues;
}

async function main() {
  const files = await listMarkdownFiles();
  let hasErrors = false;
  for (const file of files) {
    const markdown = await fs.readFile(file, 'utf-8');
    const [linkIssues, headingIssues] = await Promise.all([
      verifyLinks(file, markdown),
      verifyHeadings(file, markdown)
    ]);
    const issues = [...linkIssues, ...headingIssues];
    if (issues.length > 0) {
      hasErrors = true;
      console.error(`[docs] ${path.relative(ROOT.pathname, file)}`);
      issues.forEach((issue) => console.error(` - ${issue}`));
    }
  }
  if (hasErrors) {
    process.exitCode = 1;
  } else {
    console.log('[docs] Links e headings OK');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
