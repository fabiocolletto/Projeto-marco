import { exportBackup, importBackup } from '../../src/storage/backup/backupJson.js';
import { openIdxDB } from '../../src/storage/indexeddb/IdxDBStore.js';

const preferencesRoot = document.getElementById('preferences');
const telemetryTable = document.getElementById('telemetry-table');
const exportButton = document.getElementById('export-backup');
const importInput = document.getElementById('import-backup');

const formatBoolean = (value) => (value ? 'Sim' : 'Não');

const renderPreferences = (profile) => {
  if (!preferencesRoot) return;
  preferencesRoot.innerHTML = '';
  const entries = [
    ['Idioma', profile?.idiomaPreferido ?? '—'],
    ['Tema', profile?.tema?.temaPreferido ?? '—'],
    ['Seguir sistema', formatBoolean(profile?.tema?.seguirSistema ?? false)],
  ];
  for (const [label, value] of entries) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = typeof value === 'string' ? value : String(value);
    preferencesRoot.append(dt, dd);
  }
};

const renderTelemetry = (events) => {
  if (!telemetryTable) return;
  telemetryTable.innerHTML = '';
  const counts = new Map();
  for (const event of events ?? []) {
    const key = event?.event ?? 'desconhecido';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [name, total] of entries) {
    const tr = document.createElement('tr');
    const eventCell = document.createElement('td');
    eventCell.textContent = name;
    const countCell = document.createElement('td');
    countCell.textContent = String(total);
    tr.append(eventCell, countCell);
    telemetryTable.append(tr);
  }
};

const refresh = async () => {
  const db = await openIdxDB();
  try {
    const profile = await db.profiles.get('primary-profile');
    renderPreferences(profile);
    const telemetry = await db.telemetry.list({ index: 'byTs', limit: 200, reverse: true });
    renderTelemetry(telemetry);
  } catch (error) {
    console.error('Falha ao carregar dados do painel', error);
  } finally {
    await db.close();
  }
};

const triggerDownload = (fileName, content) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

exportButton?.addEventListener('click', async () => {
  try {
    const backup = await exportBackup();
    triggerDownload(`appbase-backup-${new Date().toISOString()}.json`, JSON.stringify(backup, null, 2));
  } catch (error) {
    console.error('Falha ao exportar backup', error);
  }
});

importInput?.addEventListener('change', async (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    await importBackup(payload, { mergeStrategy: 'keep-newer' });
    await refresh();
    alert('Backup importado com sucesso.');
  } catch (error) {
    console.error('Falha ao importar backup', error);
    alert('Não foi possível importar o backup. Verifique o arquivo.');
  } finally {
    event.target.value = '';
  }
});

refresh();
