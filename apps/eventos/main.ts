// @ts-nocheck

import * as store from '/shared/projectStore.js';
import * as bus from '/shared/marcoBus.js';
import * as ac from '/widgets/eventos.mjs';
import './styles.css';

let tasksModulePromise = null;
let fornecedoresModulePromise = null;
let convidadosModulePromise = null;

function loadTasksModule(){
  if(!tasksModulePromise){
    tasksModulePromise = import('/widgets/tarefas.mjs');
  }
  return tasksModulePromise;
}

function loadFornecedoresModule(){
  if(!fornecedoresModulePromise){
    fornecedoresModulePromise = import('/widgets/fornecedores.mjs');
  }
  return fornecedoresModulePromise;
}

function loadConvidadosModule(){
  if(!convidadosModulePromise){
    convidadosModulePromise = import('/widgets/convites.mjs');
  }
  return convidadosModulePromise;
}

if(store?.init){
  await store.init();
}

// ====================== Estado & helpers ======================
const AUTO_SAVE_MS = 700;
const state = { currentId:null, project:null, metas:[], dirty:false, saving:false, timer:null };
const $  = (s)=> document.querySelector(s);
const $$ = (s)=> [...document.querySelectorAll(s)];

// Header UI refs
const evTitle   = $('#evTitle');
const updatedAt = $('#updatedAt');
const switchEvent = $('#switchEvent');
const btnNew    = $('#btnNew');
const btnDelete = $('#btnDelete');

// Pills
const chipReady = $('#chipReady');
const chipDirty = $('#chipDirty');
const chipSaving= $('#chipSaving');

// Form bind
const dtInput = $('#ev-datetime');
const boundInputs = $$('[data-bind]');

// KPI refs
const kpiForTitle = $('#kpi_for_title');
const kpiForBar   = $('#kpi_for_bar');
const kpiForLbl1  = $('#kpi_for_lbl1');
const kpiForLbl2  = $('#kpi_for_lbl2');

const kpiTaskTitle= $('#kpi_task_title');
const kpiTaskBar  = $('#kpi_task_bar');
const kpiTaskLbl1 = $('#kpi_task_lbl1');
const kpiTaskLbl2 = $('#kpi_task_lbl2');

const kpiMsgTrack = $('#kpi_msg_track');

function renderStatus(){
  chipReady.style.display = (!state.dirty && !state.saving)? 'inline-block':'none';
  chipDirty.style.display = (state.dirty && !state.saving)? 'inline-block':'none';
  chipSaving.style.display= state.saving? 'inline-block':'none';
}
function setDirty(v){ state.dirty=!!v; renderStatus(); }
function setSaving(v){ state.saving=!!v; renderStatus(); }

const fmtDateTime   = (ts)=> ac.format.fmtDateTime(ts);
const fmtDateBR     = (d)=> ac.format?.fmtDateBR ? ac.format.fmtDateBR(d) : (d? d.split('-').reverse().join('/') : '');
const fmtDateCompact= (d,h)=>{ const ddmmyyyy = fmtDateBR(d); const hhmm = (h||'').slice(0,5); return [ddmmyyyy, hhmm].filter(Boolean).join(' '); };
function setKV(sel, pairs){ const el=$(sel); if(!el) return; el.innerHTML = (pairs&&pairs.length)? pairs.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join(''):''; }

function renderBadges(){
  const p = ac.model.ensureShape(state.project||{});
  const ev = p.evento||{};
  const rowsEv=[];
  if(ev.nome) rowsEv.push(['Evento', ev.nome]);
  if(ev.tipo) rowsEv.push(['Tipo', ev.tipo]);
  const dStr = fmtDateCompact(ev.data, ev.hora); if(dStr) rowsEv.push(['Data', dStr]);
  if(ev.local) rowsEv.push(['Local', ev.local]);
  setKV('#kvEvento', rowsEv);

  const a=ev.anfitriao||{}; const rowsA=[];
  if(a.nome) rowsA.push(['Nome', a.nome]);
  if(a.telefone) rowsA.push(['Telefone', a.telefone]);
  if(a.redeSocial) rowsA.push(['Contato', a.redeSocial]);
  setKV('#kvAnfitriao', rowsA);

  const c=p.cerimonialista||{}; const rowsC=[]; const nomeC=c.nomeCompleto||c.nome;
  if(nomeC) rowsC.push(['Nome', nomeC]);
  if(c.telefone) rowsC.push(['Telefone', c.telefone]);
  if(c.redeSocial) rowsC.push(['Rede social', c.redeSocial]);
  setKV('#kvCerimonial', rowsC);
}

