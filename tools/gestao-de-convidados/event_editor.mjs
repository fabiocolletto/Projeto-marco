// tools/gestao-de-convidados/event_editor.mjs
// Editor de dados do evento + dados do cliente/cerimonialista.

import * as store from "../../shared/projectStore.js";
import { publish, subscribe } from "../../shared/marcoBus.js";

const css = `
.gce-root{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Arial;color:#111;line-height:1.4}
.gce-root *{box-sizing:border-box}
.gce-shell{border:1px solid #d4d4d8;border-radius:14px;padding:18px;background:#fff}
.gce-title{margin:0 0 16px 0;font-weight:800;font-size:20px}
.gce-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
.gce-card{border:1px solid #e4e4e7;border-radius:12px;padding:16px;background:#fafafa}
.gce-card h3{margin:0 0 12px 0;font-size:16px;font-weight:700}
.gce-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
.gce-field label{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:#4b5563}
.gce-field input,.gce-field textarea,.gce-field select{padding:10px 12px;border:1px solid #d4d4d8;border-radius:8px;font:inherit;background:#fff}
.gce-field textarea{min-height:88px;resize:vertical}
.gce-actions{margin-top:18px;display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.gce-btn{appearance:none;border:1px solid #111;background:#111;color:#fff;padding:10px 18px;border-radius:999px;font-weight:700;cursor:pointer;transition:background .2s,transform .2s}
.gce-btn[disabled]{opacity:.4;cursor:not-allowed}
.gce-btn--ghost{background:transparent;color:#111}
.gce-status{font-size:12px;color:#4b5563}
.gce-status--warn{color:#b45309}
.gce-status--ok{color:#15803d}
.gce-status--error{color:#b91c1c}
.gce-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.gce-form[aria-busy="true"]{opacity:.6;pointer-events:none}
@media (max-width:640px){.gce-grid{grid-template-columns:1fr}}
`;

const template = `
  <div class="gce-shell">
    <h2 class="gce-title">Dados do evento &amp; cliente</h2>
    <form id="evt-form" class="gce-form" autocomplete="off">
      <div class="gce-grid">
        <section class="gce-card" data-block="evento">
          <h3>Evento</h3>
          <div class="gce-field"><label for="evt-nome">Nome do evento</label><input id="evt-nome" data-field="evento.nome" required></div>
          <div class="gce-two">
            <div class="gce-field"><label for="evt-data">Data</label><input id="evt-data" type="date" data-field="evento.dataISO"></div>
            <div class="gce-field"><label for="evt-hora">Horário</label><input id="evt-hora" type="time" data-field="evento.horario"></div>
          </div>
          <div class="gce-field"><label for="evt-local">Local</label><input id="evt-local" data-field="evento.local"></div>
          <div class="gce-field"><label for="evt-descricao">Descrição / observações</label><textarea id="evt-descricao" data-field="evento.descricao"></textarea></div>
        </section>

        <section class="gce-card" data-block="endereco">
          <h3>Endereço</h3>
          <div class="gce-field"><label for="evt-logra">Logradouro</label><input id="evt-logra" data-field="evento.endereco.logradouro"></div>
          <div class="gce-two">
            <div class="gce-field"><label for="evt-numero">Número</label><input id="evt-numero" data-field="evento.endereco.numero"></div>
            <div class="gce-field"><label for="evt-bairro">Bairro</label><input id="evt-bairro" data-field="evento.endereco.bairro"></div>
          </div>
          <div class="gce-two">
            <div class="gce-field"><label for="evt-cidade">Cidade</label><input id="evt-cidade" data-field="evento.endereco.cidade"></div>
            <div class="gce-field"><label for="evt-uf">UF</label><input id="evt-uf" maxlength="2" data-field="evento.endereco.uf"></div>
          </div>
          <div class="gce-two">
            <div class="gce-field"><label for="evt-cep">CEP</label><input id="evt-cep" data-field="evento.endereco.cep" inputmode="numeric"></div>
            <div class="gce-field"><label for="evt-comp">Complemento</label><input id="evt-comp" data-field="evento.endereco.complemento"></div>
          </div>
          <div class="gce-field"><label for="evt-endtexto">Referência / texto livre</label><textarea id="evt-endtexto" data-field="evento.endereco.textoLivre"></textarea></div>
        </section>

        <section class="gce-card" data-block="anfitriao">
          <h3>Anfitriã(o)</h3>
          <div class="gce-field"><label for="host-nome">Nome</label><input id="host-nome" data-field="evento.anfitriao.nome"></div>
          <div class="gce-field"><label for="host-tel">Telefone</label><input id="host-tel" data-field="evento.anfitriao.telefone" inputmode="tel"></div>
          <div class="gce-field"><label for="host-email">E-mail</label><input id="host-email" type="email" data-field="evento.anfitriao.email"></div>
        </section>

        <section class="gce-card" data-block="cliente">
          <h3>Cerimonialista / Cliente</h3>
          <div class="gce-field"><label for="cli-nome">Nome completo</label><input id="cli-nome" data-field="cerimonialista.nomeCompleto"></div>
          <div class="gce-field"><label for="cli-tel">Telefone</label><input id="cli-tel" data-field="cerimonialista.telefone" inputmode="tel"></div>
          <div class="gce-field"><label for="cli-rede">Rede social / @</label><input id="cli-rede" data-field="cerimonialista.redeSocial"></div>
          <div class="gce-field"><label for="cli-email">E-mail</label><input id="cli-email" type="email" data-field="cerimonialista.email"></div>
        </section>
      </div>
      <div class="gce-actions">
        <button type="submit" class="gce-btn" id="btn-save" disabled>Salvar alterações</button>
        <button type="button" class="gce-btn gce-btn--ghost" id="btn-reset" disabled>Descartar</button>
        <span class="gce-status" id="gce-status">Selecione um evento para editar.</span>
      </div>
    </form>
  </div>
`;

