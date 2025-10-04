// tools/gestao-de-convidados/app_header.mjs
// Ponto de entrada do Assistente Cerimonial — V5 (modular, pronto para uso)
// - Shell + navegação
// - Import dinâmico das views
// - CSS mínimo namespaced (.ac-app) — tipografia herda do site
import { qs, on, mount, spinner, showToast, cssBase } from './ui/dom.mjs';

let store = null;

async function ensureStore(){
  if (store) return store;
  if (globalThis.__AC_STORE__) {
    store = globalThis.__AC_STORE__;
  } else {
    store = await import('/shared/projectStore.js');
  }
  return store;
}

const routes = {
  convites: () => import('./views/convites.mjs'),
  evento: () => import('./views/evento.mjs'),
  agenda: () => import('./views/mensagens_agenda.mjs'),
  relatorio: () => import('./views/relatorio_pdf.mjs'),
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

async function render(root) {
  await ensureStore();
  injectBaseStyles();
  mountShell(root);
  await store.init?.();
  const initial = getTabFromHash() || currentTab;
  await navigate(initial);
  bindHeaderNav();
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

async function navigate(tab) {
  await ensureStore();
  const main = qs('#ac-main');
  currentTab = tab;
  main.innerHTML = spinner();
  try {
    if (typeof current.destroy === 'function') current.destroy();
    const mod = await routes[tab]();
    current = { destroy: mod.destroy || null };
    const pid = await ensureProjectId();
    await mod.render(main, {
      store,
      navigate,
      projectId: pid,
    });
    setActiveTab(tab);
  } catch (err) {
    console.error('[AC] navigate error', err);
    showToast('Erro ao carregar a tela. Veja o console.', 'error');
    main.innerHTML = '<p>Falha ao carregar a tela.</p>';
  }
}

function extractEndereco(payload){
  const evento = extractEvento(payload);
  if(evento.endereco && typeof evento.endereco === 'object') return evento.endereco;
  if(payload.endereco && typeof payload.endereco === 'object') return payload.endereco;
  return {};
}

async function ensureProjectId() {
  await ensureStore();
  // Usa o primeiro projeto existente; caso não exista, cria um com mensagens/templates default.
  const list = await store.listProjects();
  if (list && list.length) {
    return list[0].id;
  }
  const p = await store.createProject({
    evento: { titulo: 'Meu Evento', local: '', data: '', hora: '' },
  });
  return p?.id || p?.payload?.id;
}

export default { createHeaderController };
