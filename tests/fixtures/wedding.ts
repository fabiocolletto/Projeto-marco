import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { WeddingFixture } from './types';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const weddingFixturePath = resolve(moduleDir, 'data', 'casamento-evento.json');

let cachedWedding: WeddingFixture | null = null;

export async function loadWeddingFixture(): Promise<WeddingFixture> {
  if (cachedWedding) {
    return cachedWedding;
  }

  const raw = await readFile(weddingFixturePath, 'utf-8');
  cachedWedding = JSON.parse(raw) as WeddingFixture;
  return cachedWedding;
}
