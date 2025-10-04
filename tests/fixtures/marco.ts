import { expect, test as base } from '@playwright/test';

import { loadWeddingFixture } from './wedding.js';
import type { WeddingFixture } from './types.js';

export type { WeddingFixture } from './types.js';

export const test = base.extend<{ wedding: WeddingFixture }>({
  wedding: async ({}, use) => {
    const fixture = await loadWeddingFixture();
    const clone = typeof structuredClone === 'function'
      ? structuredClone(fixture)
      : JSON.parse(JSON.stringify(fixture)) as WeddingFixture;
    await use(clone);
  },
});

export { expect };