function renderHeader(){
  const p = state.project||{}; const ev=p.evento||{};
  evTitle.textContent = ev.nome || '—';
  updatedAt.textContent = fmtDateTime(p.updatedAt)||'—';
  renderBadges();
}

function renderSwitcher(){
  const metas=state.metas||[];
  switchEvent.innerHTML = metas.map(m=>`<option value="${m.id}"${m.id===state.currentId?' selected':''}>${m.nome||m.id}</option>`).join('');
}
switchEvent.addEventListener('change', async ()=>{ const id=switchEvent.value; if(id){ await setCurrent(id); publishCurrent(); }});
async function renderSaved(){ state.metas = store.listProjects?.()||[]; renderSwitcher(); }

// Form <-> State
function fillForm(p){
  ac.model.ensureShape(p);
  boundInputs.forEach(inp=>{
    const path=inp.dataset.bind;
    const val=path.split('.').reduce((a,k)=>a? a[k] : undefined,p)??'';
    inp.value = val;
  });
  const ev=p?.evento||{}; const hh=(ev.hora||'').slice(0,5); const hasDate=!!ev.data;
  if(dtInput){ dtInput.value = hasDate? `${ev.data}T${hh||'00:00'}`: ''; }
}
function readForm(){
  const p=ac.model.ensureShape(JSON.parse(JSON.stringify(state.project||{})));
  boundInputs.forEach(inp=>{
    const path=inp.dataset.bind.split('.'); let ref=p;
    for(let i=0;i<path.length-1;i++){ const k=path[i]; if(typeof ref[k]!=='object'||ref[k]===null) ref[k]={}; ref=ref[k]; }
    ref[path.at(-1)] = inp.value;
  });
  return p;
}
function applyDateTime(prj){
  const v=dtInput?.value?.trim();
  if(!v){ prj.evento ||= {}; if(!prj.evento.hora) prj.evento.hora=''; if(!prj.evento.data) prj.evento.data=''; return prj; }
  const [date,time]=v.split('T'); prj.evento ||= {}; prj.evento.data=date||''; prj.evento.hora=(time||'').slice(0,5); return prj;
}

async function doSave(){
  if(!state.currentId || !state.dirty) return;
  setSaving(true);
  let next = readForm(); next = applyDateTime(next); next.updatedAt = Date.now();
  await store.updateProject?.(state.currentId,next);
  state.project = await store.getProject?.(state.currentId);
  setSaving(false); setDirty(false);
  await renderSaved(); fillForm(state.project); renderHeader(); renderIndicators();
  bus.publish('ac:project-updated',{ id: state.currentId, updatedAt: next.updatedAt });
}
function scheduleSave(){ if(state.timer) clearTimeout(state.timer); state.timer = setTimeout(doSave, AUTO_SAVE_MS); }

document.addEventListener('input', (ev)=>{
  const inp=ev.target.closest('[data-bind]'); if(!inp) return;
  setDirty(true); if(inp.dataset.bind==='evento.nome'){ evTitle.textContent = inp.value.trim()||'—'; }
  scheduleSave(); renderBadges();
});
if(dtInput){ dtInput.addEventListener('input', ()=>{ setDirty(true); scheduleSave(); renderBadges(); }); }

// CEP
function wireCepInputs(){
  document.querySelectorAll('[data-cep]').forEach(inp=>{
    inp.addEventListener('input', ()=>{ inp.value = ac.cep.maskCep(inp.value); });
    inp.addEventListener('blur', async ()=>{
      const prefix=inp.getAttribute('data-cep'); const data=await ac.cep.fetchCep(inp.value); if(!data) return;
      const map={logradouro:'logradouro',bairro:'bairro',cidade:'cidade',uf:'uf'};
      for(const [k,v] of Object.entries(map)){
        const el=document.querySelector(`[data-bind="${prefix}.${k}"]`); if(el && data[v]) el.value=data[v];
      }
      setDirty(true); scheduleSave(); renderBadges();
    });
  });
}

