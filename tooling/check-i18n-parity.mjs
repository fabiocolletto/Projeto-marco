#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url);
const BASE_LOCALES = ['pt-BR', 'en-US', 'es-ES'];

async function readLocale(code) {
  const filePath = path.join(ROOT.pathname, 'appbase', 'i18n', `${code}.json`);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

function flattenKeys(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) => {
    const qualified = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      return flattenKeys(value, qualified);
    }
    return [qualified];
  });
}

async function main() {
  const dictionaries = await Promise.all(BASE_LOCALES.map((code) => readLocale(code)));
  const baseKeys = flattenKeys(dictionaries[0]);
  let hasMismatch = false;

  dictionaries.slice(1).forEach((dictionary, index) => {
    const code = BASE_LOCALES[index + 1];
    const keys = new Set(flattenKeys(dictionary));
    const missing = baseKeys.filter((key) => !keys.has(key));
    if (missing.length > 0) {
      hasMismatch = true;
      console.error(`[i18n] ${code} está sem ${missing.length} chave(s):`);
      missing.forEach((key) => console.error(` - ${key}`));
    }
  });

  if (hasMismatch) {
    process.exitCode = 1;
  } else {
    console.log('[i18n] Paridade mínima OK');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
