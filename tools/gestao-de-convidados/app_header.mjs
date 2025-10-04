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

  // dados
  await (store.init?.() ?? Promise.resolve());
  let lista = (await (store.listProjects?.() ?? Promise.resolve([]))) || [];
  // se listProjects não retorna convites, a UI continua funcional (mostra 0/—)

  const projectDetails = new Map();
  const notifyProjectChange = typeof globalThis.notifyProjectChange === "function"
    ? globalThis.notifyProjectChange
    : null;

  let activeId = lista[0]?.id ?? null;

  const mapConvites = (data) => {
    if(!data) return [];
    if(Array.isArray(data.lista)) return data.lista;
    if(Array.isArray(data.convites)) return data.convites;
    return [];
  };
  const pessoasCount = (data) => mapConvites(data).reduce((n, iv)=> n + 1 + (iv?.acompanhantes?.length || 0), 0);

  const getMetaById = (id) => lista.find(ev => ev?.id === id) || null;
  const getDetailEntry = (id) => (id ? projectDetails.get(id) : null) || null;
  const getPayloadById = (id) => getDetailEntry(id)?.payload;

  async function loadProjectDetails(metaList){
    if(typeof store.getProject !== "function") return;
    const metas = (metaList || []).filter(meta => meta?.id);
    const ids = new Set(metas.map(meta => meta.id));
    [...projectDetails.keys()].forEach(key => { if(!ids.has(key)) projectDetails.delete(key); });
    const details = await Promise.all(metas.map(async meta => {
      try {
        const payload = await store.getProject(meta.id);
        return { id: meta.id, payload };
      } catch(err){
        console.error("Falha ao carregar projeto", meta?.id, err);
        return { id: meta.id, payload: null };
      }
    }));
    details.forEach(entry => {
      if(!entry) return;
      projectDetails.set(entry.id, entry);
    });
  }

  await loadProjectDetails(lista);

  // UI: select topo
  const sel = $(root, "#ev-select");
  function fillSelect(){
    sel.innerHTML = (lista.map((meta,i)=>{
      const payload = getPayloadById(meta?.id);
      const evento = payload?.evento || {};
      const nome = evento?.nome || meta?.nome || "—";
      const dataISO = evento?.dataISO || evento?.data || meta?.dataISO || null;
      const local = evento?.local || meta?.local || "—";
      const dataTxt = fmtDate(dataISO);
      return `<option value="${i}">${esc(nome)} • ${dataTxt || "—"} • ${esc(local)}</option>`;
    }).join("")) || "";
    const idx = lista.findIndex(meta => meta?.id === activeId);
    sel.selectedIndex = idx >= 0 ? idx : (lista.length ? 0 : -1);
  }

  // métricas/linhas
  function renderUserPanel(){
    $(root, "#kpi-ev").textContent = String(lista.length);
    const totals = lista.reduce((acc, meta) => {
      const payload = getPayloadById(meta?.id) || meta;
      const convites = mapConvites(payload);
      acc.convites += convites.length;
      acc.pessoas += pessoasCount(payload);
      return acc;
    }, { convites:0, pessoas:0 });
    $(root, "#kpi-convites").textContent = String(totals.convites);
    $(root, "#kpi-pessoas").textContent  = String(totals.pessoas);

    const tbody = $(root, "#user-last");
    const rows = lista.map(meta => {
      const payload = getPayloadById(meta?.id) || meta;
      const evento = payload?.evento || {};
      const nome = evento?.nome || meta?.nome || "—";
      const dataISO = evento?.dataISO || evento?.data || meta?.dataISO || null;
      const convites = mapConvites(payload).length;
      const updated = payload?.updatedAt || meta?.updatedAt || 0;
      return `<tr><td>${esc(nome)}</td><td>${fmtDate(dataISO)}</td><td>${convites}</td><td>${new Date(updated).toLocaleString()}</td></tr>`;
    }).join("");
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
  }

  async function renderEvento(){
    const meta = getMetaById(activeId);
    if(!meta){
      $(root, "#ev-title").textContent="—";
      $(root, "#ev-date").textContent="—";
      $(root, "#ev-time").textContent="—";
      $(root, "#ev-local").textContent="—";
      $(root, "#ev-convites").textContent = "0";
      $(root, "#ev-pessoas").textContent = "0";
      $(root, "#ev-msgs").textContent = "0";
      $(root, "#ev-end").textContent = "—";
      $(root, "#ev-host").textContent = "—";
      $(root, "#ev-host-contato").textContent = "—";
      return;
    }
    const detail = getDetailEntry(meta.id);
    const full = detail?.payload || null;
    const evento = full?.evento || {};
    const nome = evento?.nome || meta?.nome || "—";
    const dataISO = evento?.dataISO || evento?.data || meta?.dataISO || null;
    const horario = evento?.horario || evento?.hora || meta?.horario || "—";
    const local = evento?.local || meta?.local || "—";
    const cidade = evento?.cidade || evento?.cidadeUF || meta?.endereco?.cidade;
    const uf = evento?.uf || meta?.endereco?.uf;
    const cidadeUF = [cidade, uf].filter(Boolean).join("/");
    const convitesArr = mapConvites(full || meta);
    $(root, "#ev-title").textContent = nome;
    $(root, "#ev-date").textContent  = fmtDate(dataISO);
    $(root, "#ev-time").textContent  = horario || "—";
    $(root, "#ev-local").textContent = [local, cidadeUF].filter(Boolean).join(", ") || local || "—";
    $(root, "#ev-convites").textContent = String(convitesArr.length);
    $(root, "#ev-pessoas").textContent  = String(pessoasCount(full || meta));
    $(root, "#ev-msgs").textContent     = "0";
    const enderecoMeta = meta?.endereco || {};
    const enderecoFull = full?.evento?.endereco || full?.endereco || evento?.endereco || enderecoMeta;
    const endParts = [
      enderecoFull?.logradouro || evento?.logradouro || enderecoMeta?.logradouro,
      enderecoFull?.numero || evento?.numero || enderecoMeta?.numero,
      enderecoFull?.bairro || evento?.bairro || enderecoMeta?.bairro,
      (enderecoFull?.cidade || evento?.cidade || enderecoMeta?.cidade) && (enderecoFull?.uf || evento?.uf || enderecoMeta?.uf)
        ? `${enderecoFull?.cidade || evento?.cidade || enderecoMeta?.cidade}/${enderecoFull?.uf || evento?.uf || enderecoMeta?.uf}`
        : (enderecoFull?.cidade || evento?.cidade || enderecoMeta?.cidade || "")
    ].filter(Boolean);
    $(root, "#ev-end").textContent = endParts.join(", ") || "—";
    const hostData = full?.anfitriao || full?.evento?.anfitriao || meta?.anfitriao || {};
    $(root, "#ev-host").textContent = hostData?.nome || hostData?.nomeCompleto || "—";
    const tel = phoneDigits(hostData?.telefone || hostData?.telefonePrincipal || "");
    $(root, "#ev-host-contato").textContent = [ phoneDisplay(tel), (hostData?.email||"") ].filter(Boolean).join(" • ") || "—";
  }

  // preencher e renderizar
  fillSelect(); renderUserPanel(); await setActive(activeId);

  // select change
  sel.addEventListener("change", async (e)=>{
    const i = parseInt(e.target.value,10);
    const meta = lista[i] || getMetaById(activeId);
    await setActive(meta?.id);
    setStatus("Evento carregado");
  });

    const totals = state.metas.reduce((acc, meta)=>{
      const entry = getDetail(meta.id);
      const payload = entry?.payload || null;
      const list = extractList(payload);
      acc.total += list.length;
      acc.confirmed += countConfirmed(list);
      return acc;
    }, { total:0, confirmed:0 });
    totals.pending = Math.max(0, totals.total - totals.confirmed);

  // modal carregar
  function openModal(){
    const tb = $(root, "#tbl-evs");
    const rows = lista.map((meta,i)=>{
      const payload = getPayloadById(meta?.id) || meta;
      const evento = payload?.evento || {};
      const nome = evento?.nome || meta?.nome || "—";
      const dataISO = evento?.dataISO || evento?.data || meta?.dataISO || null;
      const convites = mapConvites(payload).length;
      const updated = payload?.updatedAt || meta?.updatedAt || 0;
      return `
      <tr>
        <td>${esc(nome)}</td>
        <td>${fmtDate(dataISO)}</td>
        <td>${convites}</td>
        <td>${new Date(updated).toLocaleString()}</td>
        <td><button class="ac-iconbtn" data-load="${i}" title="Selecionar">→</button></td>
      </tr>`;
    }).join("");
    tb.innerHTML = rows;
    $(root, "#modal").hidden = false;
  }

  root.addEventListener("click", async (e)=>{
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
      const meta = lista[i] || getMetaById(activeId);
      sel.value = String(i);
      await setActive(meta?.id);
      $(root, "#modal").hidden = true;
      setStatus("Evento carregado");
    }
  });

  async function refreshIndex(){
    lista = (await (store.listProjects?.() ?? Promise.resolve([]))) || [];
    await loadProjectDetails(lista);
    const idx = lista.findIndex(e => e?.id === activeId);
    const nextActiveId = idx < 0 ? (lista[0]?.id ?? null) : activeId;
    fillSelect(); renderUserPanel(); // preserva 'ativo' se ainda existir
    if(nextActiveId){
      const selIdx = lista.findIndex(e => e?.id === nextActiveId);
      if(selIdx >= 0) sel.value = String(selIdx);
    }
    await setActive(nextActiveId);
  }

  async function duplicateActive(){
    const meta = getMetaById(activeId);
    if(!meta){ setStatus("Sem evento ativo"); return; }
    const detail = getPayloadById(meta.id);
    const full = detail || (await store.getProject?.(meta.id)) || meta;
    // cria uma cópia rascunho
    const clone = cloneProject(full);
    delete clone.id; // força novo id
    clone.evento = clone.evento || {};
    clone.evento.nome = (clone.evento.nome || meta.nome || "Evento") + " (cópia)";
    const res = await store.createProject?.(clone);
    setStatus("Duplicado");
    await refreshIndex();
    // seleciona a cópia como ativa
    const novoId = res?.meta?.id;
    const idx = lista.findIndex(e => e?.id === novoId);
    if(idx >= 0){ sel.value = String(idx); await setActive(lista[idx]?.id); }
  }

  async function deleteActive(){
    const meta = getMetaById(activeId);
    if(!meta){ setStatus("Sem evento ativo"); return; }
    const ok = confirm("Excluir este evento? Esta ação não pode ser desfeita.");
    if(!ok) return;
    await store.deleteProject?.(meta.id);
    setStatus("Excluído");
    await refreshIndex();
    await setActive(lista[0]?.id ?? null);
  }

  async function createNew(){
    const res = await store.createProject?.({});
    setStatus("Evento criado");
    await refreshIndex();
    const novoId = res?.meta?.id;
    const idx = lista.findIndex(e => e?.id === novoId);
    if(idx >= 0){
      sel.value = String(idx);
      await setActive(lista[idx]?.id);
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
  async function setActive(id){
    const prevId = activeId;
    activeId = id ?? null;
    const idx = lista.findIndex(meta => meta?.id === activeId);
    if(idx >= 0){
      sel.value = String(idx);
    } else if(sel){
      sel.selectedIndex = -1;
    }
    await renderEvento();
    if(notifyProjectChange && prevId !== activeId) notifyProjectChange(activeId);
  }
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
