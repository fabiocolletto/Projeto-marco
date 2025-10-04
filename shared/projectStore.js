// projectStore.js (v2)
// IndexedDB para múltiplos eventos — agora com shape unificado (schemaVersion 2).

const DB_NAME = "marco_db";                  // banco
const DB_VER  = 1;                           // versão do IndexedDB (não confundir com schema do payload)
const STORE   = "kv";                        // objectStore único
const INDEX_KEY = "ac:index:v1";             // índice de projetos
const KEY = id => `ac:project:${id}:v1`;     // chave de cada projeto
const SCHEMA_VERSION = 2;                    // schema lógico salvo no payload
const META_VERSION = 2;                      // versão do índice cacheado

const now  = () => Date.now();
const uid  = () => crypto.randomUUID();
const deep = o => JSON.parse(JSON.stringify(o));

const ensureString = (v) => (v == null ? "" : String(v));

function ensureEndereco(val){
  if (!val || typeof val !== "object") {
    return {
      logradouro: "",
      numero: "",
      bairro: "",
      cidade: "",
      uf: "",
      cep: "",
      complemento: "",
      textoLivre: ensureString(val)
    };
  }
  return {
    logradouro: ensureString(val.logradouro),
    numero: ensureString(val.numero),
    bairro: ensureString(val.bairro),
    cidade: ensureString(val.cidade),
    uf: ensureString(val.uf),
    cep: ensureString(val.cep),
    complemento: ensureString(val.complemento),
    textoLivre: ensureString(val.textoLivre)
  };
}

function ensurePessoa(val){
  if (!val || typeof val !== "object") {
    return { nome: ensureString(val), telefone: "", email: "" };
  }
  return {
    nome: ensureString(val.nome),
    telefone: ensureString(val.telefone),
    email: ensureString(val.email)
  };
}

function ensureCerimonialista(val){
  if (!val || typeof val !== "object") {
    return {
      nomeCompleto: ensureString(val),
      telefone: "",
      redeSocial: "",
      email: ""
    };
  }
  return {
    nomeCompleto: ensureString(val.nomeCompleto ?? val.nome ?? ""),
    telefone: ensureString(val.telefone),
    redeSocial: ensureString(val.redeSocial),
    email: ensureString(val.email)
  };
}

function ensureEvento(val){
  const obj = (!val || typeof val !== "object") ? { nome: ensureString(val) } : val;
  return {
    nome: ensureString(obj.nome ?? obj.titulo),
    dataISO: ensureString(obj.dataISO ?? obj.data ?? obj.dataEvento),
    horario: ensureString(obj.horario ?? obj.hora ?? obj.horarioPrevisto),
    local: ensureString(obj.local ?? obj.espaco),
    descricao: ensureString(obj.descricao),
    endereco: ensureEndereco(obj.endereco),
    anfitriao: ensurePessoa(obj.anfitriao)
  };
}

function ensureConvites(val){
  if (Array.isArray(val)) return deep(val);
  return [];
}

function countPessoas(project){
  if (!project) return 0;
  const convites = Array.isArray(project.convites) ? project.convites : [];
  if (convites.length) {
    return convites.reduce((total, item) => {
      if (typeof item?.total === "number" && !Number.isNaN(item.total)) {
        return total + item.total;
      }
      const acompanhantes = Array.isArray(item?.acompanhantes) ? item.acompanhantes.length : 0;
      return total + 1 + acompanhantes;
    }, 0);
  }
  const lista = Array.isArray(project.lista) ? project.lista : [];
  return lista.length;
}

function toMeta(project){
  const evento = project?.evento || {};
  return {
    id: project?.id,
    nome: evento.nome || "Sem nome",
    dataISO: evento.dataISO || "",
    horario: evento.horario || "",
    local: evento.local || "",
    cidade: evento.endereco?.cidade || "",
    uf: evento.endereco?.uf || "",
    convites: Array.isArray(project?.convites) ? project.convites.length : 0,
    pessoas: countPessoas(project),
    updatedAt: project?.updatedAt || now(),
    metaVersion: META_VERSION
  };
}

function normalizeMeta(meta){
  if (!meta) return null;
  return {
    id: meta.id,
    nome: meta.nome ?? "Sem nome",
    dataISO: meta.dataISO ?? "",
    horario: meta.horario ?? meta.hora ?? "",
    local: meta.local ?? "",
    cidade: meta.cidade ?? "",
    uf: meta.uf ?? "",
    convites: typeof meta.convites === "number" ? meta.convites : 0,
    pessoas: typeof meta.pessoas === "number" ? meta.pessoas : (typeof meta.convites === "number" ? meta.convites : 0),
    updatedAt: meta.updatedAt ?? now(),
    metaVersion: meta.metaVersion ?? 1
  };
}

