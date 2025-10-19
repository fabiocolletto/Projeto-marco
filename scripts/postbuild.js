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

const vendorSource = path.join(rootDir, 'node_modules', 'idb', 'build');
const vendorTarget = path.join(distDir, 'vendor', 'idb');
if (await fs.pathExists(vendorSource)) {
  await fs.ensureDir(vendorTarget);
  await fs.copy(vendorSource, vendorTarget, { overwrite: true });
}

const indexPath = path.join(distDir, 'index.html');
if (await fs.pathExists(indexPath)) {
  const html = await fs.readFile(indexPath, 'utf-8');
  const nextHtml = html.replace(
    './node_modules/idb/build/index.js',
    './vendor/idb/index.js',
  );
  if (nextHtml !== html) {
    await fs.writeFile(indexPath, nextHtml, 'utf-8');
  }
}
