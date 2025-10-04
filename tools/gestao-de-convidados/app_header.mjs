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

function pickElement(ref, fallbacks){
  if(ref instanceof Element) return ref;
  if(typeof ref === 'string'){ try{ return document.querySelector(ref); }catch{ return null; } }
  if(Array.isArray(fallbacks)){
    for(const sel of fallbacks){
      try{
        const el = document.querySelector(sel);
        if(el) return el;
      }catch{}
    }
  }
  return null;
}

// TODO: Reintroduzir item de ajuda no menu quando houver URL/arquivo de suporte disponível.
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

function extractEvento(payload){
  if(!payload || typeof payload !== 'object') return {};
  if(payload.evento && typeof payload.evento === 'object') return payload.evento;
  return {};
}

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
      if(act==="carregar") openModal();
      if(act==="duplicar") duplicateActive().catch(console.error);
      if(act==="deletar")  deleteActive().catch(console.error);
      if(act==="imprimir") window.print();
      toggleMenu(false);
    }
    const b = e.target.closest("[data-load]");
    if(b){
      const i = parseInt(b.getAttribute("data-load"),10);
      ativo = lista[i] || ativo;
      sel.value = String(i);
      renderEvento();
      $(root, "#modal").hidden = true;
      setStatus("Evento carregado");
    }

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

export default { createHeaderController };