// ====================== KPIs (v2) ======================
function syncTasksKpiActive(){ try{ const kpi=document.querySelector('#kpi_tasks'); const det=document.querySelector('#secTarefas'); if(kpi&&det){ kpi.classList.toggle('active', !!det.open); } }catch{} }
function syncForKpiActive(){ try{ const kpi=document.querySelector('#kpi_for'); const det=document.querySelector('#secFornecedores'); if(kpi&&det){ kpi.classList.toggle('active', !!det.open); } }catch{} }
function syncGuestKpiActive(){ try{ const kpi=document.querySelector('#kpi_guests'); const det=document.querySelector('#secConvidados'); if(kpi&&det){ kpi.classList.toggle('active', !!det.open); } }catch{} }

function clearChildren(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }
function pushSeg(container, pct, title){ const seg=document.createElement('div'); seg.className='seg'; seg.style.width=Math.max(0,Math.min(100,pct)).toFixed(2)+'%'; if(title) seg.title=title; container.appendChild(seg); }

function renderIndicators(){
  const p = ac.model.ensureShape(state.project||{});

  // Fornecedores
  const kFor = ac.stats.kpiFornecedores(p.fornecedores||[]);
  if(kpiForTitle) kpiForTitle.textContent = `Fornecedores (${ac.format.money(kFor.pendente)} pendentes)`;
  if(kpiForBar)   kpiForBar.style.width = Math.min(100, Math.max(0, kFor.pctPago)) + '%';
  if(kpiForLbl1)  kpiForLbl1.textContent = `${ac.format.money(kFor.pago)} pagos — ${kFor.pctPago}%`;
  if(kpiForLbl2)  kpiForLbl2.textContent = `Total: ${ac.format.money(kFor.total)}`;

  // Convidados & Convites
  const kG = ac.stats.kpiConvidados(p.convidados||[]);
  const kpiGuestTitle  = document.querySelector('#kpi_guest_title');
  const kpiGuestBar    = document.querySelector('#kpi_guest_bar');
  const kpiGuestLbl1   = document.querySelector('#kpi_guest_lbl1');
  const kpiGuestLbl2   = document.querySelector('#kpi_guest_lbl2');
  const kpiGuestBands  = document.querySelector('#kpi_guest_bands');
  const kpiGuestLegend = document.querySelector('#kpi_guest_legend');
  if(kpiGuestTitle) kpiGuestTitle.textContent = `Convidados & Convites (${kG.pendentes} pendentes)`;
  if(kpiGuestBar)   kpiGuestBar.style.width = Math.min(100, Math.max(0, kG.pctConfirmados)) + '%';
  if(kpiGuestLbl1)  kpiGuestLbl1.textContent = `${kG.confirmados} confirmados — ${kG.pctConfirmados}%`;
  if(kpiGuestLbl2)  kpiGuestLbl2.textContent = `Total: ${kG.total}`;
  if(kpiGuestBands){
    clearChildren(kpiGuestBands);
    const bands = (kG.mesas && kG.mesas.some(x=>x[1]>0)) ? kG.mesas : (kG.grupos||[]);
    const sum = Math.max(1, bands.reduce((a,[,v])=>a+(v||0),0));
    const top = bands.slice(0,10);
    top.forEach(([name,val])=> pushSeg(kpiGuestBands, (val/sum)*100, `${name||'—'}: ${val}`));
    if(kpiGuestLegend){ kpiGuestLegend.textContent = top.length ? top.map(([n,v])=>`${(n||'—').slice(0,12)}: ${v}`).join(' • ') : 'Sem distribuição registrada'; }
  }

  // Tarefas (checklist)
  const kTk = ac.stats.kpiTarefas(p.checklist||[]);
  if(kpiTaskTitle) kpiTaskTitle.textContent = `Tarefas (${kTk.pendentes} pendentes)`;
  if(kpiTaskBar)   kpiTaskBar.style.width = Math.min(100, Math.max(0, kTk.pctConcluidas)) + '%';
  if(kpiTaskLbl1)  kpiTaskLbl1.textContent = `${kTk.concluidas} concluídas — ${kTk.pctConcluidas}%`;
  if(kpiTaskLbl2)  kpiTaskLbl2.textContent = `Total: ${kTk.total}`;

  // Mensagens próximos 7 dias
  const kM = ac.stats.kpiMensagens(p.mensagens||[]);
  const kpiMsgLbl1  = $('#kpi_msg_lbl1');
  const kpiMsgLbl2  = $('#kpi_msg_lbl2');
  if(kpiMsgTrack){
    clearChildren(kpiMsgTrack);
    const arr = Array.isArray(kM.perDay)? kM.perDay.slice(0,7) : [0,0,0,0,0,0,0];
    const total = arr.reduce((a,b)=>a+b,0);
    if(total===0){ for(let i=0;i<7;i++) pushSeg(kpiMsgTrack, 100/7, `D${i}: 0`); }
    else{ arr.forEach((v,i)=> pushSeg(kpiMsgTrack, (v/total)*100, `D${i}: ${v}`)); }
  }
  if(kpiMsgLbl1) kpiMsgLbl1.textContent = `Total na semana: ${kM.total}`;
  if(kpiMsgLbl2) kpiMsgLbl2.textContent = `Pico: ${kM.pico}/dia`;
}

