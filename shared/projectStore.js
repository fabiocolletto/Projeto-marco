// projectStore.js
// Persistência local (IndexedDB) para múltiplos eventos do Assistente Ceremonial.
// Zero dependências externas. Usar com <script type="module"> no navegador.

// ===== Config e util =====
const DB_NAME = "marco_db";                         // nome do banco IndexedDB
const DB_VER  = 1;                                  // versão do schema do DB
const STORE   = "kv";                               // um único objectStore "kv"
const INDEX_KEY = "ac:index:v1";                    // chave do índice de projetos
const KEY = id => `ac:project:${id}:v1`;            // chave por projeto
const CURRENT_SCHEMA = 1;                           // versão do payload salvo

const now = () => Date.now();                       // timestamp simples
const uid = () => crypto.randomUUID();              // id único por projeto
const deep = o => JSON.parse(JSON.stringify(o));    // cópia segura (serializa)

// ===== Abertura do IndexedDB =====
function openDB() {                                  // abre (ou cria) a base
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);     // abre DB (com upgrade se preciso)
    req.onupgradeneeded = () => {                    // roda quando a versão sobe
      const db = req.result;                         // instância IDBDatabase
      if (!db.objectStoreNames.contains(STORE)) {    // se não existir o store
        db.createObjectStore(STORE);                 // cria objectStore "kv"
      }
    };
    req.onsuccess = () => resolve(req.result);       // ok: devolve db
    req.onerror   = () => reject(req.error);         // erro: rejeita
  });
}

function withStore(mode, cb) {                        // helper p/ transações
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);          // inicia transação
    const store = tx.objectStore(STORE);             // pega objectStore
    const res = cb(store);                           // executa callback
    tx.oncomplete = () => resolve(res);              // resolve ao concluir
    tx.onerror = () => reject(tx.error);             // erro na tx
  }));
}

// ===== Operações KV (get/set/del) =====
function kvGet(key) {                                 // lê por chave
  return withStore("readonly", s => new Promise((res, rej) => {
    const r = s.get(key);                             // GET
    r.onsuccess = () => res(r.result);                // devolve valor (ou undefined)
    r.onerror   = () => rej(r.error);                 // erro
  }));
}
function kvSet(key, value) {                          // grava por chave
  return withStore("readwrite", s => new Promise((res, rej) => {
    const r = s.put(value, key);                      // PUT/UPSERT
    r.onsuccess = () => res();                        // ok
    r.onerror   = () => rej(r.error);                 // erro
  }));
}
function kvDel(key) {                                 // remove por chave
  return withStore("readwrite", s => new Promise((res, rej) => {
    const r = s.delete(key);                          // DELETE
    r.onsuccess = () => res();                        // ok
    r.onerror   = () => rej(r.error);                 // erro
  }));
}

// ===== Migração de schema do payload =====
function migrate(p) {                                  // garante formato atual
  if (!p || typeof p !== "object") return p;           // sanidade
  if (typeof p.schemaVersion !== "number") p.schemaVersion = 0; // legado

  while (p.schemaVersion < CURRENT_SCHEMA) {           // sobe versões aos poucos
    const to = p.schemaVersion + 1;                    // próxima versão
    if (to === 1) {                                    // → v1: shape mínimo
      p.evento ||= { nome:"", data:"", hora:"", local:"", endereco:"", anfitriao:"" }; // campos base
      p.lista ||= []; p.tipos ||= []; p.modelos ||= {}; p.vars ||= {};                 // coleções base
    }
    p.schemaVersion = to;                              // avança carimbo de versão
  }
  return p;                                            // retorna migrado
}

function toMeta(p) {                                   // extrai metadados p/ índice
  return { id: p.id, nome: p.evento?.nome || "Sem nome", updatedAt: now() }; // meta mínima
}

// ===== Cache em memória do índice =====
let indexCache = null;                                 // guarda índice na RAM

// ===== API pública =====
export async function init() {                          // inicializa store (carrega índice)
  indexCache = (await kvGet(INDEX_KEY)) || [];          // lê índice salvo (ou cria vazio)
  return listProjects();                                // devolve lista ordenada
}

export function listProjects() {                        // lista metadados (ordenados)
  const idx = indexCache || [];                         // usa cache se existir
  return [...idx].sort((a,b)=>b.updatedAt - a.updatedAt); // ordena por updatedAt desc
}

export async function createProject(data = {}) {        // cria novo projeto
  const id = uid();                                     // gera id
  const payload = migrate({                             // monta payload v1
    schemaVersion: CURRENT_SCHEMA, id,
    evento: data.evento || { nome:"", data:"", hora:"", local:"", endereco:"", anfitriao:"" },
    lista: data.lista || [], tipos: data.tipos || [], modelos: data.modelos || {}, vars: data.vars || {}
  });
  await kvSet(KEY(id), payload);                        // grava payload
  const meta = toMeta(payload);                         // cria metadado
  const idx = indexCache || (await kvGet(INDEX_KEY)) || []; // lê índice atual
  idx.push(meta);                                       // adiciona novo item
  indexCache = idx;                                     // atualiza cache
  await kvSet(INDEX_KEY, idx);                          // persiste índice
  return { meta, payload: deep(payload) };              // retorna cópia
}

export async function getProject(id) {                  // lê projeto pelo id
  const raw = await kvGet(KEY(id));                     // pega do IndexedDB
  if (!raw) return null;                                // se não existir
  const m = migrate(raw);                               // migra se necessário
  if (m !== raw) await kvSet(KEY(id), m);               // persiste migração
  return deep(m);                                       // devolve cópia segura
}

export async function updateProject(id, partial) {      // atualiza projeto parcialmente
  const curr = await kvGet(KEY(id));                    // lê atual
  if (!curr) throw new Error("Projeto não encontrado"); // valida id
  const next = migrate({ ...curr, ...deep(partial) });  // mescla + migra
  await kvSet(KEY(id), next);                           // salva payload

  // atualiza índice (nome + updatedAt)
  const idx = indexCache || (await kvGet(INDEX_KEY)) || []; // lê índice
  const i = idx.findIndex(x => x.id === id);            // acha posição
  if (i >= 0) idx[i] = { ...idx[i], nome: next.evento?.nome || idx[i].nome, updatedAt: now() }; // atualiza meta
  indexCache = idx;                                     // atualiza cache
  await kvSet(INDEX_KEY, idx);                          // persiste índice

  return deep(next);                                    // retorna cópia do novo estado
}

export async function deleteProject(id) {               // exclui projeto
  await kvDel(KEY(id));                                 // remove payload
  const idx = indexCache || (await kvGet(INDEX_KEY)) || []; // lê índice
  indexCache = idx.filter(x => x.id !== id);            // filtra removendo meta
  await kvSet(INDEX_KEY, indexCache);                   // persiste índice
}

export async function exportProject(id) {               // exporta JSON string
  const p = await getProject(id);                       // lê projeto
  if (!p) throw new Error("Projeto não encontrado");    // valida
  return JSON.stringify(p, null, 2);                    // pretty JSON p/ download
}

export async function importProject(jsonOrObj) {        // importa projeto (gera novo id)
  const o = typeof jsonOrObj === "string" ? JSON.parse(jsonOrObj) : jsonOrObj; // aceita string/obj
  const { evento, lista, tipos, modelos, vars } = o || {}; // extrai campos conhecidos
  return createProject({ evento, lista, tipos, modelos, vars });               // cria novo projeto
}
