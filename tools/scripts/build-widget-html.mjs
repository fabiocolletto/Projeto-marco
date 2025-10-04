#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const widgetDistDir = path.resolve(repoRoot, 'apps/web/dist');
const outputDir = path.resolve(repoRoot, 'dist');
const cssPath = path.join(widgetDistDir, 'app-base-widget.css');
const jsPath = path.join(widgetDistDir, 'app-base-widget.js');

const indent = (value, spaces = 4) => {
  const pad = ' '.repeat(spaces);
  return value
    .split('\n')
    .map((line) => pad + line)
    .join('\n');
};

try {
  const [cssSource, jsSource] = await Promise.all([
    readFile(cssPath, 'utf8'),
    readFile(jsPath, 'utf8')
  ]);

  await mkdir(outputDir, { recursive: true });

  const sanitizedScript = jsSource.replace(/<\/(script)/gi, '<\\/$1');
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
${indent(cssSource.trim(), 6)}
    </style>
  </head>
  <body>
    <div id="app-base-widget-root" class="app-base-widget"></div>
    <script type="module">
${indent(sanitizedScript.trim(), 6)}
    </script>
  </body>
</html>
`;

  const outputPath = path.join(outputDir, 'app-base-widget.html');
  await writeFile(outputPath, html, 'utf8');
  console.log(`Widget bundle salvo em ${path.relative(repoRoot, outputPath)}`);
} catch (error) {
  console.error('[build-widget-html] Falha ao gerar HTML do widget.');
  console.error(error);
  process.exitCode = 1;
}
