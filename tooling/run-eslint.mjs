#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';

const ROOT = new URL('..', import.meta.url);

function collectGlobs() {
  const entries = [
    'appbase/**/*.js',
    'services/**/*.js',
    'scripts/**/*.js',
    'tooling/**/*.mjs'
  ];
  return entries.filter((pattern) => {
    if (!pattern.includes('/**/')) {
      return true;
    }
    const directory = pattern.split('/**/')[0];
    const absolute = path.join(ROOT.pathname, directory);
    return fs.existsSync(absolute);
  });
}

async function main() {
  const eslint = new ESLint({ errorOnUnmatchedPattern: false });
  const results = await eslint.lintFiles(collectGlobs());
  const formatter = await eslint.loadFormatter('stylish');
  const output = formatter.format(results);
  if (output) {
    console.log(output);
  }
  const hasErrors = results.some((result) => result.errorCount > 0);
  if (hasErrors) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[lint] failed', error);
  process.exitCode = 1;
});
