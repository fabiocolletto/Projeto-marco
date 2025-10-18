import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createMiniApp } from '../../scripts/create-miniapp.js';

const MINIAPPS_DIR = path.resolve('miniapps');
const REGISTRY_PATH = path.join(MINIAPPS_DIR, 'registry.json');

let originalRegistry: string;

const readRegistry = async () => JSON.parse(await readFile(REGISTRY_PATH, 'utf-8')) as {
  miniapps: Array<{ id: string; name: string }>;
};

beforeAll(async () => {
  originalRegistry = await readFile(REGISTRY_PATH, 'utf-8');
});

afterAll(async () => {
  await rm(path.join(MINIAPPS_DIR, 'TestMiniApp'), { force: true, recursive: true });
  await writeFile(REGISTRY_PATH, originalRegistry, 'utf-8');
});

afterEach(async () => {
  await rm(path.join(MINIAPPS_DIR, 'TestMiniApp'), { force: true, recursive: true });
  await writeFile(REGISTRY_PATH, originalRegistry, 'utf-8');
});

describe('createMiniApp CLI', () => {
  it('creates files and updates registry alphabetically', async () => {
    await createMiniApp('TestMiniApp', { admin: false, visible: true });
    await expect(stat(path.join(MINIAPPS_DIR, 'TestMiniApp', 'manifest.json'))).resolves.toBeTruthy();
    const registry = await readRegistry();
    const entry = registry.miniapps.find((item) => item.id === 'miniapp-test-mini-app');
    expect(entry).toBeTruthy();
    const sorted = registry.miniapps.map((item) => item.name);
    const sortedCopy = [...sorted].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    expect(sorted).toEqual(sortedCopy);
  });

  it('is idempotent when running twice', async () => {
    await createMiniApp('TestMiniApp', { admin: false, visible: true });
    await createMiniApp('TestMiniApp', { admin: false, visible: true });
    const registry = await readRegistry();
    const occurrences = registry.miniapps.filter((item) => item.id === 'miniapp-test-mini-app');
    expect(occurrences).toHaveLength(1);
  });
});