function ensureShape(p){
  p ||= {};
  p.schemaVersion = SCHEMA_VERSION;
  p.createdAt = p.createdAt || now();
  p.updatedAt = p.updatedAt || now();
  p.cerimonialista = ensureCerimonialista(p.cerimonialista);
  p.evento = ensureEvento(p.evento);
  p.convites = ensureConvites(p.convites);
  p.lista = Array.isArray(p.lista) ? deep(p.lista) : [];
  p.tipos = Array.isArray(p.tipos) ? deep(p.tipos) : [];
  p.modelos = p.modelos && typeof p.modelos === "object" ? deep(p.modelos) : {};
  p.vars = p.vars && typeof p.vars === "object" ? deep(p.vars) : {};
  p.mensagens = Array.isArray(p.mensagens) ? deep(p.mensagens) : [];
  p.relatorios = Array.isArray(p.relatorios) ? deep(p.relatorios) : [];
  return p;
}

function mergeProject(base, partial = {}){
  const out = deep(base || {});
  for (const key of Object.keys(partial || {})) {
    const val = partial[key];
    if (val === undefined) continue;
    if (key === "evento") {
      const evento = partial.evento || {};
      out.evento = {
        ...(out.evento || {}),
        ...deep(evento),
        endereco: {
          ...(out.evento?.endereco || {}),
          ...deep(evento.endereco || {})
        },
        anfitriao: {
          ...(out.evento?.anfitriao || {}),
          ...deep(evento.anfitriao || {})
        }
      };
    } else if (key === "cerimonialista") {
      out.cerimonialista = { ...(out.cerimonialista || {}), ...deep(val) };
    } else if (Array.isArray(val)) {
      out[key] = deep(val);
    } else if (val && typeof val === "object") {
      out[key] = { ...(out[key] || {}), ...deep(val) };
    } else {
      out[key] = val;
    }
  }
  return ensureShape(out);
}

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

// ---------- Cache do índice ----------
let indexCache = null;

async function rebuildMetaIfNeeded(meta){
  const normalized = normalizeMeta(meta);
  if (!normalized?.id) return null;
  if (normalized.metaVersion === META_VERSION) return normalized;
  const project = await kvGet(KEY(normalized.id));
  if (!project) return normalized;
  const shaped = ensureShape(project);
  await kvSet(KEY(normalized.id), shaped);
  return toMeta(shaped);
}

// ---------- API ----------
export async function init(){
  const idx = (await kvGet(INDEX_KEY)) || [];
  const upgraded = [];
  for (const entry of idx) {
    if (!entry) continue;
    try {
      const fresh = await rebuildMetaIfNeeded(entry);
      if (fresh) upgraded.push(fresh);
    } catch (err) {
      console.error("projectStore.init: erro ao reconstruir meta", err);
    }
  }
  indexCache = upgraded;
  await kvSet(INDEX_KEY, indexCache);
  return listProjects();
}

export function listProjects(){
  const idx = indexCache || [];
  return [...idx].sort((a,b)=> (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function createProject(data = {}){
  const id = uid();
  const payload = ensureShape({
    id,
    cerimonialista: data.cerimonialista,
    evento: data.evento,
    convites: data.convites,
    lista: data.lista,
    tipos: data.tipos,
    modelos: data.modelos,
    vars: data.vars,
    mensagens: data.mensagens,
    relatorios: data.relatorios
  });
  payload.createdAt = now();
  payload.updatedAt = payload.createdAt;
  await kvSet(KEY(id), payload);
  const meta = toMeta(payload);
  const idx = (indexCache || (await kvGet(INDEX_KEY)) || []).filter(Boolean);
  idx.push(meta);
  indexCache = idx;
  await kvSet(INDEX_KEY, indexCache);
  return { meta: deep(meta), payload: deep(payload) };
}

export async function getProject(id){
  const raw = await kvGet(KEY(id));
  if (!raw) return null;
  const shaped = ensureShape(raw);
  if (JSON.stringify(shaped) !== JSON.stringify(raw)) await kvSet(KEY(id), shaped);
  return deep(shaped);
}

export async function updateProject(id, partial){
  const curr = await kvGet(KEY(id));
  if (!curr) throw new Error("Projeto não encontrado");
  const merged = mergeProject(ensureShape(curr), deep(partial));
  merged.updatedAt = now();
  await kvSet(KEY(id), merged);

  const idx = (indexCache || (await kvGet(INDEX_KEY)) || []).filter(Boolean);
  const meta = toMeta(merged);
  const i = idx.findIndex(x => x.id === id);
  if (i >= 0) idx[i] = meta; else idx.push(meta);
  indexCache = idx;
  await kvSet(INDEX_KEY, indexCache);

  return deep(merged);
}

export async function deleteProject(id){
  await kvDel(KEY(id));
  const idx = (indexCache || (await kvGet(INDEX_KEY)) || []).filter(Boolean);
  indexCache = idx.filter(x => x.id !== id);
  await kvSet(INDEX_KEY, indexCache);
}

export async function exportProject(id){
  const p = await getProject(id); if (!p) throw new Error("Projeto não encontrado");
  return JSON.stringify(p, null, 2);
}

export async function importProject(jsonOrObj){
  const o = typeof jsonOrObj === "string" ? JSON.parse(jsonOrObj) : jsonOrObj;
  const {
    cerimonialista,
    evento,
    convites,
    lista,
    tipos,
    modelos,
    vars,
    mensagens,
    relatorios
  } = o || {};
  return createProject({ cerimonialista, evento, convites, lista, tipos, modelos, vars, mensagens, relatorios });
}