let currentRoot = null;
let formEl = null;
let saveBtn = null;
let resetBtn = null;
let statusEl = null;
let dirty = false;
let busy = false;
let busBound = false;
let currentProject = null;

const cloneProject = (data) => {
  if (typeof globalThis.structuredClone === "function") {
    try { return globalThis.structuredClone(data); } catch {}
  }
  return JSON.parse(JSON.stringify(data ?? null));
};

const ensureString = (v) => (v == null ? "" : String(v));
const cleanPhone = (v) => ensureString(v).replace(/\D+/g, "");

function getCounts(project){
  if (!project) return { convites: 0, pessoas: 0 };
  const convitesArr = Array.isArray(project.convites) ? project.convites : null;
  if (convitesArr) {
    const convites = convitesArr.length;
    const pessoas = convitesArr.reduce((sum, invite) => {
      if (typeof invite?.total === "number" && !Number.isNaN(invite.total)) return sum + invite.total;
      const acomp = Array.isArray(invite?.acompanhantes) ? invite.acompanhantes.length : 0;
      return sum + 1 + acomp;
    }, 0);
    return { convites, pessoas };
  }
  const lista = Array.isArray(project.lista) ? project.lista.length : 0;
  return { convites: lista, pessoas: lista };
}

function metaFromProject(project){
  const evento = project?.evento || {};
  const counts = getCounts(project);
  return {
    id: project?.id,
    nome: evento.nome || "Sem nome",
    dataISO: evento.dataISO || "",
    horario: evento.horario || "",
    local: evento.local || "",
    cidade: evento.endereco?.cidade || "",
    uf: evento.endereco?.uf || "",
    convites: counts.convites,
    pessoas: counts.pessoas,
    updatedAt: project?.updatedAt || Date.now(),
    metaVersion: 2
  };
}

function setStatus(text, tone = "muted"){
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.classList.remove("gce-status--warn","gce-status--ok","gce-status--error");
  if (tone === "warn") statusEl.classList.add("gce-status--warn");
  else if (tone === "ok") statusEl.classList.add("gce-status--ok");
  else if (tone === "error") statusEl.classList.add("gce-status--error");
}

function updateFormState(){
  if (!formEl) return;
  const disabled = !currentProject || busy;
  formEl.setAttribute("aria-busy", busy ? "true" : "false");
  formEl.querySelectorAll("[data-field]").forEach(input => {
    input.disabled = disabled;
  });
  saveBtn.disabled = disabled || !dirty;
  resetBtn.disabled = disabled || !dirty;
}

function markDirty(flag){
  dirty = !!flag;
  updateFormState();
  if (dirty) setStatus("Alterações não salvas", "warn");
}

function clearForm(){
  if (!formEl) return;
  formEl.querySelectorAll("[data-field]").forEach(input => {
    if (input.tagName === "INPUT" || input.tagName === "TEXTAREA") {
      input.value = "";
    }
  });
}

function applyProjectToForm(project){
  if (!formEl) return;
  const evento = project?.evento || {};
  const endereco = evento.endereco || {};
  const anfitriao = evento.anfitriao || {};
  const cerimonialista = project?.cerimonialista || {};
  const setters = new Map([
    ["evento.nome", ensureString(evento.nome)],
    ["evento.dataISO", ensureString(evento.dataISO)],
    ["evento.horario", ensureString(evento.horario)],
    ["evento.local", ensureString(evento.local)],
    ["evento.descricao", ensureString(evento.descricao)],
    ["evento.endereco.logradouro", ensureString(endereco.logradouro)],
    ["evento.endereco.numero", ensureString(endereco.numero)],
    ["evento.endereco.bairro", ensureString(endereco.bairro)],
    ["evento.endereco.cidade", ensureString(endereco.cidade)],
    ["evento.endereco.uf", ensureString(endereco.uf)],
    ["evento.endereco.cep", ensureString(endereco.cep)],
    ["evento.endereco.complemento", ensureString(endereco.complemento)],
    ["evento.endereco.textoLivre", ensureString(endereco.textoLivre)],
    ["evento.anfitriao.nome", ensureString(anfitriao.nome)],
    ["evento.anfitriao.telefone", ensureString(anfitriao.telefone)],
    ["evento.anfitriao.email", ensureString(anfitriao.email)],
    ["cerimonialista.nomeCompleto", ensureString(cerimonialista.nomeCompleto)],
    ["cerimonialista.telefone", ensureString(cerimonialista.telefone)],
    ["cerimonialista.redeSocial", ensureString(cerimonialista.redeSocial)],
    ["cerimonialista.email", ensureString(cerimonialista.email)]
  ]);
  formEl.querySelectorAll("[data-field]").forEach(input => {
    const key = input.getAttribute("data-field");
    if (!setters.has(key)) return;
    input.value = setters.get(key);
  });
}

