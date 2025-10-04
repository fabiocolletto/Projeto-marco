// tools/gestao-de-convidados/nav_tabs.mjs
// Navegador principal de abas (Painel / Dados / Convidados / Mensagens / Relatórios).

import { publish, subscribe } from "../../shared/marcoBus.js";

const DEFAULT_TABS = [
  { id: "painel", label: "Painel" },
  { id: "dados-evento", label: "Dados do evento" },
  { id: "convidados", label: "Convidados", badge: "convites" },
  { id: "mensagens", label: "Mensagens", badge: "mensagens" },
  { id: "relatorios", label: "Relatórios", badge: "relatorios" }
];

const css = `
.gtn-root{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Arial;color:#111;line-height:1.45}
.gtn-root *{box-sizing:border-box}
.gtn-shell{border-bottom:1px solid #e5e7eb;background:#fff}
.gtn-bar{display:flex;flex-wrap:wrap;gap:6px;padding:10px 0}
.gtn-tab{appearance:none;border:1px solid transparent;background:transparent;padding:10px 16px;border-radius:999px;font-weight:600;cursor:pointer;position:relative;color:#111;transition:background .2s,color .2s,border .2s}
.gtn-tab[aria-selected="true"]{background:#111;color:#fff;border-color:#111}
.gtn-tab:not([aria-selected="true"]):hover{border-color:#111}
.gtn-badge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;padding:2px 6px;border-radius:999px;font-size:11px;margin-left:8px;background:rgba(17,17,17,.08);color:#111}
.gtn-badge[hidden]{display:none}
.gtn-info{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid #f1f5f9}
.gtn-current{min-width:240px}
.gtn-name{font-size:18px;font-weight:800}
.gtn-meta{display:flex;flex-wrap:wrap;gap:6px;font-size:12px;color:#6b7280;margin-top:4px}
.gtn-pills{display:flex;flex-wrap:wrap;gap:8px}
.gtn-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#f3f4f6;font-size:12px;color:#374151}
.gtn-pill strong{font-size:14px}
@media (max-width:640px){.gtn-bar{padding-bottom:0}.gtn-info{padding:14px 0 4px 0}}
`;

let currentRoot = null;
let tabsConfig = DEFAULT_TABS;
let activeTab = null;
let busBound = false;
let metrics = { convites: 0, pessoas: 0, mensagens: 0, relatorios: 0 };
let currentMeta = { nome: "—", dataISO: "", horario: "", local: "", cidade: "", uf: "" };
let currentProject = null;

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
};

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