// ====================== Novo / Excluir ======================
btnNew.addEventListener('click', async ()=>{
  const blank = ac.model.ensureShape({
    cerimonialista:{},
    evento:{ endereco:{}, anfitriao:{ endCorrespondencia:{}, endEntrega:{} } },
    fornecedores:[], convidados:[], checklist:[], tipos:[], modelos:{}, vars:{}
  });
  const { meta } = await store.createProject?.(blank);
  await setCurrent(meta.id); await renderSaved(); publishCurrent();
  mountTasksIfNeeded(); mountFornecedoresIfNeeded(); mountConvidadosIfNeeded();
});

btnDelete.addEventListener('click', async ()=>{
  if(!state.currentId) return;
  if(!confirm('Excluir este evento? Esta ação não pode ser desfeita.')) return;
  try{
    if(store.deleteProject){ await store.deleteProject(state.currentId); }
    else if(store.removeProject){ await store.removeProject(state.currentId); }
  }catch(e){ console.error(e); }
  state.currentId=null; await renderSaved();
  const nextId=(state.metas[0]&&state.metas[0].id)||null;
  await setCurrent(nextId); publishCurrent();
  mountTasksIfNeeded(); mountFornecedoresIfNeeded(); mountConvidadosIfNeeded();
});

function publishCurrent(){ if(state.currentId) bus.publish('ac:open-event',{ id: state.currentId, from:'eventos' }); }

function mountTasksIfNeeded(){
  const host = document.querySelector('#tasks_host');
  if(host && !host.dataset.mounted){
    host.dataset.mounted = 'loading';
    loadTasksModule()
      .then((mod)=>{
        if(!mod?.mountTasksMiniApp || !host.isConnected) return;
        mod.mountTasksMiniApp(host, { ac, store, bus, getCurrentId: ()=> state.currentId });
        host.dataset.mounted = '1';
      })
      .catch((err)=>{
        console.error('Falha ao carregar mini-app de tarefas', err);
        delete host.dataset.mounted;
      });
  }
}

function mountFornecedoresIfNeeded(){
  const host = document.querySelector('#fornecedores_host');
  if(host && !host.dataset.mounted){
    host.dataset.mounted = 'loading';
    loadFornecedoresModule()
      .then((mod)=>{
        if(!mod?.mountFornecedoresMiniApp || !host.isConnected) return;
        mod.mountFornecedoresMiniApp(host, { ac, store, bus, getCurrentId: ()=> state.currentId });
        host.dataset.mounted = '1';
      })
      .catch((err)=>{
        console.error('Falha ao carregar mini-app de fornecedores', err);
        delete host.dataset.mounted;
      });
  }
}
function mountConvidadosIfNeeded(){
  const host = document.querySelector('#guests_host');
  if(host && !host.dataset.mounted){
    host.dataset.mounted = 'loading';
    loadConvidadosModule()
      .then((mod)=>{
        if(!mod?.mountConvidadosMiniApp || !host.isConnected) return;
        mod.mountConvidadosMiniApp(host, { ac, store, bus, getCurrentId: ()=> state.currentId });
        host.dataset.mounted = '1';
      })
      .catch((err)=>{
        console.error('Falha ao carregar mini-app de convidados', err);
        delete host.dataset.mounted;
      });
  }
}

