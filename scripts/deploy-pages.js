import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const docsDir = path.join(rootDir, 'docs');

if (!(await fs.pathExists(distDir))) {
  throw new Error('Diretório dist não encontrado. Execute npm run build antes de publicar.');
}

await fs.ensureDir(docsDir);
await fs.emptyDir(docsDir);
await fs.copy(distDir, docsDir);

const indexPath = path.join(docsDir, 'index.html');
let html = await fs.readFile(indexPath, 'utf-8');

const baseHref = process.env.BASE_HREF;
if (baseHref && !html.includes('<base')) {
  html = html.replace(
    '<title>AppBase</title>',
    `<title>AppBase</title>\n    <base href="${baseHref}">`,
  );
}

const publicAdmin = String(process.env.PUBLIC_ADMIN ?? '').toLowerCase() === 'true';
const configPattern = /<script id="app-config" type="application\/json">([\s\S]*?)<\/script>/;
const match = configPattern.exec(html);
if (match) {
  try {
    const current = JSON.parse(match[1]);
    const nextConfig = {
      publicAdmin,
      baseHref: baseHref ?? current?.baseHref ?? '/',
    };
    const replacement = `<script id="app-config" type="application/json">${JSON.stringify(nextConfig)}</script>`;
    html = `${html.slice(0, match.index)}${replacement}${html.slice(match.index + match[0].length)}`;
  } catch (error) {
    console.warn('Não foi possível atualizar configuração embutida', error);
  }
}

await fs.writeFile(indexPath, html, 'utf-8');
await fs.copy(indexPath, path.join(docsDir, '404.html'));

console.log('✅ Conteúdo publicado em /docs');
