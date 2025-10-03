// tools/shared/core/projectStore.js (v2)
// IndexedDB para múltiplos eventos, com migração, persistência e utilidades.
// Fontes & boas práticas:
// - MDN Using IndexedDB / API: transações, onupgradeneeded, versionchange, erros
// - StorageManager.persist()/persisted(): durabilidade/persistência
// - Quotas/eviction e simulação de quota no DevTools
//
// Links (doc):
// MDN Using IndexedDB, API, Terminology
// MDN StorageManager.persist/persisted, Storage quotas/eviction
// web.dev persistent-storage / storage-for-the-web
//
// Nota: este módulo não depende de libs externas.

const DB_NAME = "marco_db";
const DB_VER  = 2; // bump de v1 -> v2 (exemplo de migração)
const STORE   = "kv";
const INDEX_KEY = "ac:index:v1";      // índice lógico (lista de projetos)
const KEY = id => `ac:project:${id}:v1`;

const SCHEMA_VERSION = 2;             // schema lógico do payload
const now  = () => Date.now();
const uid  = () => (crypto?.randomUUID ? crypto.randomUUID() : String(now()) + Math.random().toString(16).slice(2));
const deep = o => JSON.parse(JSON.stringify(o));

let _db = null;
let indexCache = null;

// ---------- Disponibilidade ----------
export function isAvailable() {
  return typeof indexedDB !== "undefined";
}

// ---------- Persistência (durabilidade) ----------
export async function ensurePersistence() {
  if (!("storage" in navigator)) return { supported: false, persisted: false };
  try {
    const already = await navigator.storage.persisted(); // true se já é persistente
    if (already) return { supported: true, persisted: true };
    const ok = await navigator.storage.persist();        // pode não pedir UI (depende do browser)
    return { supported: true, persisted: !!ok };
  } catch {
    return { supported: true, persisted: false };
  }
}

// ---------- Abertura & Migração ----------
function upgrade(db, oldVersion, newVersion) {
  // v1: criava apenas o objectStore "kv" sem keyPath (key by argument)
  // v2 (exemplo): podemos criar índices adicionais ou stores auxiliares, se necessário
  if (!db.objectStoreNames.contains(STORE)) {
    db.createObjectStore(STORE);
  }
  // Se futuramente quisermos um índice por "updatedAt", criamos aqui um store/índice dedicado.
  // Ex.: const s = db.createObjectStore("kv_by_updated", { keyPath: "id" }); s.createIndex("by_updatedAt", "updatedAt");
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);

    req.onupgradeneeded = ev => {
      const db = req.result;
      upgrade(db, ev.oldVersion || 0, ev.newVersion || DB_VER);
    };

    req.onblocked = () => {
      // Outra aba ainda com DB antigo aberto.
      console.warn("[projectStore] upgrade bloqueado por outra aba.");
    };

    req.onsuccess = () => {
      const db = req.result;

      // Se outra aba fizer upgrade, esta conexão recebe onversionchange.
      db.onversionchange = () => {
        console.warn("[projectStore] versão do banco mudou; fechando conexão.");
        try { db.close(); } catch {}
        alert?.("Uma nova versão dos dados está disponível. Recarregue a página.");
      };

      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

async function getDB() {
  if (_db) return _db;
  if (!isAvailable()) throw new Error("IndexedDB indisponível neste ambiente");
  _db = await openDB();
  return _db;
}

function withStore(mode, cb) {
  return getDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let out;
    try {
      out = cb(store);
    } catch (e) {
      reject(e);
      return;
    }
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transação abortada"));
  }));
}