async function loadCurrent(id){
  state.currentId=id||state.currentId;
  state.project = state.currentId? await store.getProject?.(state.currentId) : null;
  ac.model.ensureShape(state.project);
  fillForm(state.project||{}); setDirty(false); renderHeader(); renderIndicators();
  mountTasksIfNeeded(); mountFornecedoresIfNeeded(); mountConvidadosIfNeeded();
}
async function setCurrent(id){
  if(!id){ state.currentId=null; state.project=null; await renderSaved(); fillForm(ac.model.ensureShape({})); renderHeader(); setDirty(false); renderIndicators(); mountTasksIfNeeded(); mountFornecedoresIfNeeded(); mountConvidadosIfNeeded(); return; }
  await loadCurrent(id); localStorage.setItem('ac:lastId', id); renderSwitcher();
}

// BUS: refletir atualizações externas (com refresh do projeto atual)
bus.subscribe('ac:project-updated', async ({ id, updatedAt:ts })=>{
  try{
    if(id){
      await renderSaved();
      if(id===state.currentId){
        state.project = await store.getProject?.(state.currentId);
        if(ts && updatedAt){ updatedAt.textContent = fmtDateTime(ts)||'—'; }
        renderIndicators();
      }
    }
  }catch(err){ console.error(err); }
});

// Abrir/fechar seções
function updateEditActives(){
  document.querySelectorAll('[data-open]')?.forEach(b=>b.classList.remove('active'));
  ['#secEvento','#secAnfitriao','#secCerimonial','#secTarefas','#secFornecedores','#secConvidados'].forEach(sel=>{
    const d=document.querySelector(sel); if(d && d.open){ const btn=document.querySelector(`[data-open="${sel}"]`); if(btn) btn.classList.add('active'); }
  });
}
function closeAll(){ ['#secEvento','#secAnfitriao','#secCerimonial','#secTarefas','#secFornecedores','#secConvidados'].forEach(sel=>{ const el=document.querySelector(sel); if(el) el.open=false; }); updateEditActives(); }
function toggleSection(selector){
  const target = document.querySelector(selector); if(!target) return; const willOpen = !target.open; closeAll(); target.open = willOpen; updateEditActives();
  if(willOpen){ if(selector==='#secTarefas'){ mountTasksIfNeeded(); } if(selector==='#secFornecedores'){ mountFornecedoresIfNeeded(); } if(selector==='#secConvidados'){ mountConvidadosIfNeeded(); } }
  syncTasksKpiActive(); syncForKpiActive(); syncGuestKpiActive();
}
document.addEventListener('click', (ev)=>{ const btn = ev.target.closest('[data-open]'); if(!btn) return; const sel = btn.getAttribute('data-open'); if(sel) toggleSection(sel); });
window.addEventListener('keydown',(e)=>{ if(e.key==='Escape'){ closeAll(); }});
['#secEvento','#secAnfitriao','#secCerimonial','#secTarefas','#secFornecedores','#secConvidados'].forEach(sel=>{ const d=document.querySelector(sel); if(d) d.addEventListener('toggle', ()=>{ updateEditActives(); syncTasksKpiActive(); syncForKpiActive(); syncGuestKpiActive(); }); });

// ====================== Boot ======================
async function bootstrap(){
  await renderSaved();
  wireCepInputs();
  const metas = store.listProjects?.()||[];
  if(!metas.length){
    const blank = ac.model.ensureShape({
      cerimonialista:{},
      evento:{ endereco:{}, anfitriao:{ endCorrespondencia:{}, endEntrega:{} } },
      fornecedores:[], convidados:[], checklist:[], tipos:[], modelos:{}, vars:{}
    });
    const { meta } = await store.createProject?.(blank);
    await setCurrent(meta.id); publishCurrent(); mountTasksIfNeeded(); mountFornecedoresIfNeeded(); mountConvidadosIfNeeded(); return;
  }
  const last = localStorage.getItem('ac:lastId');
  const initial = (metas.find(m=>m.id===last)?.id) || metas[0]?.id || null;
  await setCurrent(initial); if(initial) publishCurrent();
  closeAll();
  renderStatus();
  mountTasksIfNeeded();
  mountFornecedoresIfNeeded();
  mountConvidadosIfNeeded();
}
await bootstrap();
// garantir estado visual correto no carregamento
syncTasksKpiActive();
syncForKpiActive();
syncGuestKpiActive();
