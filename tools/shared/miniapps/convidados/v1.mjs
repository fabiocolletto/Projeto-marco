import { uid as makeUid } from '../../utils/ids.mjs';
import { ensureHost } from '../../utils/dom.mjs';
import { formatMoneyBR, formatDateBR, parseDateBR, maskPhoneBR } from '../../utils/br.mjs';

// tools/shared/miniapps/convidados/v1.mjs
// Mini‑App Convidados & Convites — módulo único (sem dependências externas)
// Uso:
// import { loadSharedModule } from '../tools/shared/runtime/loader.mjs';
// const { mountConvidadosMiniApp } = await loadSharedModule('miniapps/convidados/v1.mjs');
// mountConvidadosMiniApp(host, { ac, store, bus, getCurrentId });

export function mountConvidadosMiniApp(host, deps = {}) {
  const mountPoint = ensureHost(host);
  mountPoint.classList.add('miniapp', 'miniapp--convidados');
  const { ac = {}, store = {}, bus, getCurrentId } = deps;
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const uid = () => makeUid('guest');

  const fmtMoney = (v) => ac?.format?.money ? ac.format.money(+v || 0) : formatMoneyBR(v);
  const fmtDate = (d) => ac?.format?.fmtDateBR ? ac.format.fmtDateBR(d) : formatDateBR(d);
  const parseDate = (s) => ac?.format?.parseDateBR ? ac.format.parseDateBR(s) : parseDateBR(s);
  const maskPhone = (v) => ac?.format?.maskPhone ? ac.format.maskPhone(v) : maskPhoneBR(v);

  // --- State ---
  const state = {
    projectId: getCurrentId?.()||null,
    project: null,
    items: [],
    filter: { busca:'', grupo:'', status:'', mesa:'' },
    timer:null,
  };

  // --- Markup ---
  const root = document.createElement('div');
  root.className = 'ac-convidados';
  root.innerHTML = `
    <div class="toolbar">
      <input id="q" class="grow" placeholder="Buscar por nome, telefone, e‑mail ou grupo" />
      <select id="f_grupo"><option value="">Grupo</option></select>
      <select id="f_status">
        <option value="">Status RSVP</option>
        <option value="pendente">Pendente</option>
        <option value="confirmado">Confirmado</option>
        <option value="recusado">Recusado</option>
      </select>
      <button id="btnAdd" class="btn primary">Adicionar convidado</button>
    </div>

    <div class="grid head muted">
      <div>Nome</div>
      <div>Contato</div>
      <div>Grupo/Mesa</div>
      <div class="muted">Qtd</div>
      <div>Convite</div>
      <div>RSVP</div>
      <div class="col-presenca">Presença</div>
      <div>Obs</div>
      <div></div>
    </div>
    <div id="list"></div>
  `;
  mountPoint.appendChild(root);

  const listEl = $('#list', root);
  const q      = $('#q', root);
  const fGrupo = $('#f_grupo', root);
  const fStatus= $('#f_status', root);
  $('#btnAdd', root).addEventListener('click', addItem);
  q.addEventListener('input', ()=>{ state.filter.busca=q.value.trim(); renderList(); });
  fGrupo.addEventListener('change', ()=>{ state.filter.grupo=fGrupo.value; renderList(); });
  fStatus.addEventListener('change', ()=>{ state.filter.status=fStatus.value; renderList(); });

  // --- Data helpers ---
  const ensure = (p)=>{ ac?.model?.ensureShape?.(p); p.convidados ||= []; return p.convidados; };

  function defaultItem(){
    return {
      id: uid(),
      nome: '',
      telefone: '',
      email: '',
      grupo: '',
      mesa: '',
      qtd: 1,
      convite: { enviadoEm: '', metodo: '' },
      rsvp: 'pendente', // pendente|confirmado|recusado
      presenca: false,
      obs: ''
    };
  }

  // --- Persistence ---
  function scheduleSave(){ if(state.timer) clearTimeout(state.timer); state.timer=setTimeout(doSave, 600); }
  async function doSave(){
    if(!state.projectId) return;
    const fresh = await store.getProject?.(state.projectId) || {};
    ac?.model?.ensureShape?.(fresh);
    fresh.convidados = state.items;
    fresh.updatedAt = Date.now();
    await store.updateProject?.(state.projectId, fresh);
    state.project = await store.getProject?.(state.projectId);
    bus?.publish?.('ac:project-updated', { id: state.projectId, updatedAt: fresh.updatedAt });
    renderFilters(); // manter listas atualizadas
  }

  // --- CRUD ---
  function addItem(){ ensure(state.project||{}); state.items.push(defaultItem()); renderList(true); scheduleSave(); }
  function duplicateItem(id){ const i=state.items.findIndex(x=>x.id===id); if(i<0) return; const copy=JSON.parse(JSON.stringify(state.items[i])); copy.id=uid(); state.items.splice(i+1,0,copy); renderList(true, copy.id); scheduleSave(); }
  function removeItem(id){ const i=state.items.findIndex(x=>x.id===id); if(i<0) return; state.items.splice(i,1); renderList(); scheduleSave(); }
  function patchItem(id, patch){ const it=state.items.find(x=>x.id===id); if(!it) return; Object.assign(it, patch); renderRow(id); scheduleSave(); }

  // --- Rendering ---
  function statusPill(s){
    if(s==='confirmado') return '<span class="pill ok">Confirmado</span>';
    if(s==='recusado')   return '<span class="pill deny">Recusado</span>';
    return '<span class="pill warn">Pendente</span>';
  }

  function renderFilters(){
    const grupos = [...new Set(state.items.map(i=>i.grupo).filter(Boolean))].sort();
    const cur = fGrupo.value;
    fGrupo.innerHTML = '<option value="">Grupo</option>' + grupos.map(g=>`<option ${g===cur?'selected':''}>${escapeHtml(g)}</option>`).join('');
  }

  function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

  function rowTemplate(it){
    const contato = [it.telefone&&maskPhone(it.telefone), it.email].filter(Boolean).join(' • ');
    const convite = it.convite?.enviadoEm ? `Enviado ${fmtDate(it.convite.enviadoEm)}` : '<span class="muted">—</span>';
    const presença = it.presenca? '✓' : '<span class="muted">—</span>';
    const obs = it.obs? escapeHtml(String(it.obs).slice(0,40)) : '<span class="muted">—</span>';
    return `
      <div class="grid">
        <div><strong>${escapeHtml(it.nome||'')}</strong></div>
        <div>${escapeHtml(contato)}</div>
        <div>${escapeHtml([it.grupo,it.mesa].filter(Boolean).join(' / '))||'<span class="muted">—</span>'}</div>
        <div>${it.qtd||1}</div>
        <div>${convite}</div>
        <div>${statusPill(it.rsvp)}</div>
        <div class="col-presenca">${presença}</div>
        <div>${obs}</div>
        <div class="actions">
          <span class="menu">
            <button class="btn btn-menu" data-act="menu" data-id="${it.id}">⋯</button>
            <div class="popup">
              <button data-act="edit" data-id="${it.id}">Editar</button>
              <button data-act="dup"  data-id="${it.id}">Duplicar</button>
              <button data-act="del"  data-id="${it.id}">Excluir</button>
            </div>
          </span>
        </div>
      </div>
      <details class="editor" data-id="${it.id}">
        <summary class="muted">Editar convidado</summary>
        <div class="grid" style="gap:8px">
          <label>Nome<input data-bind="nome" value="${escapeHtml(it.nome)}"/></label>
          <label>Telefone<input data-bind="telefone" value="${escapeHtml(maskPhone(it.telefone))}"/></label>
          <label>E‑mail<input data-bind="email" value="${escapeHtml(it.email||'')}"/></label>
          <label>Grupo<input data-bind="grupo" value="${escapeHtml(it.grupo||'')}"/></label>
          <label>Mesa<input data-bind="mesa" value="${escapeHtml(it.mesa||'')}"/></label>
          <label>Qtd<input type="number" min="1" data-bind="qtd" value="${it.qtd||1}"/></label>
          <label>Convite — enviado em<input placeholder="dd/mm/aaaa" data-bind="convite.enviadoEm" value="${escapeHtml(fmtDate(it.convite?.enviadoEm||''))}"/></label>
          <label>Método do convite<select data-bind="convite.metodo">
            ${['','WhatsApp','E‑mail','Impresso','Ligação'].map(m=>`<option ${m===(it.convite?.metodo||'')?'selected':''}>${m}</option>`).join('')}
          </select></label>
          <label>RSVP<select data-bind="rsvp">
            ${['pendente','confirmado','recusado'].map(s=>`<option ${s===it.rsvp?'selected':''} value="${s}">${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}
          </select></label>
          <label>Presença<select data-bind="presenca">${[false,true].map(v=>`<option ${String(v)===String(it.presenca)?'selected':''} value="${v}">${v?'Sim':'Não'}</option>`).join('')}</select></label>
          <label style="grid-column:1/-1">Observações<textarea rows="2" data-bind="obs">${escapeHtml(it.obs||'')}</textarea></label>
        </div>
      </details>
    `;
  }

  function renderList(keepOpen=false, openId=null){
    // filtering
    const txt = (state.filter.busca||'').toLowerCase();
    const g   = state.filter.grupo||''; const s=state.filter.status||'';
    const arr = state.items.filter(it=>{
      const str = [it.nome,it.telefone,it.email,it.grupo,it.mesa].filter(Boolean).join(' ').toLowerCase();
      if(txt && !str.includes(txt)) return false;
      if(g && (it.grupo||'')!==g) return false;
      if(s && (it.rsvp||'')!==s) return false;
      return true;
    });

    listEl.innerHTML = '';
    arr.forEach(it=>{
      const r = document.createElement('div');
      r.className = 'row';
      r.dataset.id = it.id;
      r.innerHTML = rowTemplate(it);
      listEl.appendChild(r);
    });

    // wire actions
    listEl.addEventListener('click', onListClick, { once:true });

    // reopen editor if needed
    if(keepOpen){
      const id = openId || (arr[0] && arr[0].id);
      if(id){ const d = listEl.querySelector(`details.editor[data-id="${id}"]`); if(d) d.open = true; }
    }

    renderFilters();
  }

  function renderRow(id){
    const it = state.items.find(x=>x.id===id); if(!it) return;
    const row = listEl.querySelector(`.row[data-id="${id}"]`);
    if(!row) return renderList();
    row.innerHTML = rowTemplate(it);
    // keep editor open state
    const open = row.querySelector('details.editor');
    if(open){ open.open = true; }
  }

  function onListClick(ev){
    const btn = ev.target.closest('[data-act]');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    if(act==='menu'){
      const m = btn.parentElement; m.classList.toggle('open');
      document.addEventListener('click', (e)=>{ if(!m.contains(e.target)) m.classList.remove('open'); }, { once:true });
      return;
    }
    if(act==='edit'){
      const dd = listEl.querySelector(`details.editor[data-id="${id}"]`); if(dd){ dd.open = !dd.open; }
      return;
    }
    if(act==='dup'){ duplicateItem(id); return; }
    if(act==='del'){ if(confirm('Excluir este convidado?')) removeItem(id); return; }
  }

  // Delegate inputs from editors
  listEl.addEventListener('input', (ev)=>{
    const dd = ev.target.closest('details.editor');
    if(!dd) return;
    const id = dd.getAttribute('data-id');
    const inp= ev.target;
    const bind = inp.getAttribute('data-bind');
    if(!bind) return;
    const it = state.items.find(x=>x.id===id); if(!it) return;
    // nested paths support
    const path = bind.split('.');
    let ref = it;
    for(let i=0;i<path.length-1;i++){ const k=path[i]; if(!ref[k] || typeof ref[k] !== 'object') ref[k]={}; ref = ref[k]; }
    let val = inp.value;
    if(bind==='telefone'){ val = maskPhone(val); inp.value = val; }
    if(bind==='qtd'){ val = Math.max(1, parseInt(val||'1',10)); inp.value = val; }
    if(bind==='convite.enviadoEm'){ val = parseDate(val); }
    if(bind==='presenca'){ val = (val==='true' || val===true); }
    ref[path.at(-1)] = val;
    scheduleSave();
    // reflect key fields live
    if(['nome','telefone','email','grupo','mesa','qtd','rsvp','presenca','obs','convite.enviadoEm'].includes(bind)){
      renderRow(id);
    }
  });

  // --- Lifecycle ---
  async function load(){
    if(!state.projectId) { state.items=[]; listEl.innerHTML=''; return; }
    state.project = await store.getProject?.(state.projectId) || {};
    ac?.model?.ensureShape?.(state.project);
    state.items = Array.isArray(state.project.convidados)? state.project.convidados : [];
    renderList();
  }

  function setProject(id){ state.projectId = id; load(); }

  // bus wiring
  bus?.subscribe?.('ac:open-event', ({ id })=>{ if(id) setProject(id); });
  bus?.subscribe?.('ac:project-updated', ({ id })=>{ if(id===state.projectId) load(); });

  // initial
  load();

  return { reload: load, setProject };
}