function updateBadges(){
  if (!currentRoot) return;
  tabsConfig.forEach(tab => {
    if (!tab.badge) return;
    const el = currentRoot.querySelector(`[data-badge-for="${tab.id}"]`);
    if (!el) return;
    const val = metrics[tab.badge] || 0;
    if (val > 0) {
      el.textContent = String(val);
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  });
}

function updateSummary(){
  if (!currentRoot) return;
  const { nome, dataISO, horario, local, cidade, uf } = currentMeta || {};
  const nameEl = currentRoot.querySelector("#gtn-name");
  const dateEl = currentRoot.querySelector("#gtn-date");
  const localEl = currentRoot.querySelector("#gtn-local");
  const convEl = currentRoot.querySelector("#gtn-convites");
  const pesEl = currentRoot.querySelector("#gtn-pessoas");
  const msgEl = currentRoot.querySelector("#gtn-msgs");
  if (nameEl) nameEl.textContent = nome || "—";
  if (dateEl) {
    const datePieces = [fmtDate(dataISO), horario || "—"].filter(Boolean);
    dateEl.textContent = datePieces.join(" • ") || "—";
  }
  if (localEl) {
    const cityUF = [cidade, uf].filter(Boolean).join("/");
    const loc = [local, cityUF].filter(Boolean).join(", ");
    localEl.textContent = loc || "—";
  }
  if (convEl) convEl.textContent = String(metrics.convites || 0);
  if (pesEl) pesEl.textContent = String(metrics.pessoas || 0);
  if (msgEl) msgEl.textContent = String(metrics.mensagens || 0);
  updateBadges();
}

function invokeAbas(tabId){
  try {
    if (typeof window !== "undefined" && typeof window.abas === "function") {
      window.abas(tabId);
    }
  } catch (err) {
    console.error("nav_tabs: falha ao chamar abas()", err);
  }
}

function setActiveTab(tabId, { silent = false } = {}){
  if (!currentRoot) return;
  if (!tabsConfig.some(tab => tab.id === tabId)) return;
  activeTab = tabId;
  currentRoot.querySelectorAll("[data-tab]").forEach(btn => {
    const isActive = btn.getAttribute("data-tab") === tabId;
    btn.setAttribute("aria-selected", String(isActive));
  });
  if (!silent) {
    publish("marco:tab-changed", { id: tabId });
    invokeAbas(tabId);
  }
}

function bindBus(){
  if (busBound) return;
  subscribe("marco:project-selected", ({ meta, project }) => {
    currentProject = project || null;
    currentMeta = meta || { nome: "—", dataISO: "", horario: "", local: "", cidade: "", uf: "" };
    if (project) {
      const counts = getCounts(project);
      metrics.convites = counts.convites;
      metrics.pessoas = counts.pessoas;
      metrics.mensagens = Array.isArray(project.mensagens) ? project.mensagens.length : 0;
      metrics.relatorios = Array.isArray(project.relatorios) ? project.relatorios.length : 0;
    } else {
      metrics = { convites: 0, pessoas: 0, mensagens: 0, relatorios: 0 };
    }
    updateSummary();
  });

  subscribe("marco:project-updated", ({ id, project, meta }) => {
    if (!id) return;
    if (project && currentProject && currentProject.id === id) {
      currentProject = project;
      currentMeta = meta || currentMeta;
      const counts = getCounts(project);
      metrics.convites = counts.convites;
      metrics.pessoas = counts.pessoas;
      metrics.mensagens = Array.isArray(project.mensagens) ? project.mensagens.length : 0;
      metrics.relatorios = Array.isArray(project.relatorios) ? project.relatorios.length : 0;
      updateSummary();
    }
  });

  subscribe("marco:request-tab", ({ id }) => {
    if (!id) return;
    setActiveTab(id);
  });

  busBound = true;
}

export function render(rootEl, { tabs = DEFAULT_TABS, initial = null } = {}){
  tabsConfig = Array.isArray(tabs) && tabs.length ? tabs : DEFAULT_TABS;
  const root = document.createElement("div");
  root.className = "gtn-root";
  const style = document.createElement("style");
  style.textContent = css;
  root.appendChild(style);

  const shell = document.createElement("div");
  shell.className = "gtn-shell";

  const nav = document.createElement("nav");
  nav.className = "gtn-bar";
  nav.setAttribute("role", "tablist");
  nav.innerHTML = tabsConfig.map(tab => `
    <button class="gtn-tab" type="button" role="tab" data-tab="${tab.id}" aria-selected="false">
      <span>${tab.label}</span>
      ${tab.badge ? `<span class="gtn-badge" data-badge-for="${tab.id}" hidden></span>` : ""}
    </button>
  `).join("");
  shell.appendChild(nav);

  const info = document.createElement("div");
  info.className = "gtn-info";
  info.innerHTML = `
    <div class="gtn-current">
      <div class="gtn-name" id="gtn-name">—</div>
      <div class="gtn-meta"><span id="gtn-date">—</span><span>•</span><span id="gtn-local">—</span></div>
    </div>
    <div class="gtn-pills">
      <span class="gtn-pill"><strong id="gtn-convites">0</strong> convites</span>
      <span class="gtn-pill"><strong id="gtn-pessoas">0</strong> pessoas</span>
      <span class="gtn-pill"><strong id="gtn-msgs">0</strong> agendamentos</span>
    </div>
  `;
  shell.appendChild(info);

  root.appendChild(shell);
  rootEl.replaceChildren(root);
  currentRoot = root;

  bindBus();

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest?.("[data-tab]");
    if (!btn) return;
    const id = btn.getAttribute("data-tab");
    setActiveTab(id);
  });

  const initialTab = initial && tabsConfig.some(tab => tab.id === initial) ? initial : (tabsConfig[0]?.id || null);
  if (initialTab) setActiveTab(initialTab, { silent: true });
  updateSummary();
  return root;
}

export function mount(selector, options){
  const el = document.querySelector(selector);
  if(!el) throw new Error("Elemento não encontrado: " + selector);
  return render(el, options);
}
