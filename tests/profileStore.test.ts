import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryProfileStore, createBrowserProfileStore } from '../src/storage/profileStore.js';
import type { UserProfile } from '../src/core/types.js';

const sampleProfile: UserProfile = {
  userId: 'user-1',
  nome: 'Fulana',
  email: 'fulana@example.com',
  telefoneHash: 'hash',
  idiomaPreferido: 'pt-BR',
  tema: {
    temaPreferido: 'dark',
    seguirSistema: true,
  },
  status: 'ativo',
  role: 'admin',
  dependentes: [],
  sincronizacao: {
    habilitado: false,
    destinos: [],
  },
};

describe('profile store', () => {
  it('persists profile in memory', () => {
    const store = new MemoryProfileStore();
    expect(store.load()).toBeUndefined();
    store.save(sampleProfile);
    expect(store.load()).toEqual(sampleProfile);
    store.clear();
    expect(store.load()).toBeUndefined();
  });

  describe('browser store', () => {
    let storage: Storage;

    beforeEach(() => {
      const state = new Map<string, string>();
      storage = {
        getItem: (key: string) => state.get(key) ?? null,
        setItem: (key: string, value: string) => {
          state.set(key, value);
        },
        removeItem: (key: string) => {
          state.delete(key);
        },
        clear: () => state.clear(),
        key: (index: number) => Array.from(state.keys())[index] ?? null,
        length: 0,
      } as Storage;
    });

    it('saves and retrieves profile JSON', () => {
      const store = createBrowserProfileStore('profile', storage);
      store.save(sampleProfile);
      expect(store.load()).toEqual(sampleProfile);
    });

    it('clears invalid JSON automatically', () => {
      storage.setItem('profile', '{invalid json');
      const store = createBrowserProfileStore('profile', storage);
      expect(store.load()).toBeUndefined();
      expect(storage.getItem('profile')).toBeNull();
    });
  });
});
