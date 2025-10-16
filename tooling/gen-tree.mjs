#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url);
const OUTPUT = path.join(ROOT.pathname, 'docs', 'TREE.md');

function tree(dir, prefix = '') {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.') && entry.name !== 'node_modules')
    .sort((a, b) => a.name.localeCompare(b.name));
  const lines = [];
  entries.forEach((entry, index) => {
    const connector = index === entries.length - 1 ? '└──' : '├──';
    lines.push(`${prefix}${connector} ${entry.name}`);
    if (entry.isDirectory()) {
      const childPrefix = `${prefix}${index === entries.length - 1 ? '    ' : '│   '}`;
      lines.push(...tree(path.join(dir, entry.name), childPrefix));
    }
  });
  return lines;
}

function buildTree() {
  const sections = [
    { name: 'appbase', dir: path.join(ROOT.pathname, 'appbase') },
    { name: 'docs', dir: path.join(ROOT.pathname, 'docs') },
    { name: 'tooling', dir: path.join(ROOT.pathname, 'tooling') }
  ];
  const lines = ['.'];
  sections.forEach((section, index) => {
    if (!fs.existsSync(section.dir)) {
      return;
    }
    const connector = index === sections.length - 1 ? '└──' : '├──';
    lines.push(`${connector} ${section.name}`);
    const childPrefix = index === sections.length - 1 ? '    ' : '│   ';
    lines.push(...tree(section.dir, childPrefix));
  });
  return lines;
}

function main() {
  const lines = buildTree();
  const content = `# Estrutura de diretórios (gerado)\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n\n> Atualize com \`npm run gen:tree\`.\n`;
  fs.writeFileSync(OUTPUT, content);
  console.log('[docs] TREE.md atualizado');
}

main();
