import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { exportBackup } from '../src/storage/backup/backupJson.js';

const [, , outputArg] = process.argv;
const output = outputArg
  ? path.resolve(process.cwd(), outputArg)
  : path.resolve(process.cwd(), `appbase-backup-${Date.now()}.json`);

exportBackup()
  .then(async (payload) => {
    await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
    console.log(`Backup exportado para ${output}`);
  })
  .catch((error) => {
    console.error('Falha ao exportar backup', error);
    process.exit(1);
  });
