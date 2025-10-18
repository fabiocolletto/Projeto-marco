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
