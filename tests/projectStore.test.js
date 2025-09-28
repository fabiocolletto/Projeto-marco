import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const MODULE_PATH = resolve('shared/projectStore.js');
let importCounter = 0;
let factory;

async function freshStore() {
  const url = new URL(`${pathToFileURL(MODULE_PATH).href}?v=${importCounter++}`);
  return import(url);
}

function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  factory = new FDBFactory();
  globalThis.indexedDB = factory;
  await deleteDatabase('marco_db');
});

afterEach(async () => {
  await deleteDatabase('marco_db');
  if (factory && typeof factory.close === 'function') {
    factory.close();
  }
  factory = undefined;
});

test('createProject seeds a blank event and updates the in-memory index', async () => {
  const store = await freshStore();
  await store.init();
  const { meta, payload } = await store.createProject();

  assert.equal(payload.evento.titulo, '');
  assert.equal(payload.evento.anfitriao.nome, '');
  assert.equal(payload.cerimonialista.nomeCompleto, '');
  assert.equal(store.listProjects().length, 1);
  assert.equal(store.listProjects()[0].id, meta.id);
});

test('updateProject normalizes legacy name field and refreshes the index timestamp', async () => {
  const store = await freshStore();
  await store.init();
  const { meta } = await store.createProject({ evento: { nome: 'Casamento Ana & Bruno' } });
  const before = store.listProjects()[0].updatedAt;

  await new Promise((resolve) => setTimeout(resolve, 2));
  const updated = await store.updateProject(meta.id, { evento: { resumo: 'Cerimônia ao ar livre' } });

  assert.equal(updated.evento.titulo, 'Casamento Ana & Bruno');
  const [entry] = store.listProjects();
  assert.equal(entry.id, meta.id);
  assert.ok(entry.updatedAt >= before, 'updatedAt should advance after update');
});

test('importProject persists provided data and returns the stored payload', async () => {
  const store = await freshStore();
  await store.init();
  const mockData = {
    cerimonialista: { nomeCompleto: 'Luiza Cerimonial', telefone: '(11) 99999-9999', redeSocial: '@luiza' },
    evento: {
      titulo: 'Formatura 2025',
      data: '2025-02-15',
      hora: '20:00',
      local: 'Espaço Jardins',
      resumo: 'Celebração dos formandos de 2025',
      anfitriao: { nome: 'Colégio Horizonte', contato: 'contato@horizonte.com', observacao: 'Chegar 1h antes' }
    },
    lista: [{ id: 'a1', nomeCompleto: 'Convidado 1', status: 'pendente' }]
  };

  const { meta, payload } = await store.importProject(mockData);
  assert.equal(payload.evento.titulo, 'Formatura 2025');
  const stored = await store.getProject(meta.id);
  assert.equal(stored.evento.titulo, 'Formatura 2025');
  assert.equal(stored.evento.anfitriao.nome, 'Colégio Horizonte');
  assert.deepEqual(stored.lista, mockData.lista);
});
