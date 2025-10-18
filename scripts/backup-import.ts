import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { importBackup } from '../src/storage/backup/backupJson.js';

const [, , fileArg, ...rest] = process.argv;

if (!fileArg) {
  console.error('Uso: npm run backup:import <arquivo.json> [-- --merge=keep-newer|overwrite]');
  process.exit(1);
}

const options = rest.reduce<{ merge: 'keep-newer' | 'overwrite' }>((acc, arg) => {
  if (!arg.startsWith('--')) return acc;
  const [key, raw] = arg.slice(2).split('=');
  if (key === 'merge' && (raw === 'keep-newer' || raw === 'overwrite')) {
    acc.merge = raw;
  }
  return acc;
}, { merge: 'keep-newer' });

const resolvedPath = path.resolve(process.cwd(), fileArg);

readFile(resolvedPath, 'utf-8')
  .then((raw) => JSON.parse(raw))
  .then((payload) => importBackup(payload, { mergeStrategy: options.merge }))
  .then(() => {
    console.log(`Backup importado de ${resolvedPath} com merge=${options.merge}`);
  })
  .catch((error) => {
    console.error('Falha ao importar backup', error);
    process.exit(1);
  });
