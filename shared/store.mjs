// shared/store.mjs
// Adaptador para o projectStore.js (v1) com "draft + commit" e API amigável ao widget.

// Importa teu SDK atual
const SDK_SRC = "https://cdn.jsdelivr.net/gh/fabiocolletto/Projeto-marco@main/shared/projectStore.js";
const sdk = await import(SDK_SRC);

// ---------- Estado em memória (única instância por módulo ES) ----------
let state = {
  current: null,   // snapshot persistido
  draft:   null,   // edição em andamento
  dirty:   false,
  saving:  false,
  loading: false,
};
const listeners = new Set();
const notify = () => listeners.forEach(fn => fn(getState()));
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const getState  = () => state;

// ---------- Normalização de payload (aditivo, sem migração) ----------
function normalizeOnLoad(p) {
  if (!p) return p;
  // status opcional (ex.: "open" | "completed")
  p.status ??= "open";
  // campos mínimos já são garantidos pelo ensureShape do teu SDK
  return p;
}
function normalizeBeforeSave(p) {
  // carimbo de data (compatível com teu exportProject atual)
  p.saved_at = new Date().toISOString();
  return p;
}

// ---------- API pública esperada pelo widget ----------
export async function listEvents() {
  // converte o teu índice em {id, title, status, updated_at}
  const idx = await (sdk.init?.() ?? sdk.listProjects());
  return (sdk.listProjects()).map(it => ({
    id: it.id,
    title: it.nome || "(sem título)",
    status: it.status ?? "open",
    updated_at: it.updatedAt ?? Date.now(),
  }));
}

export async function load(projectId) {
  state.loading = true; notify();
  const p = await sdk.getProject(projectId);
  const shaped = normalizeOnLoad(p);
  state.current = freeze(shaped);
  state.draft   = structuredClone(shaped);
  state.dirty   = false;
  state.loading = false;
  notify();
  return state.current;
}

// “edit” altera somente o draft em memória
export function edit(updater) {
  const next = updater(structuredClone(state.draft));
  state.draft = next;
  state.dirty = JSON.stringify(state.draft) !== JSON.stringify(state.current);
  notify();
}

// “save” aplica diff via updateProject (commit explícito)
export async function save() {
  if (!state?.draft?.id) throw new Error("Nenhum projeto carregado.");
  if (!state.dirty || state.saving) return state.current;

  state.saving = true; notify();
  try {
    const finalPayload = normalizeBeforeSave(structuredClone(state.draft));
    // mapeia para o formato do SDK: updateProject(id, partial)
    // como o SDK usa merge raso com ensureShape, podemos mandar o objeto inteiro.
    const persisted = await sdk.updateProject(finalPayload.id, finalPayload);

    state.current = freeze(normalizeOnLoad(persisted));
    state.draft   = structuredClone(state.current);
    state.dirty   = false;
    state.saving  = false;
    notify();
    return state.current;
  } catch (e) {
    state.saving = false; notify();
    throw e;
  }
}

// Criação, duplicação, concluir, exportar, deletar -------------

export async function createNewEvent(title="Novo evento") {
  const { payload } = await sdk.createProject({
    evento: { nome: title, data:"", hora:"", local:"", endereco:"", anfitriao:"" },
    lista: [], tipos: [], modelos: {}, vars: {}
  });
  // garante status
  payload.status ??= "open";
  await sdk.updateProject(payload.id, payload);
  return payload.id;
}

export async function duplicateEvent(sourceId) {
  const src = await sdk.getProject(sourceId);
  if (!src) throw new Error("Evento original não encontrado.");
  const copy = structuredClone(src);
  delete copy.id; // import cria um novo ID
  copy.evento = { ...copy.evento, nome: `${src.evento?.nome || "(sem título)"} (cópia)` };
  const { payload } = await sdk.importProject(copy);
  payload.status ??= src.status ?? "open";
  await sdk.updateProject(payload.id, payload);
  return payload.id;
}

export async function markCompleted(eventId) {
  const p = await sdk.getProject(eventId);
  if (!p) return false;
  p.status = "completed";
  await sdk.updateProject(eventId, p);
  // se for o carregado, reflete na memória
  if (state?.current?.id === eventId) {
    state.current = freeze(p);
    state.draft   = structuredClone(p);
    state.dirty   = false;
    notify();
  }
  return true;
}

export async function deleteEvent(eventId) {
  await sdk.deleteProject(eventId);
  if (state?.current?.id === eventId) {
    state.current = null;
    state.draft   = null;
    state.dirty   = false;
    notify();
  }
}

export async function exportEvent(eventId) {
  const json = await sdk.exportProject(eventId);
  const blob = new Blob([json], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${eventId}.marco.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// utilidades ---------------------------------------------------
function freeze(o){ return o && typeof o === "object" ? Object.freeze(o) : o; }
