// tools/gestao-de-convidados/app_header.mjs
// Cabeçalho + Painel (UI) — integra com o store e com o event bus compartilhado.

import * as store from "../../shared/projectStore.js";   // init, listProjects, getProject, createProject, deleteProject, updateProject, exportProject
import * as inviteUtils from "../../shared/inviteUtils.js"; // opcional (reserva para futuras ações)
import * as listUtils   from "../../shared/listUtils.js";   // opcional (reserva para futuras ações)
import { publish, subscribe } from "../../shared/marcoBus.js";

// ---------- helpers mínimos de UI ----------
const $ = (root, sel) => root?.querySelector?.(sel);
const esc = (s) => (s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
};
const phoneDigits = (v) => { let d = (v || "").replace(/\D/g, ""); if (d.startsWith("55") && d.length > 11) d = d.slice(2); return d.slice(-11); };
const phoneDisplay = (d) => !d ? "" : (d.length===11 ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}` :
                                        d.length===10 ? `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}` :
                                        d.length>2 ? `(${d.slice(0,2)}) ${d.slice(2)}` : d);
const timeNow = () => Date.now();

const css = `
.ac-app{--bg:#fff;--fg:#111;--muted:#666;--line:#111;--radius:10px;--sp-3:12px;--brand:#111;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Arial;color:var(--fg);line-height:1.45}
.ac-app *{box-sizing:border-box}
.ac-wrap{max-width:1200px;margin:0 auto;padding:var(--sp-3)}
.ac-top{position:sticky;top:0;z-index:20;background:var(--bg);border-bottom:1px solid var(--line)}
.ac-top__row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:12px 0}
.ac-event-select{display:flex;align-items:center;gap:8px}
.ac-event-select label{font-size:12px;font-weight:800;letter-spacing:.3px;text-transform:uppercase;color:var(--muted)}
.ac-event-select select{max-width:460px;min-width:220px;border:1px solid var(--line);background:var(--bg);padding:8px 10px;border-radius:var(--radius)}
.ac-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.ac-btn, .ac-iconbtn{appearance:none;border:1px solid var(--line);background:var(--bg);padding:8px 12px;border-radius:var(--radius);font-weight:800;cursor:pointer}
.ac-iconbtn{display:grid;place-items:center;width:38px;height:38px}
.ac-iconbtn svg{width:18px;height:18px}
.ac-dd{position:relative}
.ac-dd__panel{position:absolute;right:0;top:calc(100% + 6px);border:1px solid var(--line);background:var(--bg);border-radius:var(--radius);min-width:220px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,.12)}
.ac-dd__panel[hidden]{display:none}
.ac-dd__item{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer}
.ac-dd__item:hover{background:rgba(0,0,0,.04)}
.ac-infine{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:12px}
.ac-dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:#1a7f37;transition:background .2s}
.ac-panel{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
.ac-card{border-radius:var(--radius);background:var(--bg)}
.ac-card__inner{padding:14px}
.ac-card__title{margin:0 0 8px 0;font-weight:900}
.ac-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.ac-kpi{border-radius:var(--radius);padding:10px 12px;display:flex;flex-direction:column;gap:2px}
.ac-kpi strong{font-size:20px;line-height:1}
.ac-kpi span{font-size:11px;color:var(--muted)}
.ac-meta{display:flex;flex-wrap:wrap;gap:10px;color:var(--muted);font-size:12px}
.ac-table{width:100%;border-collapse:collapse}
.ac-table th,.ac-table td{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left;font-size:14px}
.ac-table thead th{position:sticky;top:0;background:var(--bg)}
.ac-table--scroll thead,.ac-table--scroll tbody tr{display:table;width:100%;table-layout:fixed}
.ac-table--scroll tbody{display:block;overflow:auto}
.ac-table__hint{margin-top:6px;color:var(--muted);font-size:12px}
@media (max-width:960px){ .ac-panel{grid-template-columns:1fr} .ac-kpis{grid-template-columns:repeat(2,minmax(0,1fr))} }
@media (max-width:560px){ .ac-kpis{grid-template-columns:1fr} .ac-event-select select{min-width:180px;max-width:55vw} }
`;

const html = `
  <div class="ac-top">
    <div class="ac-wrap">
      <div class="ac-top__row">
        <div class="ac-event-select">
          <label>Evento</label>
          <select id="ev-select" aria-label="Selecionar evento"></select>
        </div>
        <div class="ac-actions">
          <div class="ac-infine"><span class="ac-dot" id="dot"></span><span id="status">Pronto</span></div>
          <div class="ac-dd">
            <button class="ac-iconbtn" id="btn-menu" aria-haspopup="menu" aria-expanded="false" title="Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
            <div class="ac-dd__panel" id="menu-panel" role="menu" hidden>
              <div class="ac-dd__item" data-action="novo">Novo evento</div>
              <div class="ac-dd__item" data-action="carregar">Carregar…</div>
              <div class="ac-dd__item" data-action="duplicar">Duplicar evento</div>
              <div class="ac-dd__item" data-action="deletar">Excluir evento</div>
              <div class="ac-dd__item" data-action="imprimir">Imprimir</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <main class="ac-wrap">
    <div class="ac-panel">
      <section class="ac-card">
        <div class="ac-card__inner">
          <h2 class="ac-card__title">Painel do usuário</h2>
          <div class="ac-kpis">
            <div class="ac-kpi"><strong id="kpi-ev">0</strong><span>eventos</span></div>
            <div class="ac-kpi"><strong id="kpi-convites">0</strong><span>convites</span></div>
            <div class="ac-kpi"><strong id="kpi-pessoas">0</strong><span>pessoas</span></div>
          </div>
          <div style="margin-top:10px">
            <table class="ac-table ac-table--scroll" id="tbl-user" aria-label="Eventos recentes">
              <thead><tr><th>Evento</th><th>Data</th><th>Convites</th><th>Atualizado</th></tr></thead>
              <tbody id="user-last"></tbody>
            </table>
            <div class="ac-table__hint" id="user-hint" hidden>Role para ver mais eventos</div>
            <div style="margin-top:6px;text-align:right" id="user-foot"></div>
          </div>
        </div>
      </section>

      <section class="ac-card">
        <div class="ac-card__inner">
          <h2 class="ac-card__title">Evento selecionado</h2>
          <div class="ac-kpis" style="margin-top:0">
            <div class="ac-kpi"><strong id="ev-convites">0</strong><span>convites</span></div>
            <div class="ac-kpi"><strong id="ev-pessoas">0</strong><span>pessoas</span></div>
            <div class="ac-kpi"><strong id="ev-msgs">0</strong><span>agendamentos</span></div>
          </div>
          <div id="ev-title" style="font-weight:900; margin-top:10px">—</div>
          <div class="ac-meta" style="margin-top:6px">
            <span id="ev-date">—</span><span>•</span><span id="ev-time">—</span><span>•</span><span id="ev-local">—</span>
          </div>
          <div style="margin-top:10px">
            <table class="ac-table" aria-label="Resumo rápido">
              <tbody>
                <tr><th>Anfitrião</th><td id="ev-host">—</td></tr>
                <tr><th>Contato</th><td id="ev-host-contato">—</td></tr>
                <tr><th>Endereço</th><td id="ev-end">—</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </main>

  <!-- Modal carregar -->
  <div id="modal" class="ac-modal" hidden>
    <div class="ac-card" style="max-width:min(840px,95vw);margin:auto">
      <div class="ac-card__inner">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>Eventos salvos</strong>
          <button class="ac-iconbtn" data-action="fechar-modal" title="Fechar">×</button>
        </div>
        <div style="margin-top:8px">
          <table class="ac-table">
            <thead><tr><th>Título</th><th>Data</th><th>Convites</th><th>Atualizado</th><th></th></tr></thead>
            <tbody id="tbl-evs"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
`;

// ---------- estado compartilhado ----------
let currentRoot = null;
let currentPanel = null;
let currentBtn = null;
let listenersBound = false;
let busBound = false;
let statusTimer = null;
let setStatus = (text) => { if (currentRoot) { const st = $(currentRoot, "#status"); if (st) st.textContent = text; } };

let metaList = [];
const projectCache = new Map();
let activeIndex = -1;
let activeMeta = null;
let activeProject = null;

const cloneProject = (data) => {
  if (typeof globalThis.structuredClone === "function") {
    try { return globalThis.structuredClone(data); } catch {}
  }
  return JSON.parse(JSON.stringify(data ?? null));
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
    updatedAt: project?.updatedAt || timeNow(),
    metaVersion: 2
  };
}

async function ensureProjectCached(id){
  if (!id) return null;
  if (projectCache.has(id)) return projectCache.get(id);
  const full = await store.getProject?.(id);
  if (full) projectCache.set(id, full);
  return full;
}

function announceSelection(){
  if (!activeMeta || !activeProject) {
    publish("marco:project-selected", { id: null, meta: null, project: null });
    return;
  }
  publish("marco:project-selected", {
    id: activeMeta.id,
    meta: { ...activeMeta },
    project: cloneProject(activeProject)
  });
}

function publishList(){
  publish("marco:project-list-changed", { list: metaList.map(m => ({ ...m })) });
}

function renderUserPanel(){
  if (!currentRoot) return;
  $(currentRoot, "#kpi-ev").textContent = String(metaList.length);
  const totalConvites = metaList.reduce((sum, item) => sum + (item?.convites || 0), 0);
  const totalPessoas = metaList.reduce((sum, item) => sum + (item?.pessoas || item?.convites || 0), 0);
  $(currentRoot, "#kpi-convites").textContent = String(totalConvites);
  $(currentRoot, "#kpi-pessoas").textContent = String(totalPessoas);

  const tbody = $(currentRoot, "#user-last");
  if (tbody) {
    const rows = metaList.map(meta => {
      const updated = meta.updatedAt ? new Date(meta.updatedAt).toLocaleString() : "—";
      return `<tr><td>${esc(meta?.nome || "—")}</td><td>${fmtDate(meta?.dataISO)}</td><td>${meta?.convites || 0}</td><td>${updated}</td></tr>`;
    }).join("");
    tbody.innerHTML = rows || `<tr><td colspan="4" style="color:#666">Sem eventos.</td></tr>`;
  }

  const tbl = $(currentRoot, "#tbl-user");
  const hint = $(currentRoot, "#user-hint");
  if (tbl && hint && tbody) {
    if (metaList.length > 3) {
      tbl.classList.add("ac-table--scroll");
      requestAnimationFrame(()=>{
        const r = tbody.querySelector("tr");
        const rh = r ? r.getBoundingClientRect().height : 36;
        tbody.style.maxHeight = Math.round(rh*3 + 2) + "px";
        hint.hidden = false;
      });
    } else {
      tbl.classList.remove("ac-table--scroll");
      tbody.style.maxHeight = "";
      hint.hidden = true;
    }
  }

  const foot = $(currentRoot, "#user-foot");
  if (foot) foot.textContent = `${metaList.length} eventos`;
}

function renderModalList(){
  if (!currentRoot) return;
  const tb = $(currentRoot, "#tbl-evs");
  if (!tb) return;
  const rows = metaList.map((meta, idx) => {
    const updated = meta.updatedAt ? new Date(meta.updatedAt).toLocaleString() : "—";
    return `
      <tr>
        <td>${esc(meta?.nome || "—")}</td>
        <td>${fmtDate(meta?.dataISO)}</td>
        <td>${meta?.convites || 0}</td>
        <td>${updated}</td>
        <td><button class="ac-iconbtn" data-load="${idx}" title="Selecionar">→</button></td>
      </tr>`;
  }).join("");
  tb.innerHTML = rows || `<tr><td colspan="5" style="color:#666">Nenhum evento salvo.</td></tr>`;
}

function renderEvento(){
  if (!currentRoot) return;
  if (!activeProject || !activeMeta) {
    $(currentRoot, "#ev-title").textContent = "—";
    $(currentRoot, "#ev-date").textContent = "—";
    $(currentRoot, "#ev-time").textContent = "—";
    $(currentRoot, "#ev-local").textContent = "—";
    $(currentRoot, "#ev-convites").textContent = "0";
    $(currentRoot, "#ev-pessoas").textContent = "0";
    $(currentRoot, "#ev-msgs").textContent = "0";
    $(currentRoot, "#ev-host").textContent = "—";
    $(currentRoot, "#ev-host-contato").textContent = "—";
    $(currentRoot, "#ev-end").textContent = "—";
    return;
  }
  const evento = activeProject.evento || {};
  const endereco = evento.endereco || {};
  const counts = getCounts(activeProject);
  const mensagens = Array.isArray(activeProject.mensagens) ? activeProject.mensagens.length : 0;
  $(currentRoot, "#ev-title").textContent = evento.nome || "—";
  $(currentRoot, "#ev-date").textContent = fmtDate(evento.dataISO);
  $(currentRoot, "#ev-time").textContent = evento.horario || "—";
  const cidadeUF = [endereco.cidade, endereco.uf].filter(Boolean).join("/");
  $(currentRoot, "#ev-local").textContent = [evento.local, cidadeUF].filter(Boolean).join(", ") || "—";
  $(currentRoot, "#ev-convites").textContent = String(counts.convites || 0);
  $(currentRoot, "#ev-pessoas").textContent = String(counts.pessoas || 0);
  $(currentRoot, "#ev-msgs").textContent = String(mensagens);

  const host = evento.anfitriao || {};
  $(currentRoot, "#ev-host").textContent = host.nome || "—";
  const tel = phoneDigits(host.telefone || "");
  const contato = [phoneDisplay(tel), host.email].filter(Boolean).join(" • ") || "—";
  $(currentRoot, "#ev-host-contato").textContent = contato;

  const enderecoParts = [
    endereco.logradouro,
    endereco.numero,
    endereco.bairro,
    endereco.cidade && endereco.uf ? `${endereco.cidade}/${endereco.uf}` : (endereco.cidade || endereco.uf || ""),
    endereco.complemento,
    endereco.cep
  ].filter(Boolean);
  const textoLivre = endereco.textoLivre ? endereco.textoLivre : "";
  $(currentRoot, "#ev-end").textContent = enderecoParts.join(", ") || textoLivre || "—";
}

function fillSelect(){
  if (!currentRoot) return;
  const sel = $(currentRoot, "#ev-select");
  if (!sel) return;
  if (!metaList.length) {
    sel.innerHTML = "";
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  sel.innerHTML = metaList.map((meta, idx) => {
    const linha = [meta?.nome || "—", meta?.dataISO || "—", [meta?.local, meta?.cidade, meta?.uf].filter(Boolean).join(" • ")].join(" • ");
    return `<option value="${idx}">${esc(linha)}</option>`;
  }).join("");
  sel.value = activeIndex >= 0 ? String(activeIndex) : "0";
}

async function setActiveIndex(idx, { silent = false } = {}){
  if (idx < 0 || idx >= metaList.length) {
    activeIndex = -1;
    activeMeta = null;
    activeProject = null;
    renderEvento();
    if (!silent) announceSelection();
    return;
  }
  activeIndex = idx;
  activeMeta = metaList[idx];
  const cached = await ensureProjectCached(activeMeta.id);
  activeProject = cached ? cloneProject(cached) : null;
  renderEvento();
  if (!silent) announceSelection();
}

async function refreshIndex({ keepSelection = true } = {}){
  const listRaw = (await (store.listProjects?.() ?? Promise.resolve([]))) || [];
  const normalized = listRaw.map(item => ({
    ...item,
    updatedAt: item?.updatedAt ?? timeNow(),
    convites: typeof item?.convites === "number" ? item.convites : 0,
    pessoas: typeof item?.pessoas === "number" ? item.pessoas : (typeof item?.convites === "number" ? item.convites : 0),
    metaVersion: item?.metaVersion ?? 1
  })).filter(meta => meta?.id);
  const ids = new Set(normalized.map(m => m.id));
  for (const key of Array.from(projectCache.keys())) {
    if (!ids.has(key)) projectCache.delete(key);
  }
  metaList = normalized;
  await Promise.all(metaList.map(meta => ensureProjectCached(meta.id)));
  fillSelect();
  renderUserPanel();
  renderModalList();
  publishList();

  if (!metaList.length) {
    activeIndex = -1;
    activeMeta = null;
    activeProject = null;
    renderEvento();
    announceSelection();
    return;
  }

  if (keepSelection && activeMeta) {
    const idx = metaList.findIndex(m => m.id === activeMeta.id);
    if (idx >= 0) {
      activeMeta = metaList[idx];
      const cached = await ensureProjectCached(activeMeta.id);
      activeProject = cached ? cloneProject(cached) : null;
      activeIndex = idx;
      fillSelect();
      renderEvento();
      announceSelection();
      return;
    }
  }

  activeIndex = 0;
  activeMeta = metaList[0];
  const cached = await ensureProjectCached(activeMeta.id);
  activeProject = cached ? cloneProject(cached) : null;
  fillSelect();
  renderEvento();
  announceSelection();
}

function globalToggleMenu(state){
  if(!currentPanel || !currentBtn) return;
  const shouldOpen = typeof state === "boolean" ? state : currentPanel.hidden;
  currentPanel.hidden = !shouldOpen;
  currentBtn.setAttribute("aria-expanded", String(shouldOpen));
}

function bindGlobalListeners(){
  if(listenersBound) return;
  document.addEventListener("click", (e)=>{
    if(!currentRoot) return;
    const isMenuTrigger = e.target.closest?.(".ac-dd");
    if(isMenuTrigger) return;
    if(currentPanel?.hidden) return;
    globalToggleMenu(false);
  });
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape") globalToggleMenu(false);
  });
  listenersBound = true;
}

function bindBusListeners(){
  if (busBound) return;
  subscribe("marco:project-updated", ({ id, project, meta }) => {
    if (!id) return;
    if (project) {
      projectCache.set(id, cloneProject(project));
      const derivedMeta = meta ? { ...meta } : metaFromProject(project);
      const idx = metaList.findIndex(m => m.id === id);
      if (idx >= 0) {
        metaList[idx] = { ...metaList[idx], ...derivedMeta };
      } else {
        metaList.push(derivedMeta);
      }
      if (activeMeta?.id === id) {
        activeMeta = metaList.find(m => m.id === id) || derivedMeta;
        activeProject = cloneProject(project);
        renderEvento();
      }
      renderUserPanel();
      fillSelect();
      renderModalList();
      publishList();
    } else if (meta) {
      const idx = metaList.findIndex(m => m.id === id);
      if (idx >= 0) {
        metaList[idx] = { ...metaList[idx], ...meta };
        renderUserPanel();
        fillSelect();
        renderModalList();
        publishList();
      }
    }
  });

  subscribe("marco:request-project-refresh", async () => {
    await refreshIndex({ keepSelection: true });
  });

  subscribe("marco:request-project-select", async ({ id }) => {
    if (!id) return;
    const idx = metaList.findIndex(m => m.id === id);
    if (idx >= 0) {
      if (currentRoot) {
        const sel = $(currentRoot, "#ev-select");
        if (sel) sel.value = String(idx);
      }
      await setActiveIndex(idx);
    }
  });

  busBound = true;
}

async function createNew(){
  const res = await store.createProject?.({});
  if (res?.payload && res?.meta) {
    projectCache.set(res.meta.id, cloneProject(res.payload));
  }
  await refreshIndex({ keepSelection: false });
  if (res?.meta?.id) {
    const idx = metaList.findIndex(m => m.id === res.meta.id);
    if (idx >= 0 && currentRoot) {
      const sel = $(currentRoot, "#ev-select");
      if (sel) sel.value = String(idx);
      await setActiveIndex(idx, { silent: true });
      announceSelection();
    }
  }
  setStatus("Evento criado");
}

async function duplicateActive(){
  if (!activeMeta) { setStatus("Sem evento ativo"); return; }
  const base = projectCache.get(activeMeta.id) || await ensureProjectCached(activeMeta.id);
  if (!base) { setStatus("Falha ao duplicar"); return; }
  const clone = cloneProject(base);
  delete clone.id;
  clone.evento = clone.evento || {};
  clone.evento.nome = (clone.evento.nome || activeMeta.nome || "Evento") + " (cópia)";
  const res = await store.createProject?.(clone);
  if (res?.payload && res?.meta) {
    projectCache.set(res.meta.id, cloneProject(res.payload));
  }
  await refreshIndex({ keepSelection: false });
  if (res?.meta?.id) {
    const idx = metaList.findIndex(m => m.id === res.meta.id);
    if (idx >= 0 && currentRoot) {
      const sel = $(currentRoot, "#ev-select");
      if (sel) sel.value = String(idx);
      await setActiveIndex(idx);
    }
  }
  setStatus("Duplicado");
}

async function deleteActive(){
  if (!activeMeta) { setStatus("Sem evento ativo"); return; }
  const ok = confirm("Excluir este evento? Esta ação não pode ser desfeita.");
  if (!ok) return;
  await store.deleteProject?.(activeMeta.id);
  projectCache.delete(activeMeta.id);
  setStatus("Excluído");
  await refreshIndex({ keepSelection: false });
}

function bindMenu(root){
  const panel = $(root, "#menu-panel"); const btn = $(root, "#btn-menu");
  currentRoot = root;
  currentPanel = panel;
  currentBtn = btn;
  btn?.addEventListener("click", ()=>globalToggleMenu());
}

async function handleSelectChange(value){
  const idx = Number.parseInt(value, 10);
  if (Number.isNaN(idx)) return;
  await setActiveIndex(idx);
  setStatus("Evento carregado");
}

function handleRootClicks(root, e){
  if(e.target.matches('[data-action="fechar-modal"]')) $(root, "#modal").hidden = true;

  const it = e.target.closest(".ac-dd__item");
  if(it){
    const act = it.getAttribute("data-action");
    if(act==="novo")     createNew().catch(console.error);
    if(act==="carregar") { renderModalList(); $(root, "#modal").hidden = false; }
    if(act==="duplicar") duplicateActive().catch(console.error);
    if(act==="deletar")  deleteActive().catch(console.error);
    if(act==="imprimir") window.print();
    globalToggleMenu(false);
  }
  const b = e.target.closest("[data-load]");
  if(b){
    const i = parseInt(b.getAttribute("data-load"),10);
    if (!Number.isNaN(i)) {
      if (currentRoot) {
        const sel = $(currentRoot, "#ev-select");
        if (sel) sel.value = String(i);
      }
      setActiveIndex(i).then(()=>{
        $(root, "#modal").hidden = true;
        setStatus("Evento carregado");
      });
    }
  }
}

export async function render(rootEl){
  const root = document.createElement("div");
  root.className = "ac-app";
  const style = document.createElement("style");
  style.textContent = css;
  root.appendChild(style);
  const host = document.createElement("div");
  host.innerHTML = html;
  root.appendChild(host);
  rootEl.replaceChildren(root);

  currentRoot = root;
  const statusEl = $(root, "#status");
  const dot = $(root, "#dot");
  setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
    if (dot) {
      dot.style.background = text.includes("Salv") || text.includes("carregado") ? "#d97706" : "#1a7f37";
    }
    clearTimeout(statusTimer);
    statusTimer = setTimeout(()=>{
      if (statusEl) statusEl.textContent = "Pronto";
      if (dot) dot.style.background = "#bbb";
    }, 1600);
  };

  bindMenu(root);
  bindGlobalListeners();
  bindBusListeners();

  const sel = $(root, "#ev-select");
  sel?.addEventListener("change", (e) => handleSelectChange(e.target.value));

  root.addEventListener("click", (e)=> handleRootClicks(root, e));

  await (store.init?.() ?? Promise.resolve());
  await refreshIndex({ keepSelection: false });
  if (metaList.length) {
    await setActiveIndex(0, { silent: true });
    announceSelection();
  }
  renderUserPanel();
  renderModalList();
  return root;
}

// atalho opcional: montar por seletor
export function mount(selector){
  const el = document.querySelector(selector);
  if(!el) throw new Error("Elemento não encontrado: " + selector);
  return render(el);
}
