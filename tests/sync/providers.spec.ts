import { afterEach, describe, expect, it } from 'vitest';
import { resolveSyncProvider } from '../../src/sync/SyncProvider.js';
import { DriveStub } from '../../src/sync/providers/DriveStub.js';
import { OneDriveStub } from '../../src/sync/providers/OneDriveStub.js';

const createStorage = () => {
  const state = new Map<string, string>();
  return {
    getItem: (key: string) => state.get(key) ?? null,
    setItem: (key: string, value: string) => {
      state.set(key, value);
    },
    removeItem: (key: string) => {
      state.delete(key);
    },
    clear: () => state.clear(),
    key: (index: number) => Array.from(state.keys())[index] ?? null,
    get length() {
      return state.size;
    },
  } satisfies Storage;
};

describe('Sync provider stubs', () => {
  afterEach(() => {
    delete process.env.SYNC_PROVIDER;
  });

  it('pushes and pulls data using DriveStub', async () => {
    const storage = createStorage();
    const drive = new DriveStub(storage);
    expect(drive.isConfigured()).toBe(true);
    const first = await drive.push({ foo: 'bar' });
    expect(first.ok).toBe(true);
    const second = await drive.push({ foo: 'baz' });
    expect(second.rev).not.toEqual(first.rev);
    const pulled = await drive.pull();
    expect(pulled.ok).toBe(true);
    expect(pulled.backup).toEqual({ foo: 'baz' });
  });

  it('pushes and pulls data using OneDriveStub', async () => {
    const storage = createStorage();
    const drive = new OneDriveStub(storage);
    expect(drive.isConfigured()).toBe(true);
    const first = await drive.push({ foo: 'bar' });
    const second = await drive.push({ foo: 'baz' });
    expect(second.rev).not.toEqual(first.rev);
    const pulled = await drive.pull();
    expect(pulled.backup).toEqual({ foo: 'baz' });
  });

  it('resolves providers from env', () => {
    process.env.SYNC_PROVIDER = 'drive';
    expect(resolveSyncProvider()).toBeInstanceOf(DriveStub);
    process.env.SYNC_PROVIDER = 'onedrive';
    expect(resolveSyncProvider()).toBeInstanceOf(OneDriveStub);
    process.env.SYNC_PROVIDER = 'none';
    expect(resolveSyncProvider()).toBeUndefined();
  });
});
