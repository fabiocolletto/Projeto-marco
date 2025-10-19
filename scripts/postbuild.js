import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const docsDir = path.join(rootDir, 'docs');
const vendorSourceDir = path.join(rootDir, 'node_modules', 'idb', 'build');

const importMapPattern = /<script type="importmap">[\s\S]*?"idb"/m;
const importMapSnippet = [
  '  <script type="importmap">',
  '    {',
  '      "imports": {',
  '        "idb": "./vendor/idb/index.js"',
  '      }',
  '    }',
  '  </script>',
].join('\n');

async function copyIdbVendor(targetDir) {
  if (!(await fs.pathExists(vendorSourceDir))) {
    return;
  }

  const vendorTargetDir = path.join(targetDir, 'vendor', 'idb');
  await fs.ensureDir(path.dirname(vendorTargetDir));
  await fs.remove(vendorTargetDir);
  await fs.copy(vendorSourceDir, vendorTargetDir);
}

async function ensureImportMap(targetDir) {
  const indexPath = path.join(targetDir, 'index.html');
  if (!(await fs.pathExists(indexPath))) {
    return;
  }

  const html = await fs.readFile(indexPath, 'utf-8');
  if (importMapPattern.test(html)) {
    return;
  }

  if (!html.includes('</head>')) {
    return;
  }

  const nextHtml = html.replace('</head>', `${importMapSnippet}\n</head>`);
  await fs.writeFile(indexPath, nextHtml, 'utf-8');
}

await fs.ensureDir(distDir);

await fs.copy(path.join(rootDir, 'index.html'), path.join(distDir, 'index.html'));
await fs.copy(path.join(rootDir, 'miniapps'), path.join(distDir, 'miniapps'), {
  overwrite: true,
});

await copyIdbVendor(distDir);
await ensureImportMap(distDir);

if (await fs.pathExists(docsDir)) {
  await copyIdbVendor(docsDir);
  await ensureImportMap(docsDir);
}
