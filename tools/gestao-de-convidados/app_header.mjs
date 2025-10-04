export const projectDetails = new Map();

const FALLBACK_SELECTORS = {
  select: ['#switchEvent', '#projectSelect', '[data-role="project-select"]'],
  tableBody: ['[data-role="project-list"] tbody', '[data-role="project-list"]', '#projectTable tbody'],
  kpiTotal: ['[data-role="kpi-total"]', '#kpiTotal'],
  kpiConfirmed: ['[data-role="kpi-confirmed"]', '#kpiConfirmed'],
  kpiPending: ['[data-role="kpi-pending"]', '#kpiPending'],
  eventTitle: ['[data-role="evento-nome"]', '#eventoNome', '#evTitle'],
  eventDate: ['[data-role="evento-data"]', '#eventoData'],
  eventLocal: ['[data-role="evento-local"]', '#eventoLocal'],
  eventAddress: ['[data-role="evento-endereco"]', '#eventoEndereco'],
  eventHost: ['[data-role="evento-anfitriao"]', '#eventoAnfitriao'],
  eventUpdated: ['[data-role="evento-updated"]', '#eventoUpdated'],
  countLista: ['[data-role="evento-lista-count"]', '#eventoListaCount'],
  countConvidados: ['[data-role="evento-convidados-count"]', '#eventoConvidadosCount']
};

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

function formatMetaDate(meta){
  if(!meta) return '';
  const dataISO = meta.dataISO || meta.data || '';
  const hora = meta.hora || '';
  if(!dataISO && !hora) return '';
  return formatDateLabel({ dataISO, hora });
}

function extractList(payload){
  if(!payload || typeof payload !== 'object') return [];
  if(Array.isArray(payload.lista)) return payload.lista;
  if(Array.isArray(payload.convidados)) return payload.convidados;
  return [];
}

function countConfirmed(list){
  let confirmed = 0;
  for(const item of list){
    if(!item) continue;
    const status = String(item.status ?? item.confirmacao ?? item.rsvp ?? '').toLowerCase();
    const truthy = item.confirmado ?? item.confirmada ?? item.presenca ?? item.presença;
    if(truthy === true){ confirmed++; continue; }
    if(typeof truthy === 'string' && /^(sim|yes|y|confirmad[ao]|ok|1)$/.test(truthy.toLowerCase())){ confirmed++; continue; }
    if(['confirmado','confirmada','presença confirmada','confirmada'].includes(status)) confirmed++;
  }
  return confirmed;
}

// ---------- lógica principal ----------
let currentRoot = null;
let currentPanel = null;
let currentBtn = null;
let listenersBound = false;
let currentRefresh = null;

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

function extractHost(payload){
  const evento = extractEvento(payload);
  if(evento.anfitriao && typeof evento.anfitriao === 'object') return evento.anfitriao;
  if(payload.anfitriao && typeof payload.anfitriao === 'object') return payload.anfitriao;
  return {};
}

function extractEndereco(payload){
  const evento = extractEvento(payload);
  if(evento.endereco && typeof evento.endereco === 'object') return evento.endereco;
  if(payload.endereco && typeof payload.endereco === 'object') return payload.endereco;
  return {};
}

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
function joinAddress(addr){
  if(!addr || typeof addr !== 'object') return '';
  const { logradouro, numero, bairro, cidade, uf, complemento } = addr;
  const main = [logradouro, numero, bairro, cidade, uf].filter(Boolean).join(', ');
  if(complemento) return main? `${main} (${complemento})` : complemento;
  return main;
}