function readForm(){
  if (!formEl) return null;
  const val = (field) => {
    const input = formEl.querySelector(`[data-field="${field}"]`);
    if (!input) return "";
    return input.value || "";
  };
  return {
    evento: {
      nome: val("evento.nome"),
      dataISO: val("evento.dataISO"),
      horario: val("evento.horario"),
      local: val("evento.local"),
      descricao: val("evento.descricao"),
      endereco: {
        logradouro: val("evento.endereco.logradouro"),
        numero: val("evento.endereco.numero"),
        bairro: val("evento.endereco.bairro"),
        cidade: val("evento.endereco.cidade"),
        uf: val("evento.endereco.uf"),
        cep: val("evento.endereco.cep"),
        complemento: val("evento.endereco.complemento"),
        textoLivre: val("evento.endereco.textoLivre")
      },
      anfitriao: {
        nome: val("evento.anfitriao.nome"),
        telefone: cleanPhone(val("evento.anfitriao.telefone")),
        email: val("evento.anfitriao.email")
      }
    },
    cerimonialista: {
      nomeCompleto: val("cerimonialista.nomeCompleto"),
      telefone: cleanPhone(val("cerimonialista.telefone")),
      redeSocial: val("cerimonialista.redeSocial"),
      email: val("cerimonialista.email")
    }
  };
}

async function handleSubmit(e){
  e.preventDefault();
  if (!currentProject) return;
  const payload = readForm();
  busy = true;
  updateFormState();
  setStatus("Salvando alterações…");
  try {
    const updated = await store.updateProject(currentProject.id, payload);
    currentProject = cloneProject(updated);
    markDirty(false);
    setStatus("Alterações salvas.", "ok");
    publish("marco:project-updated", { id: currentProject.id, project: cloneProject(currentProject), meta: metaFromProject(currentProject) });
  } catch (err) {
    console.error(err);
    setStatus("Não foi possível salvar. Tente novamente.", "error");
  } finally {
    busy = false;
    updateFormState();
  }
}

function handleInput(){
  if (!currentProject) return;
  markDirty(true);
}

function handleReset(){
  if (!currentProject) return;
  applyProjectToForm(currentProject);
  markDirty(false);
  setStatus("Alterações descartadas.");
}

function bindBus(){
  if (busBound) return;
  subscribe("marco:project-selected", ({ id, project }) => {
    if (!id || !project) {
      if (dirty && currentProject) {
        setStatus("Seleção alterada. Alterações não salvas foram descartadas.", "warn");
      } else {
        setStatus("Selecione um evento para editar.");
      }
      currentProject = null;
      dirty = false;
      clearForm();
      updateFormState();
      return;
    }
    if (dirty && currentProject && currentProject.id !== id) {
      const keep = confirm("Descartar alterações não salvas?");
      if (!keep) {
        publish("marco:request-project-select", { id: currentProject.id });
        return;
      }
    }
    currentProject = cloneProject(project);
    applyProjectToForm(currentProject);
    markDirty(false);
    setStatus("Pronto para editar.", "ok");
  });

  subscribe("marco:project-updated", ({ id, project }) => {
    if (!id || !project) return;
    if (!currentProject || currentProject.id !== id) return;
    currentProject = cloneProject(project);
    if (!dirty) {
      applyProjectToForm(currentProject);
      setStatus("Dados atualizados.", "ok");
    } else {
      setStatus("Este evento foi alterado em outro local. Revise antes de salvar.", "warn");
    }
  });

  busBound = true;
}

export function render(rootEl){
  const root = document.createElement("div");
  root.className = "gce-root";
  const style = document.createElement("style");
  style.textContent = css;
  root.appendChild(style);
  const host = document.createElement("div");
  host.innerHTML = template;
  root.appendChild(host);
  rootEl.replaceChildren(root);

  currentRoot = root;
  formEl = root.querySelector("#evt-form");
  saveBtn = root.querySelector("#btn-save");
  resetBtn = root.querySelector("#btn-reset");
  statusEl = root.querySelector("#gce-status");

  bindBus();

  formEl.addEventListener("submit", handleSubmit);
  formEl.addEventListener("input", (e) => {
    if (e.target.matches?.("[data-field]")) handleInput();
  });
  resetBtn.addEventListener("click", handleReset);

  clearForm();
  markDirty(false);
  updateFormState();
  return root;
}

export function mount(selector){
  const el = document.querySelector(selector);
  if(!el) throw new Error("Elemento não encontrado: " + selector);
  return render(el);
}
