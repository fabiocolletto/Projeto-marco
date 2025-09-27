// tools/gestao-de-convidados/event_editor.mjs
// Formulários para editar dados do cliente (cerimonialista) e do evento ativo.

import * as store from "../../shared/projectStore.js";
import { buzz } from "./app_header.mjs";

const PROJECT_EVENT = "ac:project-change";

const digitsOnly = (value) => (value || "").replace(/\D+/g, "");
const isPlainObject = (value) => Object.prototype.toString.call(value) === "[object Object]";
const clone = (value) => {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value ?? null));
};

const css = `
.ac-editor{--bg:#fff;--fg:#111;--muted:#666;--line:#111;--radius:10px;--brand:#111;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Arial;color:var(--fg);line-height:1.45}
.ac-editor *{box-sizing:border-box}
.ac-editor__wrap{max-width:1200px;margin:0 auto;padding:20px 12px 60px 12px;display:flex;flex-direction:column;gap:16px}
.ac-editor__status{align-self:flex-end;font-size:12px;font-weight:600;color:var(--muted);display:flex;align-items:center;gap:6px}
.ac-editor__status::before{content:"";width:8px;height:8px;border-radius:50%;background:#bbb;transition:background .2s ease}
.ac-editor__status[data-tone="loading"]::before{background:#d97706}
.ac-editor__status[data-tone="error"]::before{background:#b91c1c}
.ac-editor__status[data-tone="ready"]::before{background:#1a7f37}
.ac-editor__status[data-tone="idle"]::before{background:#bbb}
.ac-form-card{border:1px solid var(--line);border-radius:var(--radius);background:var(--bg);padding:20px}
.ac-form-card__title{margin:0;font-weight:800;font-size:20px}
.ac-form-card__desc{margin:6px 0 18px 0;color:var(--muted);font-size:14px}
.ac-form-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.ac-form-group{display:flex;flex-direction:column;gap:6px}
.ac-form-group label{font-size:13px;font-weight:700;color:var(--fg);text-transform:none}
.ac-form-group input,
.ac-form-group textarea,
.ac-form-group select{appearance:none;border:1px solid var(--line);border-radius:var(--radius);padding:10px 12px;font:inherit;color:var(--fg);background:var(--bg)}
.ac-form-group textarea{resize:vertical;min-height:96px}
.ac-form-group input:disabled,
.ac-form-group textarea:disabled{background:#f5f5f5;color:#999}
.ac-form-note{margin-top:18px;font-size:12px;color:var(--muted)}
@media (max-width:640px){
  .ac-editor__wrap{padding:16px 10px 40px 10px}
  .ac-form-card{padding:16px}
}
`;

