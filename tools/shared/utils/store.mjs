// tools/shared/utils/store.mjs
// Abstrações leves sobre a API do projectStore.

const clone = (obj) => {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
};

export async function getProject(store, id) {
  if (!store || typeof store.getProject !== 'function' || !id) return null;
  return await store.getProject(id);
}

export async function updateProject(store, id, mutator, { ensure } = {}) {
  if (!store || typeof store.updateProject !== 'function' || !id) return null;
  const current = (await getProject(store, id)) || {};
  const draft = clone(current);
  if (ensure) ensure(draft);
  if (typeof mutator === 'function') mutator(draft, current);
  draft.updatedAt = Date.now();
  await store.updateProject(id, draft);
  return await getProject(store, id);
}

export async function upsertProject(store, id, payload) {
  if (!store || typeof store.updateProject !== 'function' || !id) return null;
  const next = clone(payload || {});
  next.updatedAt = Date.now();
  await store.updateProject(id, next);
  return await getProject(store, id);
}
