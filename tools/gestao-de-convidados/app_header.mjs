// tools/gestao-de-convidados/app_header.mjs
// Cabeçalho + Painel (somente UI) — consome funções do /shared

import * as store from "../../shared/projectStore.js";   // init, listProjects, getProject, createProject, deleteProject, updateProject, exportProject (conforme seu shared)
import * as inviteUtils from "../../shared/inviteUtils.js"; // opcional (reserva para futuras ações)
import * as listUtils   from "../../shared/listUtils.js";   // opcional (reserva para futuras ações)

// ---------- helpers mínimos de UI ----------
const $ = (root, sel) => root.querySelector(sel);
const esc = (s) => (s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
const fmtDate = (iso) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString() : "—");
const phoneDigits = (v) => { let d = (v || "").replace(/\D/g, ""); if (d.startsWith("55") && d.length > 11) d = d.slice(2); return d.slice(-11); };
const phoneDisplay = (d) => !d ? "" : (d.length===11 ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}` :
                                        d.length===10 ? `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}` :
                                        d.length>2 ? `(${d.slice(0,2)}) ${d.slice(2)}` : d);

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

// Evento global emitido sempre que o projeto ativo muda; as abas podem ouvir com
// window.addEventListener("ac:project-change", handler)
const PROJECT_EVENT = "ac:project-change";

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

// ---------- lógica principal ----------
let currentRoot = null;
let currentPanel = null;
let currentBtn = null;
let listenersBound = false;


const globalToggleMenu = (state) => {
  if(!currentPanel || !currentBtn) return;
  const shouldOpen = typeof state === "boolean" ? state : currentPanel.hidden;
  currentPanel.hidden = !shouldOpen;
  currentBtn.setAttribute("aria-expanded", String(shouldOpen));
};

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

const cloneProject = (data) => {
  if(typeof globalThis.structuredClone === "function"){
    return globalThis.structuredClone(data);
  }
  return JSON.parse(JSON.stringify(data));
};

export async function render(rootEl){
  // cria shell
  const root = document.createElement("div");
  root.className = "ac-app";
  // injeta CSS escopado
  const style = document.createElement("style");
  style.textContent = css;
  root.appendChild(style);
  // injeta HTML
  const host = document.createElement("div");
  host.innerHTML = html;
  root.appendChild(host);
  rootEl.replaceChildren(root);

  const setStatus = (text) => {
    const dot = $(root, "#dot");
    const st  = $(root, "#status");
    st.textContent = text;
    dot.style.background = text.includes("Salv") ? "#d97706" : "#1a7f37";
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(()=>{ st.textContent = "Pronto"; dot.style.background = "#bbb"; }, 1600);
  };

  // dados
  await (store.init?.() ?? Promise.resolve());
  let lista = (await (store.listProjects?.() ?? Promise.resolve([]))) || [];
  // se listProjects não retorna convites, a UI continua funcional (mostra 0/—)

  let ativo = lista[0] || null;
  let lastProjectId;

  const notifyProjectChange = (proj) => {
    const detailId = proj?.id ?? null;
    if(detailId === lastProjectId) return;
    lastProjectId = detailId;
    if(typeof window !== "undefined" && typeof window.dispatchEvent === "function"){
      const detail = { detail: { id: detailId } };
      let evt;
      try {
        const Ctor = window.CustomEvent || CustomEvent;
        evt = new Ctor(PROJECT_EVENT, detail);
      } catch (err) {
        if(typeof document !== "undefined" && document.createEvent){
          evt = document.createEvent("CustomEvent");
          evt.initCustomEvent(PROJECT_EVENT, false, false, detail.detail);
        } else {
          return;
        }
      }
      window.dispatchEvent(evt);
    }
  };

  // UI: select topo
  const sel = $(root, "#ev-select");
  function fillSelect(){
    sel.innerHTML = (lista.map((e,i)=>
      `<option value="${i}">${esc(e?.nome || "—")} • ${e?.dataISO || "—"} • ${esc(e?.local || "—")}</option>`
    ).join("")) || "";
    sel.selectedIndex = lista.length ? 0 : -1;
  }

  // métricas/linhas
  const pessoasCount = (ev) => (ev?.convites || []).reduce((n, iv)=> n + 1 + (iv?.acompanhantes?.length || 0), 0);
  function renderUserPanel(){
    $(root, "#kpi-ev").textContent = String(lista.length);
    $(root, "#kpi-convites").textContent = String(lista.reduce((n,ev)=> n + (ev?.convites?.length||0), 0));
    $(root, "#kpi-pessoas").textContent  = String(lista.reduce((n,ev)=> n + pessoasCount(ev), 0));

    const tbody = $(root, "#user-last");
    const rows = lista.map(ev =>
      `<tr><td>${esc(ev?.nome || "—")}</td><td>${fmtDate(ev?.dataISO)}</td><td>${ev?.convites?.length || 0}</td><td>${new Date(ev?.updatedAt||0).toLocaleString()}</td></tr>`
    ).join("");
    tbody.innerHTML = rows || `<tr><td colspan="4" style="color:#666">Sem eventos.</td></tr>`;

    const tbl = $(root, "#tbl-user"); const hint = $(root, "#user-hint");
    if(lista.length>3){
      tbl.classList.add("ac-table--scroll");
      requestAnimationFrame(()=>{
        const r = tbody.querySelector("tr"); const rh = r ? r.getBoundingClientRect().height : 36;
        tbody.style.maxHeight = Math.round(rh*3 + 2) + "px"; hint.hidden = false;
      });
    } else {
      tbl.classList.remove("ac-table--scroll");
      tbody.style.maxHeight = ""; hint.hidden = true;
    }
    $(root, "#user-foot").textContent = `${lista.length} eventos`;
  }

  function renderEvento(){
    if(!ativo){ $(root, "#ev-title").textContent="—"; return; }
    // se precisar dados completos: const full = await store.getProject(ativo.id);
    const ev = ativo;
    $(root, "#ev-title").textContent = ev?.nome || "—";
    $(root, "#ev-date").textContent  = fmtDate(ev?.dataISO);
    $(root, "#ev-time").textContent  = ev?.horario || "—";
    const cidadeUF = [ev?.endereco?.cidade, ev?.endereco?.uf].filter(Boolean).join("/");
    $(root, "#ev-local").textContent = [ev?.local, cidadeUF].filter(Boolean).join(", ") || "—";
    $(root, "#ev-convites").textContent = String(ev?.convites?.length || 0);
    $(root, "#ev-pessoas").textContent  = String(pessoasCount(ev));
    $(root, "#ev-msgs").textContent     = "0";
    const end=[ev?.endereco?.logradouro,ev?.endereco?.numero,ev?.endereco?.bairro,
               ev?.endereco?.cidade && ev?.endereco?.uf ? `${ev.endereco.cidade}/${ev.endereco.uf}` : (ev?.endereco?.cidade||"")]
               .filter(Boolean).join(", ");
    $(root, "#ev-end").textContent = end || "—";
    $(root, "#ev-host").textContent = ev?.anfitriao?.nome || "—";
    const tel = phoneDigits(ev?.anfitriao?.telefone || "");
    $(root, "#ev-host-contato").textContent = [ phoneDisplay(tel), (ev?.anfitriao?.email||"") ].filter(Boolean).join(" • ") || "—";
  }

  // preencher e renderizar
  const setActive = (project, { updateSelect = true, announce = true } = {}) => {
    ativo = project || null;
    if(updateSelect){
      if(ativo){
        const idx = lista.findIndex(e => e?.id === ativo.id);
        if(idx >= 0){
          sel.value = String(idx);
        } else if(lista.length){
          sel.selectedIndex = 0;
          ativo = lista[0];
        } else {
          sel.selectedIndex = -1;
        }
      } else {
        sel.selectedIndex = -1;
      }
    }
    renderEvento();
    if(announce) notifyProjectChange(ativo);
  };

  fillSelect();
  renderUserPanel();
  setActive(ativo, { announce: true });

  // select change
  sel.addEventListener("change", (e)=>{
    const i = parseInt(e.target.value,10);
    setActive(lista[i] || ativo);
    setStatus("Evento carregado");
  });

  // menu
  const panel = $(root, "#menu-panel"); const btn = $(root, "#btn-menu");
  currentRoot = root;
  currentPanel = panel;
  currentBtn = btn;
  btn.addEventListener("click", ()=>globalToggleMenu());
  bindGlobalListeners();

  // modal carregar
  function openModal(){
    const tb = $(root, "#tbl-evs");
    const rows = lista.map((ev,i)=>`
      <tr>
        <td>${esc(ev?.nome||"—")}</td>
        <td>${fmtDate(ev?.dataISO)}</td>
        <td>${ev?.convites?.length||0}</td>
        <td>${new Date(ev?.updatedAt||0).toLocaleString()}</td>
        <td><button class="ac-iconbtn" data-load="${i}" title="Selecionar">→</button></td>
      </tr>`).join("");
    tb.innerHTML = rows;
    $(root, "#modal").hidden = false;
  }

  root.addEventListener("click",(e)=>{
    if(e.target.matches('[data-action="fechar-modal"]')) $(root, "#modal").hidden = true;

    const it = e.target.closest(".ac-dd__item");
    if(it){
      const act = it.getAttribute("data-action");
      if(act==="novo")     createNew().catch(console.error);
      if(act==="carregar") openModal();
      if(act==="duplicar") duplicateActive().catch(console.error);
      if(act==="deletar")  deleteActive().catch(console.error);
      if(act==="imprimir") window.print();
      globalToggleMenu(false);
    }
    const b = e.target.closest("[data-load]");
    if(b){
      const i = parseInt(b.getAttribute("data-load"),10);
      setActive(lista[i] || ativo);
      $(root, "#modal").hidden = true;
      setStatus("Evento carregado");
    }
  });

  async function refreshIndex({ preferredId } = {}){
    const previousId = ativo?.id ?? null;
    lista = (await (store.listProjects?.() ?? Promise.resolve([]))) || [];
    fillSelect();
    renderUserPanel();
    let nextActive = null;
    const targetId = preferredId ?? previousId;
    if(targetId){
      nextActive = lista.find(e => e?.id === targetId) || null;
    }
    if(!nextActive && lista.length){
      nextActive = lista[0];
    }
    const changed = (nextActive?.id ?? null) !== previousId;
    setActive(nextActive, { announce: changed });
  }

  currentRefresh = refreshIndex;

  async function duplicateActive(){
    if(!ativo){ setStatus("Sem evento ativo"); return; }
    const full = (await store.getProject?.(ativo.id)) || ativo;
    // cria uma cópia rascunho
    const clone = cloneProject(full);
    delete clone.id; // força novo id
    clone.evento = clone.evento || {};
    clone.evento.nome = (clone.evento.nome || ativo.nome || "Evento") + " (cópia)";
    const res = await store.createProject?.(clone);
    const novoId = res?.meta?.id;
    await refreshIndex({ preferredId: novoId });
    setStatus("Duplicado");
  }

  async function deleteActive(){
    if(!ativo){ setStatus("Sem evento ativo"); return; }
    const ok = confirm("Excluir este evento? Esta ação não pode ser desfeita.");
    if(!ok) return;
    await store.deleteProject?.(ativo.id);
    await refreshIndex();
    setStatus("Excluído");
  }

  async function createNew(){
    const res = await store.createProject?.({});
    const novoId = res?.meta?.id;
    await refreshIndex({ preferredId: novoId });
    setStatus("Evento criado");
  }

  async function createNew(){
    const res = await store.createProject?.({});
    setStatus("Evento criado");
    await refreshIndex();
    const novoId = res?.meta?.id;
    const idx = lista.findIndex(e => e?.id === novoId);
    if(idx >= 0){
      ativo = lista[idx];
      sel.value = String(idx);
      await renderEvento();
    }
  }
}

// atalho opcional: montar por seletor
export function mount(selector){
  const el = document.querySelector(selector);
  if(!el) throw new Error("Elemento não encontrado: " + selector);
  return render(el);
}

// Permite que outras ferramentas forcem a atualização do cabeçalho após editar
// o projeto ativo (ex.: store.updateProject). Basta chamar appHeader.buzz().
export async function buzz(){
  if(typeof currentRefresh === "function"){
    await currentRefresh();
  }
}
