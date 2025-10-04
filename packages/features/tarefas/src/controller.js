import {
  taskModels as domainTaskModels,
  normalizeTask,
  computeStatus as computeTaskStatus,
  computeTasksKpi,
  normalizeStatus,
} from '@marco/domain-tarefas';

// ===============================
// /shared/acTasks.v1.mjs
// ===============================
// MiniApp Tarefas — v1 (atualizado)
// - Coluna de Status (Não iniciado / Em andamento / Concluída / Atrasada)
// - **Sem** coluna "Feita"; `done` é derivado de status
// - Botão de exclusão por ícone (🗑)
// - Cabeçalho da tabela sem bordas e visual limpo

/* API
import * as ac from '/shared/acEventsCore.v2.mjs';
import { mountTasksMiniApp } from '/shared/acTasks.v1.mjs';

mountTasksMiniApp(rootElement, {
  ac,
  store, // projectStore
  bus,   // marcoBus
  getCurrentId: ()=> state.currentId // função que devolve o id atual do evento
});
*/

const uid = (p='t')=> p + Math.random().toString(36).slice(2,10);

// ---------- Helpers internos ----------
const computeStatus = (task)=>{
  try{ if(window.__ac_core_tasks_compute__) return window.__ac_core_tasks_compute__(task); }catch{ /* noop */ }
  return computeTaskStatus(task);
};

// ---------- Normalização ----------
const normTask = (task={})=> normalizeTask({ ...task, id: task.id || uid() }, { computeStatus });

// ---------- Modelos prontos ----------
export const taskModels = domainTaskModels;

// ---------- Persistência utilitária ----------
async function getProject(store, id){ return id? await store.getProject?.(id) : null; }
async function updateProject(store, id, mut){
  if(!id) return null;
  const current = await getProject(store, id) || {};
  const next = JSON.parse(JSON.stringify(current));
  mut(next);
  next.updatedAt = Date.now();
  await store.updateProject?.(id, next);
  return await getProject(store, id);
}

// ---------- Render helpers ----------
function el(tag, attrs={}, children=[]){
  const n = document.createElement(tag);
  Object.entries(attrs||{}).forEach(([k,v])=>{
    if(k==='className') n.className=v; else if(k==='dataset') Object.assign(n.dataset,v); else if(k in n) n[k]=v; else n.setAttribute(k,v);
  });
  (children||[]).forEach(c=> n.appendChild(typeof c==='string'? document.createTextNode(c) : c));
  return n;
}
function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }

function kpiRow(ac, list){
  const k = ac?.stats?.kpiTarefas ? ac.stats.kpiTarefas(list||[]) : computeTasksKpi(list||[]);
  return el('div',{className:'row',style:'gap:.75rem;align-items:center;margin:6px 0'},[
    el('strong',{textContent:`${k.pendentes} pendentes`} ),
    el('span',{textContent:'•'}),
    el('span',{textContent:`${k.concluidas} concluídas • ${k.pctConcluidas}%`, className:'muted'})
  ]);
}

function progress(ac, list){
  const k = ac?.stats?.kpiTarefas ? ac.stats.kpiTarefas(list||[]) : computeTasksKpi(list||[]);
  const track = el('div',{className:'progress__track',style:'height:10px;border-radius:6px;background:#eef2f6;overflow:hidden'});
  const bar = el('div',{className:'progress__bar',style:`height:10px;border-radius:6px;background:#0b65c2;width:${k.pctConcluidas}%;transition:width .25s ease`});
  track.appendChild(bar);
  return track;
}

