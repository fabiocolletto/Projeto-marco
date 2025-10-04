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

const mergeStyles = (...rules)=> rules.filter(Boolean).join('');
const BASE_INPUT_STYLE = 'padding:8px;border:1px solid #d0d7e2;border-radius:8px;background:#fff;font-size:0.875rem;line-height:1.25rem;transition:border-color .2s ease,box-shadow .2s ease';
const BASE_BUTTON_STYLE = 'border:none;border-radius:8px;padding:10px 16px;font-weight:600;cursor:pointer;transition:background .2s ease,transform .2s ease;display:inline-flex;align-items:center;justify-content:center;gap:6px';

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

function enhanceField(field, { baseBorder = '#d0d7e2', focusBorder = '#0b65c2' } = {}){
  field.dataset.baseBorder = baseBorder;
  field.dataset.focusBorder = focusBorder;
  field.addEventListener('focus', ()=>{
    field.style.borderColor = focusBorder;
    field.style.boxShadow = '0 0 0 2px rgba(11,101,194,.15)';
  });
  field.addEventListener('blur', ()=>{
    if(field.dataset.invalid === 'true') return;
    field.style.borderColor = baseBorder;
    field.style.boxShadow = 'none';
  });
}

function markInvalid(field){
  field.dataset.invalid = 'true';
  field.setAttribute('aria-invalid','true');
  field.style.borderColor = '#b9382c';
  field.style.boxShadow = '0 0 0 2px rgba(185,56,44,.15)';
}

function clearInvalid(field){
  field.dataset.invalid = '';
  field.removeAttribute('aria-invalid');
  const base = field.dataset.baseBorder || '#d0d7e2';
  field.style.borderColor = base;
  field.style.boxShadow = 'none';
}