const template = `
  <div class="ac-editor__wrap">
    <div class="ac-editor__status" id="editor-status" data-tone="idle">Selecione ou crie um evento para começar.</div>

    <section class="ac-form-card" aria-labelledby="card-cerimonialista">
      <h2 id="card-cerimonialista" class="ac-form-card__title">Dados do cliente</h2>
      <p class="ac-form-card__desc">Atualize as informações do cerimonialista ou da empresa responsável pelo evento.</p>
      <div class="ac-form-grid">
        <div class="ac-form-group">
          <label for="ceri-nome">Nome completo</label>
          <input id="ceri-nome" type="text" placeholder="Nome do responsável" data-paths="cerimonialista.nomeCompleto|anfitriao.nome" autocomplete="name" />
        </div>
        <div class="ac-form-group">
          <label for="ceri-empresa">Empresa / Rede social</label>
          <input id="ceri-empresa" type="text" placeholder="Ex.: @suaempresa" data-paths="cerimonialista.redeSocial" autocomplete="organization" />
        </div>
        <div class="ac-form-group">
          <label for="ceri-telefone">Telefone</label>
          <input id="ceri-telefone" type="tel" placeholder="(00) 00000-0000" data-paths="cerimonialista.telefone|anfitriao.telefone" data-type="phone" autocomplete="tel" />
        </div>
        <div class="ac-form-group">
          <label for="ceri-email">E-mail</label>
          <input id="ceri-email" type="email" placeholder="nome@email.com" data-paths="cerimonialista.email|anfitriao.email" autocomplete="email" />
        </div>
      </div>
    </section>

    <section class="ac-form-card" aria-labelledby="card-evento">
      <h2 id="card-evento" class="ac-form-card__title">Dados do evento</h2>
      <p class="ac-form-card__desc">Edite as informações que aparecem no painel e nos convites.</p>
      <div class="ac-form-grid">
        <div class="ac-form-group">
          <label for="ev-nome">Nome do evento</label>
          <input id="ev-nome" type="text" placeholder="Título do evento" data-paths="evento.nome|nome" autocomplete="off" />
        </div>
        <div class="ac-form-group">
          <label for="ev-data">Data</label>
          <input id="ev-data" type="date" data-paths="evento.dataISO|evento.data|dataISO" />
        </div>
        <div class="ac-form-group">
          <label for="ev-hora">Horário</label>
          <input id="ev-hora" type="time" data-paths="evento.horario|evento.hora|horario" />
        </div>
        <div class="ac-form-group">
          <label for="ev-local">Local</label>
          <input id="ev-local" type="text" placeholder="Nome do local" data-paths="evento.local|local" autocomplete="organization" />
        </div>
        <div class="ac-form-group">
          <label for="end-logradouro">Logradouro</label>
          <input id="end-logradouro" type="text" placeholder="Rua, avenida..." data-paths="endereco.logradouro|evento.endereco.logradouro" autocomplete="address-line1" />
        </div>
        <div class="ac-form-group">
          <label for="end-numero">Número</label>
          <input id="end-numero" type="text" placeholder="Número" data-paths="endereco.numero|evento.endereco.numero" autocomplete="address-line2" />
        </div>
        <div class="ac-form-group">
          <label for="end-bairro">Bairro</label>
          <input id="end-bairro" type="text" placeholder="Bairro" data-paths="endereco.bairro|evento.endereco.bairro" />
        </div>
        <div class="ac-form-group">
          <label for="end-cidade">Cidade</label>
          <input id="end-cidade" type="text" placeholder="Cidade" data-paths="endereco.cidade|evento.endereco.cidade" autocomplete="address-level2" />
        </div>
        <div class="ac-form-group">
          <label for="end-uf">Estado (UF)</label>
          <input id="end-uf" type="text" placeholder="UF" maxlength="2" data-type="uppercase" data-paths="endereco.uf|evento.endereco.uf" autocomplete="address-level1" />
        </div>
        <div class="ac-form-group">
          <label for="anfitriao-nome">Anfitrião</label>
          <input id="anfitriao-nome" type="text" placeholder="Nome do anfitrião" data-paths="anfitriao.nome|evento.anfitriao" />
        </div>
        <div class="ac-form-group">
          <label for="anfitriao-email">E-mail do anfitrião</label>
          <input id="anfitriao-email" type="email" placeholder="email@dominio.com" data-paths="anfitriao.email|cerimonialista.email" autocomplete="email" />
        </div>
        <div class="ac-form-group">
          <label for="anfitriao-telefone">Telefone do anfitrião</label>
          <input id="anfitriao-telefone" type="tel" placeholder="(00) 00000-0000" data-paths="anfitriao.telefone|cerimonialista.telefone" data-type="phone" autocomplete="tel" />
        </div>
      </div>
      <p class="ac-form-note">As alterações são salvas automaticamente.</p>
    </section>
  </div>
`;

let hasInit = false;
let activeProjectId = null;
let activeProject = null;
let rootNode = null;
let statusTimer = null;
let projectChangeHandler = null;
const pendingTimers = new Map();

const getValueAtPath = (source, path) => {
  if (!source || !path) return undefined;
  return path.split(".").reduce((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, source);
};

const applyPatchForPath = (target, path, value) => {
  const segments = path.split(".");
  if (!segments.length) return;
  let cursor = target;
  let sourceCursor = activeProject;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    const fromSource = isPlainObject(sourceCursor?.[key]) ? sourceCursor[key] : undefined;
    if (!isPlainObject(cursor[key])) {
      cursor[key] = fromSource ? { ...fromSource } : {};
    }
    cursor = cursor[key];
    sourceCursor = sourceCursor?.[key];
  }
  cursor[segments[segments.length - 1]] = value;
};

const mutateActiveProject = (path, value) => {
  if (!activeProject) return;
  const segments = path.split(".");
  let cursor = activeProject;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    if (!isPlainObject(cursor[key])) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[segments[segments.length - 1]] = value;
};

const formatPhone = (digits) => {
  if (!digits) return "";
  const d = digitsOnly(digits);
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (d.length > 2) {
    return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  }
  return d;
};

const setStatus = (message, tone = "idle") => {
  if (!rootNode) return;
  const statusEl = rootNode.querySelector("#editor-status");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
  if (statusTimer) clearTimeout(statusTimer);
  if (tone === "ready") {
    statusTimer = setTimeout(() => {
      if (!rootNode) return;
      statusEl.textContent = activeProjectId ? "Pronto" : "Selecione ou crie um evento para começar.";
      statusEl.dataset.tone = activeProjectId ? "idle" : "idle";
    }, 2000);
  }
};

const setFormDisabled = (disabled) => {
  if (!rootNode) return;
  rootNode.querySelectorAll("input, textarea, select").forEach((el) => {
    // eslint-disable-next-line no-param-reassign
    el.disabled = disabled;
  });
};

const clearPending = () => {
  pendingTimers.forEach((timer) => clearTimeout(timer));
  pendingTimers.clear();
};