// ---------- UI principal ----------
export function mountTasksMiniApp(root, { ac, store, bus, getCurrentId }){
  if(!root) throw new Error('root inválido');

  // Expor computeStatus do core para os helpers locais, se existir
  try{ window.__ac_core_tasks_compute__ = ac?.tasks?.computeStatus; }catch{ /* noop */ }

  const header = el('div',{className:'row',style:'justify-content:space-between;align-items:center;margin-bottom:8px'},[
    el('h3',{textContent:'Tarefas', style:'margin:0;color:#0b65c2;font-size:1rem'}),
  ]);

  const kpiWrap = el('div');
  const progWrap = el('div',{className:'progress progress--lg'});

  // Controles de modelos
  const modelsSelect = el('select',{}, [
    el('option',{value:'',textContent:'Modelos prontos…'}),
    el('option',{value:'casamento',textContent:'Casamento'}),
    el('option',{value:'debutante15',textContent:'Aniversário de 15 anos'}),
    el('option',{value:'jantarCorporativo',textContent:'Jantar corporativo'})
  ]);
  const btnAppend = el('button',{className:'btn',textContent:'Adicionar modelo'});
  const btnReplace= el('button',{className:'btn',textContent:'Substituir lista'});
  const modelsRow = el('div',{className:'row',style:'gap:.5rem;align-items:center;margin:8px 0'},[
    modelsSelect, btnAppend, btnReplace
  ]);

  // Form de nova tarefa
  const inTitle = el('input',{type:'text',placeholder:'Nova tarefa',style:'flex:1;padding:8px;border:1px solid #d0d7e2;border-radius:8px'});
  const inResp  = el('input',{type:'text',placeholder:'Responsável',style:'width:180px;padding:8px;border:1px solid #d0d7e2;border-radius:8px'});
  const inDate  = el('input',{type:'date',style:'width:160px;padding:8px;border:1px solid #d0d7e2;border-radius:8px'});
  const btnAdd  = el('button',{className:'btn',textContent:'Adicionar'});
  const addRow  = el('div',{className:'row',style:'gap:.5rem;align-items:center;margin:8px 0'},[inTitle,inResp,inDate,btnAdd]);

  // Tabela
  const table = el('table',{className:'table',style:'width:100%;border-collapse:separate;border-spacing:0 8px;margin-top:8px'});
  const thead = el('thead',{},[ el('tr',{},[
    el('th',{textContent:'Tarefa',style:'text-align:left;padding:8px 10px;font-size:12px;color:#555;border-bottom:0;background:transparent'}),
    el('th',{textContent:'Responsável',style:'text-align:left;padding:8px 10px;font-size:12px;color:#555;border-bottom:0;background:transparent'}),
    el('th',{textContent:'Status',style:'text-align:left;padding:8px 10px;font-size:12px;color:#555;border-bottom:0;background:transparent'}),
    el('th',{textContent:'Prazo',style:'text-align:left;padding:8px 10px;font-size:12px;color:#555;border-bottom:0;background:transparent'}),
    el('th',{textContent:'Ações',style:'text-align:left;padding:8px 10px;font-size:12px;color:#555;border-bottom:0;background:transparent'})
  ])]);
  const tbody = el('tbody');
  table.append(thead, tbody);

  root.append(header, kpiWrap, progWrap, modelsRow, addRow, table);

  // ------- Estado local (derivado do projeto) -------
  let currentId = getCurrentId?.();

  async function readList(){
    currentId = getCurrentId?.();
    const prj = await getProject(store, currentId) || {};
    const list = (prj.checklist||[]).map(normTask);
    return { prj, list };
  }

  async function saveList(mutator){
    currentId = getCurrentId?.();
    const next = await updateProject(store, currentId, (draft)=>{
      draft.checklist ||= [];
      const normed = (draft.checklist||[]).map(normTask);
      mutator(normed, draft);
      draft.checklist = normed.map(normTask);
    });
    bus?.publish?.('ac:project-updated',{ id: currentId, updatedAt: Date.now() });
    return next;
  }

  function renderTable(ac, list){
    clear(tbody);
    list.forEach((t,i)=>{
      const tr = el('tr',{},[]);

      const ti = el('input',{type:'text',value:t.titulo,style:'width:100%'});
      ti.addEventListener('change', async ()=>{ await saveList((normed)=>{ normed[i].titulo = ti.value; }); });

      const ri = el('input',{type:'text',value:t.responsavel||'',style:'width:100%'});
      ri.addEventListener('change', async ()=>{ await saveList((normed)=>{ normed[i].responsavel = ri.value; }); });

      const si = el('select',{},[
        el('option',{value:'todo',textContent:'Não iniciado'}),
        el('option',{value:'doing',textContent:'Em andamento'}),
        el('option',{value:'done',textContent:'Concluída'}),
        el('option',{value:'late',textContent:'Atrasada'})
      ]);
      si.value = normalizeStatus(t.status)||computeStatus(t);
      si.addEventListener('change', async ()=>{
        const v = si.value;
        await saveList((normed)=>{
          normed[i].status = v;
          normed[i].done = (v==='done');
        });
        await rerender();
      });

      const di = el('input',{type:'date',value:(t.prazo||'').slice(0,10),style:'width:100%'});
      di.addEventListener('change', async ()=>{
        await saveList((normed)=>{
          normed[i].prazo = di.value;
          if(normed[i].status !== 'done') normed[i].status = computeStatus(normed[i]);
        });
        await rerender();
      });

      const del = el('button',{className:'btn btn--ghost',title:'Remover',style:'min-width:36px'},['🗑']);
      del.addEventListener('click', async ()=>{ await saveList((normed)=>{ normed.splice(i,1); }); await rerender(); });

      tr.append(
        el('td',{},[ti]),
        el('td',{},[ri]),
        el('td',{},[si]),
        el('td',{},[di]),
        el('td',{},[del])
      );
      tbody.appendChild(tr);
    });
  }

  async function rerender(){
    const { list } = await readList();
    clear(kpiWrap); kpiWrap.appendChild(kpiRow(ac, list));
    clear(progWrap); progWrap.appendChild(progress(ac, list));
    renderTable(ac, list);
  }

  // ------- Handlers -------
  btnAdd.addEventListener('click', async ()=>{
    const title = (inTitle.value||'').trim(); if(!title) return;
    await saveList((normed)=>{ normed.push(normTask({ titulo:title, responsavel:inResp.value||'', prazo:inDate.value||'', status:'todo' })); });
    inTitle.value=''; inResp.value=''; inDate.value='';
    await rerender();
  });

  function selectedModel(){ return modelsSelect.value && taskModels[modelsSelect.value] ? taskModels[modelsSelect.value] : null; }
  btnAppend.addEventListener('click', async ()=>{
    const model = selectedModel(); if(!model) return;
    await saveList((normed)=>{ model.forEach(t=> normed.push(normTask(t))); });
    await rerender();
  });
  btnReplace.addEventListener('click', async ()=>{
    const model = selectedModel(); if(!model) return;
    await saveList((normed, draft)=>{ draft.checklist = model.map(normTask); });
    await rerender();
  });

  // ------- Reatividade com o bus -------
  bus?.subscribe?.('ac:open-event', async ({id})=>{ if(id){ await rerender(); } });
  bus?.subscribe?.('ac:project-updated', async ({id})=>{ if(id===getCurrentId?.()) await rerender(); });

  // Primeira renderização
  rerender();

  return {
    refresh: rerender,
    destroy(){
      clear(root);
    }
  };
}

