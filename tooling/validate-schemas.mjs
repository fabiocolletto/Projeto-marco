#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = new URL('..', import.meta.url);

async function readJson(relativePath) {
  const absolute = path.join(ROOT.pathname, relativePath);
  const content = await fs.readFile(absolute, 'utf-8');
  return JSON.parse(content);
}

async function loadSchemas() {
  const schemasDir = path.join(ROOT.pathname, 'appbase', 'schemas');
  const entries = await fs.readdir(schemasDir);
  const schemas = [];
  for (const entry of entries) {
    if (!entry.endsWith('.schema.json')) continue;
    const schema = await readJson(path.join('appbase', 'schemas', entry));
    schemas.push(schema);
  }
  return schemas;
}

async function main() {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  const schemas = await loadSchemas();
  schemas.forEach((schema) => ajv.addSchema(schema));

  const registry = await readJson(path.join('appbase', 'registry', 'miniapps.json'));
  const registryValidator = ajv.getSchema('https://miniapp-base.local/schemas/miniapps.schema.json');
  if (!registryValidator) {
    throw new Error('miniapps.schema.json not registered');
  }
  if (!registryValidator(registry)) {
    console.error('[schema] miniapps.json invalid', registryValidator.errors);
    process.exitCode = 1;
  }

  const localesDir = path.join(ROOT.pathname, 'appbase', 'i18n');
  const localeFiles = await fs.readdir(localesDir);
  const i18nValidator = ajv.getSchema('https://miniapp-base.local/schemas/i18n.schema.json');
  if (!i18nValidator) {
    throw new Error('i18n.schema.json not registered');
  }
  for (const file of localeFiles) {
    if (!file.endsWith('.json')) continue;
    const dictionary = await readJson(path.join('appbase', 'i18n', file));
    if (!i18nValidator(dictionary)) {
      console.error(`[schema] ${file} inválido`, i18nValidator.errors);
      process.exitCode = 1;
    }
  }

  if (process.exitCode) {
    throw new Error('Schema validation failed');
  }
  console.log('[schema] All schemas compiled and data validated');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
