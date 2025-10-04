#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..', '..');

const [command = 'unit', ...rawArgs] = process.argv.slice(2);

if (rawArgs.includes('--skip')) {
  const scope = rawArgs.find((arg) => arg.startsWith('--scope='))?.split('=')[1] ?? 'workspace';
  console.log(`[marco-tests] skipping ${command} tests for ${scope}`);
  process.exit(0);
}

function collectTestFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const absolute = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(absolute));
      continue;
    }
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name) || /\.test\.mjs$/.test(entry.name)) {
      files.push(absolute);
    }
  }
  return files;
}

switch (command) {
  case 'unit': {
    const unitDir = resolve(rootDir, 'tests', 'unit');
    let files = [];
    try {
      files = collectTestFiles(unitDir);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        console.warn('[marco-tests] Nenhum diretório de testes unitários encontrado.');
        process.exit(0);
      }
      throw error;
    }

    if (files.length === 0) {
      console.warn('[marco-tests] Nenhum teste unitário encontrado.');
      process.exit(0);
    }

    const result = spawnSync(process.execPath, ['--test', ...files], {
      stdio: 'inherit',
      cwd: rootDir,
    });

    process.exit(result.status ?? 1);
  }
  case 'visual': {
    const reporterArgs = rawArgs.length > 0 ? rawArgs : [];
    const result = spawnSync('npx', ['playwright', 'test', ...reporterArgs], {
      stdio: 'inherit',
      cwd: rootDir,
      env: { ...process.env },
    });

    process.exit(result.status ?? 1);
  }
  default: {
    console.error(`[marco-tests] Comando desconhecido: ${command}`);
    process.exit(1);
  }
}
