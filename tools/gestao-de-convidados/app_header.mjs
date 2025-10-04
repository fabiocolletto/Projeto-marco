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

function formatDateLabel(evento){
  if(!evento) return '';
  const { dataISO, horaISO, data, hora } = evento;
  const iso = dataISO || data || '';
  const time = horaISO || hora || '';
  if(!iso && !time) return '';
  try{
    if(iso){
      const d = new Date(iso);
      if(!Number.isNaN(+d)){
        const dateStr = d.toLocaleDateString('pt-BR');
        const timeStr = time ? time.toString().slice(0,5) : (d.toTimeString().slice(0,5));
        return [dateStr, timeStr].filter(Boolean).join(' ');
      }
    }
  }catch{}
  if(typeof iso === 'string' && iso.includes('-')){
    const parts = iso.split('T')[0].split('-');
    const dateStr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
    const timeStr = time ? time.toString().slice(0,5) : '';
    return [dateStr, timeStr].filter(Boolean).join(' ');
  }
  return [iso, time ? time.toString().slice(0,5) : ''].filter(Boolean).join(' ');
}

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

    const totalLista = lista.length;
    const confirmed = countConfirmed(lista);
    const pending = Math.max(0, totalLista - confirmed);
    if(ui.counts.lista) ui.counts.lista.textContent = String(totalLista);
    if(ui.counts.convidados) ui.counts.convidados.textContent = `${confirmed} confirmados • ${pending} pendentes`;
  }

  function cloneProject(data){
    if(typeof globalThis?.structuredClone === "function"){
      return globalThis.structuredClone(data);
    }
    if(!data || typeof data !== "object") return data;
    const plain = JSON.parse(JSON.stringify(data));
    if(Array.isArray(data.lista) && !Array.isArray(plain.lista)) plain.lista = [...data.lista];
    if(Array.isArray(data.tipos) && !Array.isArray(plain.tipos)) plain.tipos = [...data.tipos];
    if(data.modelos && typeof data.modelos === "object" && !plain.modelos) plain.modelos = { ...data.modelos };
    if(data.vars && typeof data.vars === "object" && !plain.vars) plain.vars = { ...data.vars };
    return plain;
  }

  async function duplicateActive(){
    if(!ativo){ setStatus("Sem evento ativo"); return; }
    const full = (await store.getProject?.(ativo.id)) || ativo;
    // cria uma cópia rascunho
    const clone = cloneProject(full);
    delete clone.id; // força novo id
    clone.evento = clone.evento || {};
    clone.evento.nome = (clone.evento.nome || ativo.nome || "Evento") + " (cópia)";
    const res = await store.createProject?.(clone);
    setStatus("Duplicado");
    await refreshIndex();
    // seleciona a cópia como ativa
    const novoId = res?.meta?.id;
    const idx = lista.findIndex(e => e?.id === novoId);
    if(idx >= 0){ ativo = lista[idx]; sel.value = String(idx); await renderEvento(); }
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
