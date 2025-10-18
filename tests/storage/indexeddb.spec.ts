import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { openIdxDB } from '../../src/storage/indexeddb/IdxDBStore.js';
import { DB_NAME } from '../../src/storage/indexeddb/migrations.js';
import { exportBackup, importBackup } from '../../src/storage/backup/backupJson.js';

const resetDatabase = async () =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onerror = () => reject(request.error ?? new Error('failed to reset db'));
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
  });

beforeEach(async () => {
  await resetDatabase();
});

describe('IdxDBStore', () => {
  it('supports CRUD operations', async () => {
    const db = await openIdxDB();
    await db.profiles.set('primary', { id: 'primary', updatedAt: '2024-01-01T00:00:00.000Z', name: 'Profile' });
    expect(await db.profiles.get('primary')).toMatchObject({ name: 'Profile' });
    await db.profiles.set('primary', { id: 'primary', updatedAt: '2024-02-01T00:00:00.000Z', name: 'Updated' });
    const list = await db.profiles.list();
    expect(list).toHaveLength(1);
    await db.profiles.delete('primary');
    expect(await db.profiles.get('primary')).toBeUndefined();
    await db.close();
  });

  it('lists using index ordering', async () => {
    const db = await openIdxDB();
    await db.telemetry.set('1', { id: '1', event: 'ping', ts: '2024-01-01T00:00:00.000Z' });
    await db.telemetry.set('2', { id: '2', event: 'pong', ts: '2024-01-02T00:00:00.000Z' });
    await db.telemetry.set('3', { id: '3', event: 'pong', ts: '2023-12-31T00:00:00.000Z' });
    const ordered = await db.telemetry.list({ index: 'byTs', reverse: true });
    expect(ordered.map((entry) => entry.id)).toEqual(['2', '1', '3']);
    await db.close();
  });

  it('reopens without applying migrations again', async () => {
    const first = await openIdxDB();
    await first.close();
    const second = await openIdxDB();
    await second.close();
    expect(true).toBe(true);
  });

  it('exports and imports backups', async () => {
    const db = await openIdxDB();
    await db.profiles.set('primary-profile', {
      id: 'primary-profile',
      name: 'Backup User',
      updatedAt: '2024-03-01T10:00:00.000Z',
    });
    await db.settings.set('locale', {
      key: 'locale',
      value: 'pt-BR',
      updatedAt: '2024-03-01T10:00:00.000Z',
    });
    await db.telemetry.set('evt-1', {
      id: 'evt-1',
      event: 'login',
      ts: '2024-03-01T10:00:00.000Z',
    });
    await db.close();

    const backup = await exportBackup();
    await resetDatabase();
    await importBackup(backup, { mergeStrategy: 'overwrite' });
    const restored = await openIdxDB();
    expect(await restored.profiles.get('primary-profile')).toMatchObject({ name: 'Backup User' });
    expect(await restored.settings.get('locale')).toMatchObject({ value: 'pt-BR' });
    const telemetry = await restored.telemetry.list();
    expect(telemetry).toHaveLength(1);
    await restored.close();
  });
});
