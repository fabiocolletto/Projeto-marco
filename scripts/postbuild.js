import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

await fs.ensureDir(distDir);

await fs.copy(path.join(rootDir, 'index.html'), path.join(distDir, 'index.html'));
await fs.copy(path.join(rootDir, 'miniapps'), path.join(distDir, 'miniapps'), {
  overwrite: true,
});

const vendorSourceFile = path.join(rootDir, 'node_modules', 'idb', 'build', 'index.js');
const vendorTargetFile = path.join(distDir, 'vendor', 'idb', 'index.js');
if (await fs.pathExists(vendorSourceFile)) {
  await fs.ensureDir(path.dirname(vendorTargetFile));
  await fs.copyFile(vendorSourceFile, vendorTargetFile);
}

const indexPath = path.join(distDir, 'index.html');
if (await fs.pathExists(indexPath)) {
  const html = await fs.readFile(indexPath, 'utf-8');
  const hasImportMap = /<script type="importmap">[\s\S]*?"idb"/m.test(html);
  const nextHtml = hasImportMap
    ? html
    : html.replace(
        '</head>',
        `  <script type="importmap">\n    {\n      "imports": {\n        "idb": "./vendor/idb/index.js"\n      }\n    }\n  </script>\n</head>`,
      );
  if (nextHtml !== html) {
    await fs.writeFile(indexPath, nextHtml, 'utf-8');
  }
}