function kvGet(key) {
  return withStore("readonly", s => new Promise((res, rej) => {
    const r = s.get(key);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}
function kvSet(key, val) {
  return withStore("readwrite", s => new Promise((res, rej) => {
    const r = s.put(val, key);
    r.onsuccess = () => res();
    r.onerror = () => {
      // Tratamento de cota (QuotaExceededError) — ver docs MDN/DevTools
      // https://developer.mozilla.org/.../Storage_quotas_and_eviction_criteria
      rej(r.error);
    };
  }));
}
function kvDel(key) {
  return withStore("readwrite", s => new Promise((res, rej) => {
    const r = s.delete(key);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  }));
}

// ---------- Shape (schema lógico) ----------
function ensureShape(p) {
  p ||= {};
  p.schemaVersion = SCHEMA_VERSION;
  p.cerimonialista ||= { nomeCompleto:"", telefone:"", redeSocial:"" };

  p.evento ||= { nome:"", data:"", hora:"", local:"", endereco:{}, anfitriao:{} };
  if (typeof p.evento.endereco !== "object" || p.evento.endereco === null) p.evento.endereco = {};
  if (typeof p.evento.anfitriao !== "object" || p.evento.anfitriao === null) p.evento.anfitriao = {};

  p.lista ||= [];
  p.tipos ||= [];
  p.modelos ||= {};
  p.vars ||= {};
  p.updatedAt = now();
  return p;
}
function toMeta(p) {
  return { id: p.id, nome: p.evento?.nome || "Sem nome", updatedAt: p.updatedAt || now() };
}

// ---------- API pública ----------
export async function init() {
  await getDB();
  // Tenta garantir persistência (melhor durabilidade de dados)
  try { await ensurePersistence(); } catch {}
  indexCache = (await kvGet(INDEX_KEY)) || [];
  return listProjects();
}

export function listProjects() {
  const idx = indexCache || [];
  return [...idx].sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
}

export async function createProject(data = {}) {
  const id = uid();
  const payload = ensureShape({
    id,
    cerimonialista: data.cerimonialista || { nomeCompleto:"", telefone:"", redeSocial:"" },
    evento: data.evento || { nome:"", data:"", hora:"", local:"", endereco:{}, anfitriao:{} },
    lista: data.lista || [],
    tipos: data.tipos || [],
    modelos: data.modelos || {},
    vars: data.vars || {}
  });
  await kvSet(KEY(id), payload);
  const meta = toMeta(payload);
  const idx = indexCache || (await kvGet(INDEX_KEY)) || [];
  idx.push(meta); indexCache = idx; await kvSet(INDEX_KEY, idx);
  return { meta, payload: deep(payload) };
}

export async function getProject(id) {
  const raw = await kvGet(KEY(id));
  if (!raw) return null;
  const shaped = ensureShape(raw);
  if (JSON.stringify(shaped) !== JSON.stringify(raw)) await kvSet(KEY(id), shaped);
  return deep(shaped);
}

export async function updateProject(id, partial) {
  const curr = await kvGet(KEY(id));
  if (!curr) throw new Error("Projeto não encontrado");
  const next = ensureShape({ ...curr, ...deep(partial) });
  await kvSet(KEY(id), next);

  const idx = indexCache || (await kvGet(INDEX_KEY)) || [];
  const i = idx.findIndex(x => x.id === id);
  if (i >= 0) idx[i] = { ...idx[i], nome: next.evento?.nome || idx[i].nome, updatedAt: next.updatedAt };
  indexCache = idx; await kvSet(INDEX_KEY, idx);

  return deep(next);
}

export async function deleteProject(id) {
  await kvDel(KEY(id));
  const idx = indexCache || (await kvGet(INDEX_KEY)) || [];
  indexCache = idx.filter(x => x.id !== id);
  await kvSet(INDEX_KEY, indexCache);
}

export async function exportProject(id) {
  const p = await getProject(id);
  if (!p) throw new Error("Projeto não encontrado");
  return JSON.stringify(p, null, 2);
}

export async function importProject(jsonOrObj) {
  const o = typeof jsonOrObj === "string" ? JSON.parse(jsonOrObj) : jsonOrObj;
  const { cerimonialista, evento, lista, tipos, modelos, vars } = o || {};
  return createProject({ cerimonialista, evento, lista, tipos, modelos, vars });
}

// ---------- Utilidades extras (opcionais) ----------
export async function ping() {
  // Verifica round-trip básico
  const k = "__ping__:" + uid();
  await kvSet(k, { t: now() });
  const got = await kvGet(k);
  await kvDel(k);
  return !!got;
}

export async function wipeAll() {
  // Limpa store e índice (não dropa o DB)
  const idx = indexCache || (await kvGet(INDEX_KEY)) || [];
  for (const it of idx) {
    await kvDel(KEY(it.id));
  }
  indexCache = [];
  await kvSet(INDEX_KEY, indexCache);
}

export async function backupAll() {
  // Exporta todos os projetos em um blob JSON
  const idx = (await kvGet(INDEX_KEY)) || [];
  const all = [];
  for (const it of idx) {
    const p = await kvGet(KEY(it.id));
    if (p) all.push(p);
  }
  return JSON.stringify({ version: SCHEMA_VERSION, exportedAt: now(), items: all }, null, 2);
}

export async function restoreBackup(jsonOrObj) {
  const o = typeof jsonOrObj === "string" ? JSON.parse(jsonOrObj) : jsonOrObj;
  if (!o || !Array.isArray(o.items)) throw new Error("Backup inválido");
  // cria novos IDs (evita colisão)
  for (const p of o.items) {
    await createProject({ 
      cerimonialista: p.cerimonialista, evento: p.evento, lista: p.lista, 
      tipos: p.tipos, modelos: p.modelos, vars: p.vars 
    });
  }
  return listProjects();
}

// (Opcional) fechar DB atual
export async function closeDB() {
  if (_db) { try { _db.close(); } catch {} _db = null; }
}
