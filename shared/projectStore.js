// shared/projectStore.js — Persistência IndexedDB (Schema ProjectV1)
// -----------------------------------------------------------------
// Responsável por criar, listar, atualizar, duplicar e remover projetos
// do Assistente Cerimonial (V5). Implementa um schema estável (v1) com
// migração simples via ensureShape().

const DB_NAME = 'ac_project_db';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
const INDEX_KEY = 'ac:index:v1';
const PROJECT_KEY = (id) => `ac:project:${id}:v1`;
export const SCHEMA_VERSION = 1;

const now = () => Date.now();
const uid = () => crypto.randomUUID();
const clone = (obj) => (typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)));

// ---------------------------- IndexedDB helpers ----------------------------
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore(mode, callback) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const result = callback(store);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function kvGet(key) {
  return withStore('readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  });
}

function kvSet(key, value) {
  return withStore('readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

function kvDel(key) {
  return withStore('readwrite', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

// ----------------------------- Shape helpers ------------------------------
function ensureGuestShape(guest) {
  if (!guest) return null;
  const base = { ...guest };
  base.id ||= uid();
  base.nome = base.nome || '';
  base.principal = base.principal || '';
  base.acompanhantesNomes = Array.isArray(base.acompanhantesNomes) ? base.acompanhantesNomes : [];
  base.acompanhantes = Number.isFinite(base.acompanhantes) ? base.acompanhantes : base.acompanhantesNomes.length;
  base.totalConvite = Number.isFinite(base.totalConvite)
    ? base.totalConvite
    : 1 + (base.acompanhantes || base.acompanhantesNomes.length);
  base.telefone = base.telefone || '';
  base.telefoneFormatado = base.telefoneFormatado || '';
  base.envio = {
    enviado: Boolean(base?.envio?.enviado),
    enviadoEm: base?.envio?.enviadoEm ?? null,
    modeloId: base?.envio?.modeloId ?? null,
  };
  base.rsvp = {
    status: base?.rsvp?.status || 'pendente',
    confirmadosN: Number.isFinite(base?.rsvp?.confirmadosN) ? base.rsvp.confirmadosN : 0,
    confirmadosNomes: Array.isArray(base?.rsvp?.confirmadosNomes) ? base.rsvp.confirmadosNomes : [],
    observacao: base?.rsvp?.observacao || '',
    atualizadoEm: base?.rsvp?.atualizadoEm || 0,
  };
  return base;
}

function ensureAgendaItemShape(item) {
  if (!item) return null;
  const base = { ...item };
  base.id ||= uid();
  base.dataHoraISO = base.dataHoraISO || new Date().toISOString();
  base.modeloId = base.modeloId || '';
  base.publico = { tipo: base?.publico?.tipo || 'todos' };
  base.escopo = {
    tipo: base?.escopo?.tipo || 'em_lote',
    convidadoId: base?.escopo?.convidadoId ?? null,
  };
  base.preview = {
    exemploTexto: base?.preview?.exemploTexto || '',
  };
  base.metricas = {
    estimado: Number.isFinite(base?.metricas?.estimado) ? base.metricas.estimado : 0,
    enviados: Number.isFinite(base?.metricas?.enviados) ? base.metricas.enviados : 0,
  };
  base.status = base.status || 'planejado';
  base.observacao = base.observacao || '';
  return base;
}

function ensureMensagensShape(mensagens) {
  const modelos = Array.isArray(mensagens?.modelos) ? mensagens.modelos : [];
  return { modelos: modelos.map((m) => ({ ...m })) };
}

function ensureEventoShape(evento) {
  const ev = { ...evento };
  ev.titulo = ev.titulo || '';
  ev.data = ev.data || '';
  ev.hora = ev.hora || '';
  ev.local = ev.local || '';
  ev.endereco = {
    logradouro: ev?.endereco?.logradouro || '',
    numero: ev?.endereco?.numero || '',
    complemento: ev?.endereco?.complemento || '',
    bairro: ev?.endereco?.bairro || '',
    cidade: ev?.endereco?.cidade || '',
    uf: ev?.endereco?.uf || '',
    cep: ev?.endereco?.cep || '',
  };
  ev.anfitriao = ev.anfitriao || '';
  ev.cerimonial = ev.cerimonial || '';
  return ev;
}

function ensureProjectShape(project) {
  const base = project ? { ...project } : {};
  base.id ||= uid();
  base.schemaVersion = SCHEMA_VERSION;
  base.createdAt = base.createdAt || now();
  base.updatedAt = base.updatedAt || now();
  base.evento = ensureEventoShape(base.evento || {});
  base.lista = Array.isArray(base.lista) ? base.lista.map(ensureGuestShape) : [];
  base.mensagens = ensureMensagensShape(base.mensagens || {});
  base.agenda = Array.isArray(base.agenda) ? base.agenda.map(ensureAgendaItemShape) : [];
  base.notas = typeof base.notas === 'string' ? base.notas : '';
  return base;
}

function toMeta(project) {
  return {
    id: project.id,
    titulo: project.evento?.titulo || 'Evento sem título',
    updatedAt: project.updatedAt || now(),
    createdAt: project.createdAt || now(),
  };
}

// ------------------------------- Cache índice ------------------------------
let indexCache = null;

async function loadIndex() {
  if (!indexCache) {
    indexCache = (await kvGet(INDEX_KEY)) || [];
  }
  return indexCache;
}

async function persistIndex(idx) {
  indexCache = idx;
  await kvSet(INDEX_KEY, idx);
}

async function upsertIndex(project) {
  const idx = await loadIndex();
  const meta = toMeta(project);
  const existing = idx.findIndex((entry) => entry.id === meta.id);
  if (existing >= 0) {
    idx[existing] = { ...idx[existing], ...meta };
  } else {
    idx.push(meta);
  }
  await persistIndex(idx);
}

// ---------------------------------- API -----------------------------------
export async function init() {
  await loadIndex();
  return listProjects();
}

export function listProjects() {
  const idx = indexCache || [];
  return [...idx].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createProject(data = {}) {
  const payload = ensureProjectShape({ ...data, id: uid(), createdAt: now(), updatedAt: now() });
  await kvSet(PROJECT_KEY(payload.id), payload);
  await upsertIndex(payload);
  return clone(payload);
}

export async function getProject(id) {
  const raw = await kvGet(PROJECT_KEY(id));
  if (!raw) return null;
  const ensured = ensureProjectShape(raw);
  if (JSON.stringify(raw) !== JSON.stringify(ensured)) {
    await kvSet(PROJECT_KEY(ensured.id), ensured);
    await upsertIndex(ensured);
  }
  return clone(ensured);
}

export async function updateProject(id, partial = {}) {
  const current = await kvGet(PROJECT_KEY(id));
  if (!current) throw new Error('Projeto não encontrado');
  const merged = ensureProjectShape({ ...current, ...clone(partial), id });
  merged.createdAt = current.createdAt || merged.createdAt;
  merged.updatedAt = now();
  await kvSet(PROJECT_KEY(id), merged);
  await upsertIndex(merged);
  return clone(merged);
}

export async function deleteProject(id) {
  await kvDel(PROJECT_KEY(id));
  const idx = await loadIndex();
  const filtered = idx.filter((entry) => entry.id !== id);
  await persistIndex(filtered);
}

export async function exportProject(id) {
  const project = await getProject(id);
  if (!project) throw new Error('Projeto não encontrado');
  return JSON.stringify(project, null, 2);
}

export async function importProject(jsonOrObject) {
  const payload = typeof jsonOrObject === 'string' ? JSON.parse(jsonOrObject) : jsonOrObject;
  if (!payload || typeof payload !== 'object') throw new Error('JSON inválido');
  const imported = ensureProjectShape(payload);
  imported.id = uid();
  imported.createdAt = now();
  imported.updatedAt = now();
  await kvSet(PROJECT_KEY(imported.id), imported);
  await upsertIndex(imported);
  return clone(imported);
}

export async function duplicateProject(id, overrides = {}) {
  const original = await getProject(id);
  if (!original) throw new Error('Projeto não encontrado');
  const copy = ensureProjectShape({
    ...clone(original),
    ...clone(overrides),
    id: uid(),
    createdAt: now(),
    updatedAt: now(),
  });
  // re-gerar ids dos convites/agenda
  copy.lista = copy.lista.map((guest) => ({ ...guest, id: uid() }));
  copy.agenda = copy.agenda.map((item) => ({ ...item, id: uid() }));
  await kvSet(PROJECT_KEY(copy.id), copy);
  await upsertIndex(copy);
  return clone(copy);
}

export async function renameProject(id, titulo) {
  const current = await kvGet(PROJECT_KEY(id));
  if (!current) throw new Error('Projeto não encontrado');
  current.evento = ensureEventoShape(current.evento || {});
  current.evento.titulo = titulo;
  current.updatedAt = now();
  await kvSet(PROJECT_KEY(id), current);
  await upsertIndex(current);
  return clone(current);
}