export function createHeaderController({ store, bus, elements = {} } = {}){
  const ui = {
    select: pickElement(elements.select, FALLBACK_SELECTORS.select),
    tableBody: pickElement(elements.tableBody, FALLBACK_SELECTORS.tableBody),
    kpis: {
      total: pickElement(elements.kpiTotal, FALLBACK_SELECTORS.kpiTotal),
      confirmed: pickElement(elements.kpiConfirmed, FALLBACK_SELECTORS.kpiConfirmed),
      pending: pickElement(elements.kpiPending, FALLBACK_SELECTORS.kpiPending)
    },
    evento: {
      title: pickElement(elements.eventTitle, FALLBACK_SELECTORS.eventTitle),
      date: pickElement(elements.eventDate, FALLBACK_SELECTORS.eventDate),
      local: pickElement(elements.eventLocal, FALLBACK_SELECTORS.eventLocal),
      address: pickElement(elements.eventAddress, FALLBACK_SELECTORS.eventAddress),
      host: pickElement(elements.eventHost, FALLBACK_SELECTORS.eventHost),
      updated: pickElement(elements.eventUpdated, FALLBACK_SELECTORS.eventUpdated)
    },
    counts: {
      lista: pickElement(elements.countLista, FALLBACK_SELECTORS.countLista),
      convidados: pickElement(elements.countConvidados, FALLBACK_SELECTORS.countConvidados)
    }
  };

  const state = {
    metas: [],
    activeId: null,
    store,
    bus
  };

  function getDetail(id){
    return projectDetails.get(id);
  }

  function upsertDetail(detail){
    if(detail && detail.id){
      projectDetails.set(detail.id, detail);
    }
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
  async function refreshIndex(){
    const storeRef = state.store;
    const listed = storeRef?.listProjects?.();
    const metas = Array.isArray(listed) ? listed : (listed || []);
    state.metas = metas;
    if(!metas.length){
      projectDetails.clear();
      fillSelect();
      renderUserPanel();
      return metas;
    }
    const tuples = await Promise.all(metas.map(async meta => {
      if(!meta?.id) return null;
      try{
        const payload = await storeRef?.getProject?.(meta.id);
        return { id: meta.id, payload: payload || null };
      }catch(error){
        console.warn('[app_header] Falha ao carregar detalhes do projeto', meta.id, error);
        return { id: meta.id, payload: null };
      }
    }));
    projectDetails.clear();
    tuples.forEach(t => { if(t) projectDetails.set(t.id, t); });
    fillSelect();
    renderUserPanel();
    if(state.activeId){
      renderEvento();
    }
    return metas;
  }

  function fillSelect(){
    const selectEl = ui.select;
    if(!selectEl) return;
    const frag = document.createDocumentFragment();
    const metas = state.metas || [];
    for(const meta of metas){
      const entry = getDetail(meta.id);
      const payload = entry?.payload || null;
      const evento = extractEvento(payload);
      const labelParts = [];
      const nome = evento.nome || meta.nome || meta.id;
      if(nome) labelParts.push(nome);
      const dateStr = formatDateLabel(evento) || formatMetaDate(meta);
      if(dateStr) labelParts.push(dateStr);
      if(evento.local) labelParts.push(evento.local);
      else if(meta.local) labelParts.push(meta.local);
      const option = document.createElement('option');
      option.value = meta.id;
      option.textContent = labelParts.join(' • ') || meta.id;
      option.selected = meta.id === state.activeId;
      option.dataset.metaName = meta.nome || '';
      if(evento.dataISO) option.dataset.eventoDataIso = evento.dataISO;
      if(evento.local) option.dataset.eventoLocal = evento.local;
      frag.appendChild(option);
    }
    selectEl.innerHTML = '';
    selectEl.appendChild(frag);
  }

  function renderUserPanel(){
    const body = ui.tableBody;
    if(body){
      const frag = document.createDocumentFragment();
      state.metas.forEach((meta, index)=>{
        const entry = getDetail(meta.id);
        const payload = entry?.payload || null;
        const evento = extractEvento(payload);
        const list = extractList(payload);
        const confirmed = countConfirmed(list);
        const row = document.createElement('tr');
        const cols = [
          index + 1,
          evento.nome || meta.nome || meta.id,
          formatDateLabel(evento) || formatMetaDate(meta),
          evento.local || meta.local || '—',
          list.length,
          confirmed
        ];
        cols.forEach(val =>{
          const td = document.createElement('td');
          td.textContent = val === undefined || val === null || val === '' ? '—' : String(val);
          row.appendChild(td);
        });
        row.dataset.projectId = meta.id;
        frag.appendChild(row);
      });
      body.innerHTML = '';
      body.appendChild(frag);
    }

    const totals = state.metas.reduce((acc, meta)=>{
      const entry = getDetail(meta.id);
      const payload = entry?.payload || null;
      const list = extractList(payload);
      acc.total += list.length;
      acc.confirmed += countConfirmed(list);
      return acc;
    }, { total:0, confirmed:0 });
    totals.pending = Math.max(0, totals.total - totals.confirmed);

    if(ui.kpis.total) ui.kpis.total.textContent = String(totals.total);
    if(ui.kpis.confirmed) ui.kpis.confirmed.textContent = String(totals.confirmed);
    if(ui.kpis.pending) ui.kpis.pending.textContent = String(totals.pending);
  }

  function renderEvento(){
    if(!state.activeId) return;
    const meta = state.metas.find(m => m.id === state.activeId) || {};
    const entry = getDetail(state.activeId);
    const payload = entry?.payload || null;
    const evento = extractEvento(payload);
    const host = extractHost(payload);
    const endereco = extractEndereco(payload);
    const lista = extractList(payload);

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
    if(ui.evento.title) ui.evento.title.textContent = evento.nome || meta.nome || meta.id || '—';
    const dateText = formatDateLabel(evento) || formatMetaDate(meta) || '—';
    if(ui.evento.date) ui.evento.date.textContent = dateText;
    if(ui.evento.local) ui.evento.local.textContent = evento.local || meta.local || '—';
    if(ui.evento.address) ui.evento.address.textContent = joinAddress(endereco) || '—';
    const hostName = host.nome || host.nomeCompleto || host.responsavel;
    if(ui.evento.host) ui.evento.host.textContent = hostName || '—';
    if(ui.evento.updated){
      const updatedAt = payload?.updatedAt || meta.updatedAt;
      if(updatedAt){
        try{
          const d = new Date(updatedAt);
          ui.evento.updated.textContent = Number.isNaN(+d)
            ? String(updatedAt)
            : d.toLocaleString('pt-BR');
        }catch{
          ui.evento.updated.textContent = String(updatedAt);
        }
      }else{
        ui.evento.updated.textContent = '—';
      }
    }

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
    const totalLista = lista.length;
    const confirmed = countConfirmed(lista);
    const pending = Math.max(0, totalLista - confirmed);
    if(ui.counts.lista) ui.counts.lista.textContent = String(totalLista);
    if(ui.counts.convidados) ui.counts.convidados.textContent = `${confirmed} confirmados • ${pending} pendentes`;
  }

  async function setActive(id){
    if(!id) return;
    state.activeId = id;
    if(!projectDetails.has(id)){
      try{
        const payload = await state.store?.getProject?.(id);
        upsertDetail({ id, payload: payload || null });
      }catch(error){
        console.warn('[app_header] Falha ao atualizar detalhes do projeto selecionado', id, error);
        upsertDetail({ id, payload: null });
      }
    }
    renderEvento();
    notifyProjectChange(id);
  }

  function notifyProjectChange(id){
    if(!id) return;
    const meta = state.metas.find(m => m.id === id) || null;
    const payload = getDetail(id)?.payload || null;
    try{
      state.bus?.publish?.('ac:project-change', { id, meta, payload });
    }catch(error){
      console.warn('[app_header] Falha ao publicar mudança de projeto', error);
    }
    try{
      window.dispatchEvent(new CustomEvent('ac:project-change', { detail: { id, meta, payload } }));
    }catch{}
  }

  return {
    get projectDetails(){ return projectDetails; },
    refreshIndex,
    fillSelect,
    renderUserPanel,
    renderEvento,
    setActive,
    notifyProjectChange
  };
}

// Permite que outras ferramentas forcem a atualização do cabeçalho após editar
// o projeto ativo (ex.: store.updateProject). Basta chamar appHeader.buzz().
export async function buzz(){
  if(typeof currentRefresh === "function"){
    await currentRefresh();
  }
}
export default { createHeaderController };