function manageBackground(field, { base = '#fff', focus = '#f8fbff' } = {}){
  field.dataset.baseBackground = base;
  field.dataset.focusBackground = focus;
  field.style.background = base;
  field.addEventListener('focus', ()=>{ field.style.background = focus; });
  field.addEventListener('blur', ()=>{
    if(field.dataset.invalid === 'true') return;
    field.style.background = base;
  });
}

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

  const header = el('div',{style:'display:flex;flex-direction:column;gap:2px;margin-bottom:12px'},[
    el('h3',{textContent:'Tarefas', style:'margin:0;color:#0b65c2;font-size:1rem'}),
    el('span',{textContent:'Organize responsabilidades, acompanhe prazos e visualize o progresso em tempo real.', style:'color:#4b5563;font-size:0.875rem'}),
  ]);

  const kpiWrap = el('div');
  const progWrap = el('div',{className:'progress progress--lg'});

  // Controles de modelos
  const modelsSelect = el('select',{style:mergeStyles('min-width:200px;', BASE_INPUT_STYLE)}, [
    el('option',{value:'',textContent:'Modelos prontos…'}),
    el('option',{value:'casamento',textContent:'Casamento'}),
    el('option',{value:'debutante15',textContent:'Aniversário de 15 anos'}),
    el('option',{value:'jantarCorporativo',textContent:'Jantar corporativo'})
  ]);
  const btnAppend = el('button',{className:'btn',textContent:'Adicionar modelo',style:mergeStyles(BASE_BUTTON_STYLE,'background:#f1f5f9;color:#0f172a;border:1px solid #d0d7e2;')});
  const btnReplace= el('button',{className:'btn',textContent:'Substituir lista',style:mergeStyles(BASE_BUTTON_STYLE,'background:#0b65c2;color:#fff;')});
  const modelsRow = el('div',{className:'row',style:'gap:.5rem;align-items:center;margin:12px 0;flex-wrap:wrap'},[
    modelsSelect, btnAppend, btnReplace
  ]);

  // Form de nova tarefa
  const inTitle = el('input',{type:'text',placeholder:'Título da tarefa *',style:mergeStyles('flex:1;min-width:200px;', BASE_INPUT_STYLE),required:true});
  const inResp  = el('input',{type:'text',placeholder:'Responsável *',style:mergeStyles('width:200px;', BASE_INPUT_STYLE),required:true});
  const inDate  = el('input',{type:'date',style:mergeStyles('width:170px;', BASE_INPUT_STYLE),required:true});
  const btnAdd  = el('button',{className:'btn',type:'button',textContent:'Adicionar tarefa',style:mergeStyles(BASE_BUTTON_STYLE,'background:#0369a1;color:#fff;box-shadow:0 1px 0 rgba(15,23,42,.06)')});
  const addRow  = el('div',{className:'row',style:'gap:.5rem;align-items:flex-end;flex-wrap:wrap'},[inTitle,inResp,inDate,btnAdd]);
  const addHint = el('div',{style:'font-size:12px;color:#4b5563;display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap'},[
    el('span',{textContent:'Campos marcados com * são obrigatórios.'}),
    el('span',{textContent:'As alterações são salvas automaticamente.'})
  ]);
  const feedback = el('div',{style:'font-size:12px;color:#4b5563;min-height:18px','aria-live':'polite'},[]);
  const addWrap  = el('div',{style:'display:flex;flex-direction:column;gap:6px;margin:12px 0'},[addHint,addRow,feedback]);

  // Tabela
  const table = el('table',{className:'table',style:'width:100%;border-collapse:separate;border-spacing:0 12px;margin-top:12px'});
  const thead = el('thead',{},[ el('tr',{style:'color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.04em'},[
    el('th',{textContent:'Tarefa',style:'text-align:left;padding:0 10px;font-weight:600;border-bottom:0;background:transparent'}),
    el('th',{textContent:'Responsável',style:'text-align:left;padding:0 10px;font-weight:600;border-bottom:0;background:transparent'}),
    el('th',{textContent:'Status',style:'text-align:left;padding:0 10px;font-weight:600;border-bottom:0;background:transparent'}),
    el('th',{textContent:'Prazo',style:'text-align:left;padding:0 10px;font-weight:600;border-bottom:0;background:transparent'}),
    el('th',{textContent:'Ações',style:'text-align:left;padding:0 10px;font-weight:600;border-bottom:0;background:transparent'})
  ])]);
  const tbody = el('tbody');
  table.append(thead, tbody);

  root.append(header, kpiWrap, progWrap, modelsRow, addWrap, table);

  const setFeedback = (type, message)=>{
    const palette = {
      error: '#b9382c',
      success: '#1b7c32',
      info: '#4b5563'
    };
    feedback.dataset.type = type;
    feedback.style.color = palette[type] || palette.info;
    feedback.textContent = message || '';
  };

  [inTitle, inResp, inDate].forEach((field)=>{
    enhanceField(field);
    manageBackground(field);
    field.addEventListener('input', ()=>{
      if(field.value && field.value.trim()){ clearInvalid(field); }
      if(feedback.dataset.type === 'error'){ setFeedback('info','Preencha todos os campos obrigatórios para adicionar a tarefa.'); }
    });
  });

  enhanceField(modelsSelect);
  manageBackground(modelsSelect);
  modelsSelect.addEventListener('change', ()=>{
    clearInvalid(modelsSelect);
    if(modelsSelect.value){
      setFeedback('info','Modelo selecionado! Você pode adicioná-lo ou substituir a lista.');
    } else if(feedback.dataset.type !== 'success'){
      setFeedback('info','Preencha todos os campos obrigatórios para adicionar a tarefa.');
    }
  });
  setFeedback('info','Preencha todos os campos obrigatórios para adicionar a tarefa.');

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
      const tr = el('tr',{style:'background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.08);border-radius:12px;overflow:hidden'},[]);
      const cellBase = 'padding:10px 12px;background:#fff;vertical-align:middle;';

      const ti = el('input',{type:'text',value:t.titulo,style:'width:100%;border:1px solid transparent;border-radius:6px;padding:6px 8px;background:transparent;font-size:0.875rem;color:#1f2937;transition:border-color .2s ease,background .2s ease'});
      enhanceField(ti,{ baseBorder:'transparent' });
      manageBackground(ti,{ base:'transparent' });
      ti.addEventListener('change', async ()=>{ await saveList((normed)=>{ normed[i].titulo = ti.value; }); });

      const ri = el('input',{type:'text',value:t.responsavel||'',style:'width:100%;border:1px solid transparent;border-radius:6px;padding:6px 8px;background:transparent;font-size:0.875rem;color:#1f2937;transition:border-color .2s ease,background .2s ease'});
      enhanceField(ri,{ baseBorder:'transparent' });
      manageBackground(ri,{ base:'transparent' });
      ri.addEventListener('change', async ()=>{ await saveList((normed)=>{ normed[i].responsavel = ri.value; }); });

      const si = el('select',{style:'width:100%;border:1px solid transparent;border-radius:6px;padding:6px 8px;background:transparent;font-size:0.875rem;color:#1f2937;transition:border-color .2s ease,background .2s ease'},[
        el('option',{value:'todo',textContent:'Não iniciado'}),
        el('option',{value:'doing',textContent:'Em andamento'}),
        el('option',{value:'done',textContent:'Concluída'}),
        el('option',{value:'late',textContent:'Atrasada'})
      ]);
      enhanceField(si,{ baseBorder:'transparent' });
      manageBackground(si,{ base:'transparent' });
      si.value = normalizeStatus(t.status)||computeStatus(t);
      si.addEventListener('change', async ()=>{
        const v = si.value;
        await saveList((normed)=>{
          normed[i].status = v;
          normed[i].done = (v==='done');
        });
        await rerender();
      });

      const di = el('input',{type:'date',value:(t.prazo||'').slice(0,10),style:'width:100%;border:1px solid transparent;border-radius:6px;padding:6px 8px;background:transparent;font-size:0.875rem;color:#1f2937;transition:border-color .2s ease,background .2s ease'});
      enhanceField(di,{ baseBorder:'transparent' });
      manageBackground(di,{ base:'transparent' });
      di.addEventListener('change', async ()=>{
        await saveList((normed)=>{
          normed[i].prazo = di.value;
          if(normed[i].status !== 'done') normed[i].status = computeStatus(normed[i]);
        });
        await rerender();
      });

      const del = el('button',{className:'btn btn--ghost',title:'Remover',style:mergeStyles(BASE_BUTTON_STYLE,'background:#fee2e2;color:#991b1b;border:1px solid #fecaca;min-width:36px;padding:8px 12px;font-size:0.875rem;')},['🗑']);
      del.addEventListener('focus', ()=>{ del.style.transform = 'scale(0.98)'; });
      del.addEventListener('blur', ()=>{ del.style.transform = 'scale(1)'; });
      del.addEventListener('mouseenter', ()=>{ del.style.background = '#fecaca'; });
      del.addEventListener('mouseleave', ()=>{ del.style.background = '#fee2e2'; });
      del.addEventListener('click', async ()=>{ await saveList((normed)=>{ normed.splice(i,1); }); await rerender(); });

      tr.append(
        el('td',{style:mergeStyles(cellBase,'border-radius:12px 0 0 12px;min-width:200px;')},[ti]),
        el('td',{style:mergeStyles(cellBase,'min-width:180px;')},[ri]),
        el('td',{style:mergeStyles(cellBase,'min-width:160px;')},[si]),
        el('td',{style:mergeStyles(cellBase,'min-width:140px;')},[di]),
        el('td',{style:mergeStyles(cellBase,'border-radius:0 12px 12px 0;text-align:right;')},[del])
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
  const requiredFields = [
    [inTitle,'o título da tarefa'],
    [inResp,'o responsável'],
    [inDate,'o prazo']
  ];

  btnAdd.addEventListener('click', async ()=>{
    const missing = requiredFields.filter(([input])=> !(input.value && input.value.trim()));
    requiredFields.forEach(([input])=> clearInvalid(input));
    if(missing.length){
      missing.forEach(([input])=> markInvalid(input));
      const labels = missing.map(([,label])=>label);
      const readable = labels.length > 1 ? `${labels.slice(0,-1).join(', ')} e ${labels.slice(-1)[0]}` : labels[0];
      setFeedback('error',`Antes de adicionar, preencha ${readable}.`);
      return;
    }

    const title = inTitle.value.trim();
    const responsavel = inResp.value.trim();
    const prazo = inDate.value;

    btnAdd.disabled = true;
    const baseLabel = btnAdd.dataset.baseLabel || btnAdd.textContent;
    btnAdd.dataset.baseLabel = baseLabel;
    btnAdd.textContent = 'Adicionando…';
    btnAdd.style.opacity = '0.7';

    try{
      await saveList((normed)=>{
        normed.push(normTask({ titulo:title, responsavel, prazo, status:'todo' }));
      });
      inTitle.value=''; inResp.value=''; inDate.value='';
      requiredFields.forEach(([input])=> clearInvalid(input));
      setFeedback('success','Tarefa adicionada à lista.');
      setTimeout(()=>{ if(feedback.dataset.type === 'success') setFeedback('info','Preencha todos os campos obrigatórios para adicionar a tarefa.'); }, 2400);
      await rerender();
    } finally {
      btnAdd.disabled = false;
      btnAdd.textContent = baseLabel;
      btnAdd.style.opacity = '1';
    }
  });

  function selectedModel(){ return modelsSelect.value && taskModels[modelsSelect.value] ? taskModels[modelsSelect.value] : null; }
  btnAppend.addEventListener('click', async ()=>{
    const model = selectedModel();
    if(!model){
      markInvalid(modelsSelect);
      setFeedback('error','Selecione um modelo para adicioná-lo à lista.');
      return;
    }
    clearInvalid(modelsSelect);
    await saveList((normed)=>{ model.forEach(t=> normed.push(normTask(t))); });
    setFeedback('success','Modelo adicionado ao final da lista.');
    setTimeout(()=>{ if(feedback.dataset.type === 'success') setFeedback('info','Preencha todos os campos obrigatórios para adicionar a tarefa.'); }, 2400);
    await rerender();
  });
  btnReplace.addEventListener('click', async ()=>{
    const model = selectedModel();
    if(!model){
      markInvalid(modelsSelect);
      setFeedback('error','Escolha um modelo para substituir a lista atual.');
      return;
    }
    clearInvalid(modelsSelect);
    await saveList((normed, draft)=>{ draft.checklist = model.map(normTask); });
    setFeedback('success','Lista substituída pelo modelo selecionado.');
    setTimeout(()=>{ if(feedback.dataset.type === 'success') setFeedback('info','Preencha todos os campos obrigatórios para adicionar a tarefa.'); }, 2400);
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