const fillForm = (project) => {
  if (!rootNode) return;
  const inputs = rootNode.querySelectorAll("[data-paths]");
  inputs.forEach((input) => {
    const paths = (input.dataset.paths || "")
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    let value = "";
    if (project) {
      for (const path of paths) {
        const candidate = getValueAtPath(project, path);
        if (candidate !== undefined && candidate !== null && `${candidate}`.length) {
          value = candidate;
          break;
        }
      }
    }
    if (input.dataset.type === "phone") {
      input.value = formatPhone(value);
    } else {
      input.value = value ?? "";
    }
  });
};

const handleProjectChange = async (id) => {
  clearPending();
  activeProjectId = id || null;
  if (!activeProjectId) {
    activeProject = null;
    setFormDisabled(true);
    fillForm(null);
    setStatus("Selecione ou crie um evento para começar.", "idle");
    return;
  }
  setFormDisabled(true);
  setStatus("Carregando dados do evento…", "loading");
  try {
    const full = await store.getProject?.(activeProjectId);
    activeProject = full ? clone(full) : null;
    fillForm(activeProject);
    setFormDisabled(!activeProject);
    if (!activeProject) {
      setStatus("Não foi possível carregar os dados do evento.", "error");
      return;
    }
    setStatus("Pronto", "ready");
  } catch (err) {
    console.error(err);
    activeProject = null;
    fillForm(null);
    setFormDisabled(true);
    setStatus("Erro ao carregar o evento.", "error");
  }
};

const persistChanges = async (paths, value) => {
  if (!activeProjectId || !activeProject) return;
  const patch = {};
  paths.forEach((path) => {
    applyPatchForPath(patch, path, value);
  });
  try {
    await store.updateProject?.(activeProjectId, patch);
    paths.forEach((path) => mutateActiveProject(path, value));
    try {
      await buzz();
    } catch (err) {
      console.warn("Não foi possível atualizar o cabeçalho:", err);
    }
    setStatus("Alterações salvas", "ready");
  } catch (err) {
    console.error(err);
    setStatus("Não foi possível salvar a alteração.", "error");
  }
};

const schedulePersist = (paths, value, key) => {
  if (!key) return;
  if (pendingTimers.has(key)) {
    clearTimeout(pendingTimers.get(key));
  }
  const timer = setTimeout(() => {
    pendingTimers.delete(key);
    persistChanges(paths, value);
  }, 300);
  pendingTimers.set(key, timer);
};

const handleInput = (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
    return;
  }
  const paths = (target.dataset.paths || "")
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paths.length) return;
  let value = target.value;
  const type = target.dataset.type;
  if (type === "phone") {
    const digits = digitsOnly(value);
    value = digits;
    target.value = formatPhone(digits);
  } else if (type === "uppercase") {
    value = value.toUpperCase();
    target.value = value;
  }
  const key = paths.join("|");
  if (!activeProject) {
    setStatus("Crie ou selecione um evento antes de editar.", "error");
    target.blur();
    return;
  }
  const currentValues = paths.map((path) => {
    const existing = getValueAtPath(activeProject, path);
    return existing == null ? "" : `${existing}`;
  });
  const normalizedValue = value == null ? "" : `${value}`;
  const allEqual = currentValues.every((curr) => curr === normalizedValue);
  if (allEqual) return;
  schedulePersist(paths, value, key);
  setStatus("Salvando…", "loading");
};

async function ensureInit(){
  if (hasInit) return;
  await (store.init?.() ?? Promise.resolve());
  hasInit = true;
}

export async function render(rootEl){
  if (!rootEl) throw new Error("Elemento raiz é obrigatório para event_editor");
  await ensureInit();

  if (rootNode) {
    // Limpa listeners anteriores antes de re-renderizar
    if (projectChangeHandler && typeof window !== "undefined") {
      window.removeEventListener(PROJECT_EVENT, projectChangeHandler);
    }
  }

  const root = document.createElement("div");
  root.className = "ac-editor";
  const style = document.createElement("style");
  style.textContent = css;
  root.appendChild(style);
  const host = document.createElement("div");
  host.innerHTML = template;
  root.appendChild(host);
  rootEl.replaceChildren(root);
  rootNode = root;

  root.addEventListener("input", handleInput);
  root.addEventListener("change", handleInput);

  if (typeof window !== "undefined") {
    projectChangeHandler = (evt) => {
      const detailId = evt?.detail?.id ?? null;
      handleProjectChange(detailId);
    };
    window.addEventListener(PROJECT_EVENT, projectChangeHandler);
  }

  const list = await (store.listProjects?.() ?? []);
  const initialId = list[0]?.id ?? null;
  await handleProjectChange(initialId);
}

export function mount(selector){
  const el = typeof selector === "string" ? document.querySelector(selector) : selector;
  if (!el) throw new Error("Elemento não encontrado para montar event_editor: " + selector);
  return render(el);
}
