// acMiniHost.v1.mjs — Host genérico de MiniApps (2 estados: recolhido/expandido)
// Padrão: cada mini‑app tem um card/KPI (recolhido) e um painel inline (expandido)
// Uso sugerido:
/*
import * as host from '/shared/acMiniHost.v1.mjs';
import { mountTasksMiniApp } from '/shared/acTasks.v1.mjs';

host.init(bus);
host.registerMiniApp({
  id: 'tarefas',
  title: 'Tarefas',
  card: '#kpi_tasks',               // card/KPI (estado recolhido)
  panel: '#miniapp-tarefas-panel',  // container do painel (inline)
  mount: mountTasksMiniApp,
  ctx: { ac, store, bus, getCurrentId: () => state.currentId },
  mode: 'inline' // 'inline' | 'dialog' (opcional)
});
*/

// ------------------------ Infra básica ------------------------
const REG = new Map(); // id -> record
let BUS = null;

const qsel = (x)=> (typeof x === 'string' ? document.querySelector(x) : x) || null;
const once = (el, ev, fn)=>{ el?.addEventListener?.(ev, function h(e){ el.removeEventListener(ev, h); fn(e); }); };

function ensurePanelChrome(rec){
  const panel = rec.panelEl;
  if(!panel) return;
  // header (título + botão fechar)
  if(!panel.querySelector('.miniapp__header')){
    const header = document.createElement('div');
    header.className = 'miniapp__header row';
    header.style.cssText = 'align-items:center;justify-content:space-between;margin:0 0 8px 0;';

    const h = document.createElement('h3');
    h.textContent = rec.title || rec.id;
    h.style.cssText = 'margin:0;color:#0b65c2;font-size:1rem';

    const x = document.createElement('button');
    x.type='button';
    x.className='js-close btn btn--ghost';
    x.textContent='×';
    x.title='Fechar';

    header.append(h,x);
    panel.prepend(header);
  }

  // root (onde o mini‑app será montado)
  if(!panel.querySelector('.miniapp__root')){
    const root = document.createElement('div');
    root.className='miniapp__root';
    panel.appendChild(root);
  }
}

function getContainer(rec){
  // Container visual do miniapp para marcação de estado (se existir)
  return rec.cardEl?.closest?.('.ac-mini') || rec.panelEl?.closest?.('.ac-mini') || null;
}

function setState(rec, state){
  rec.state = state; // 'collapsed' | 'expanded'
  const cont = getContainer(rec);
  if(cont) cont.dataset.state = state;
  // visibilidade default
  if(rec.mode === 'dialog' && rec.panelEl?.tagName === 'DIALOG'){
    // nada aqui; aberto/fechado é controlado no expand/collapse
  }else{
    if(state==='expanded'){ rec.panelEl?.removeAttribute?.('hidden'); rec.panelEl?.style?.setProperty('display',''); }
    else{ rec.panelEl?.setAttribute?.('hidden',''); rec.panelEl?.style?.setProperty('display','none'); }
  }
}

function wireButtons(rec){
  const editBtn = rec.cardEl?.querySelector?.('.js-edit') || rec.cardEl?.querySelector?.('.edit-btn');
  if(editBtn && !editBtn.dataset._wired){
    editBtn.dataset._wired = '1';
    editBtn.addEventListener('click', ()=> expand(rec.id));
  }
  const closeBtn = rec.panelEl?.querySelector?.('.miniapp__header .js-close');
  if(closeBtn && !closeBtn.dataset._wired){
    closeBtn.dataset._wired = '1';
    closeBtn.addEventListener('click', ()=> collapse(rec.id));
  }
}

function mountIfNeeded(rec){
  if(rec.mounted) return;
  ensurePanelChrome(rec);
  wireButtons(rec);

  const root = rec.panelEl.querySelector('.miniapp__root');
  if(!root || typeof rec.mount !== 'function') return;

  // Contexto pode ter funções dinâmicas (ex.: getCurrentId)
  const ctx = typeof rec.ctx === 'function' ? rec.ctx() : rec.ctx || {};
  try{
    rec.instance = rec.mount(root, ctx) || null;
    rec.mounted = true;
  }catch(err){
    console.error('[acMiniHost] falha ao montar miniapp', rec.id, err);
  }
}

function show(rec){
  if(rec.mode === 'dialog' && rec.panelEl?.tagName === 'DIALOG'){
    // se for dialog, garantir que está montado antes de abrir
    mountIfNeeded(rec);
    try{ rec.panelEl.showModal?.(); }catch{ rec.panelEl.show?.(); }
  }else{
    mountIfNeeded(rec);
    setState(rec,'expanded');
  }
  rec.onOpen?.(rec);
  // botão Esc fecha quando inline (dialog já trata Esc nativo)
  if(rec.mode!=='dialog'){
    const esc = (ev)=>{ if(ev.key==='Escape'){ collapse(rec.id); document.removeEventListener('keydown', esc); } };
    once(document,'keydown',esc);
  }
}

function hide(rec){
  if(rec.mode === 'dialog' && rec.panelEl?.tagName === 'DIALOG'){
    try{ rec.panelEl.close?.(); }catch{}
  }else{
    setState(rec,'collapsed');
  }
  rec.onClose?.(rec);
}

// ------------------------ API pública ------------------------
export function init(bus){ BUS = bus || null; BUS?.subscribe?.('ac:project-updated', ({id})=>{
  // Atualiza painel aberto, se tiver refresh
  REG.forEach(rec=>{
    if(rec.state==='expanded' && rec.instance && typeof rec.instance.refresh==='function'){
      try{ rec.instance.refresh(); }catch(e){ /* ignora */ }
    }
  });
}); }

export function registerMiniApp(opts){
  const { id, title, card, panel, mount, ctx, mode='inline', onOpen, onClose } = (opts||{});
  if(!id) throw new Error('registerMiniApp: id obrigatório');
  const cardEl  = qsel(card);
  const panelEl = qsel(panel);
  if(!cardEl || !panelEl) throw new Error('registerMiniApp: card ou panel não encontrados');

  const rec = { id, title, cardEl, panelEl, mount, ctx, mode, onOpen, onClose, state:'collapsed', mounted:false, instance:null };
  REG.set(id, rec);

  // cromo + botões + estado inicial
  ensurePanelChrome(rec);
  wireButtons(rec);
  setState(rec,'collapsed');

  return {
    expand: ()=> expand(id),
    collapse: ()=> collapse(id),
    get state(){ return REG.get(id)?.state; },
    get mounted(){ return REG.get(id)?.mounted; }
  };
}

export function expand(id){ const rec = REG.get(id); if(!rec) return; show(rec); }
export function collapse(id){ const rec = REG.get(id); if(!rec) return; hide(rec); }
export function toggle(id){ const rec = REG.get(id); if(!rec) return; (rec.state==='expanded'? hide: show)(rec); }
export function getState(id){ return REG.get(id)?.state || 'collapsed'; }

// Utilitário: registrar vários de uma vez
export function registerMany(arr){ return (arr||[]).map(o=> registerMiniApp(o)); }

// Debug leve no console, opcional
export const _debug = { list(){ return Array.from(REG.values()).map(r=>({ id:r.id, state:r.state, mounted:r.mounted })); } };
