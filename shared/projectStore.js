// shared/projectStore.js (v1)
// IndexedDB para múltiplos eventos. Sem migração (ainda).

const DB_NAME = "marco_db";                  // banco
const DB_VER  = 1;                           // versão do IndexedDB (não confundir com schema do payload)
const STORE   = "kv";                        // objectStore único
const INDEX_KEY = "ac:index:v1";             // índice de projetos
const KEY = id => `ac:project:${id}:v1`;     // chave de cada projeto
const SCHEMA_VERSION = 1;                    // << nosso schema inicial

const now  = () => Date.now();
const uid  = () => crypto.randomUUID();
const deep = o => JSON.parse(JSON.stringify(o));

// ---------- IndexedDB minimal ----------
function openDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
function withStore(mode, cb){
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const out = cb(store);
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
  }));
}
function kvGet(key){
  return withStore("readonly", s => new Promise((res, rej) => {
    const r = s.get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
}
function kvSet(key, val){
  return withStore("readwrite", s => new Promise((res, rej) => {
    const r = s.put(val, key); r.onsuccess = () => res(); r.onerror = () => rej(r.error);
  }));
}
function kvDel(key){
  return withStore("readwrite", s => new Promise((res, rej) => {
    const r = s.delete(key); r.onsuccess = () => res(); r.onerror = () => rej(r.error);
  }));
}

// ---------- Shape inicial (v1) ----------
function ensureShape(p){
  // Garante que o objeto tenha o "formato v1" — útil para robustez, mas não faz migração incremental.
  p ||= {};
  p.schemaVersion = SCHEMA_VERSION; // fixa v1
  p.cerimonialista ||= { nomeCompleto:"", telefone:"", redeSocial:"" };

  // Mantém endereco/anfitriao como OBJETOS (não strings)
  p.evento ||= {};
  // Compatibilidade com versões anteriores que usavam "nome" como título
  if (p.evento.nome && !p.evento.titulo) p.evento.titulo = p.evento.nome;
  p.evento.titulo ||= "";
  p.evento.data ||= "";
  p.evento.hora ||= "";
  p.evento.local ||= "";
  if (typeof p.evento.endereco !== "object" || p.evento.endereco === null) p.evento.endereco = {};
  if (typeof p.evento.anfitriao !== "object" || p.evento.anfitriao === null) p.evento.anfitriao = {};

  p.lista ||= [];
  p.tipos ||= [];
  p.modelos ||= {};
  p.vars ||= {};
  return p;
}
function toMeta(p){
  return { id: p.id, nome: p.evento?.titulo || p.evento?.nome || "Sem nome", updatedAt: now() };
}

// ---------- Cache do índice ----------
let indexCache = null;

// ---------- API ----------
export async function init(){
  indexCache = (await kvGet(INDEX_KEY)) || [];
  return listProjects();
}
export function listProjects(){
  const idx = indexCache || [];
  return [...idx].sort((a,b)=>b.updatedAt - a.updatedAt);
}
export async function createProject(data = {}){
  const id = uid();
  const payload = ensureShape({
    id,
    cerimonialista: data.cerimonialista || { nomeCompleto:"", telefone:"", redeSocial:"" },
    // aqui também garantimos objetos para endereco/anfitriao
    evento: data.evento || { titulo:"", data:"", hora:"", local:"", endereco:{}, anfitriao:{} },
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
export async function getProject(id){
  const raw = await kvGet(KEY(id));
  if (!raw) return null;
  const shaped = ensureShape(raw);               // segura contra campos faltando / tipos divergentes
  if (JSON.stringify(shaped) !== JSON.stringify(raw)) await kvSet(KEY(id), shaped);
  return deep(shaped);
}
export async function updateProject(id, partial){
  const curr = await kvGet(KEY(id));
  if (!curr) throw new Error("Projeto não encontrado");
  const next = ensureShape({ ...curr, ...deep(partial) });
  await kvSet(KEY(id), next);

  const idx = indexCache || (await kvGet(INDEX_KEY)) || [];
  const i = idx.findIndex(x => x.id === id);
  if (i >= 0) idx[i] = { ...idx[i], nome: next.evento?.titulo || next.evento?.nome || idx[i].nome, updatedAt: now() };
  indexCache = idx; await kvSet(INDEX_KEY, idx);

  return deep(next);
}
export async function deleteProject(id){
  await kvDel(KEY(id));
  const idx = indexCache || (await kvGet(INDEX_KEY)) || [];
  indexCache = idx.filter(x => x.id !== id); await kvSet(INDEX_KEY, indexCache);
}
export async function exportProject(id){
  const p = await getProject(id); if (!p) throw new Error("Projeto não encontrado");
  return JSON.stringify(p, null, 2);
}
export async function importProject(jsonOrObj){
  const o = typeof jsonOrObj === "string" ? JSON.parse(jsonOrObj) : jsonOrObj;
  const { cerimonialista, evento, lista, tipos, modelos, vars } = o || {};
  return createProject({ cerimonialista, evento, lista, tipos, modelos, vars });
}
