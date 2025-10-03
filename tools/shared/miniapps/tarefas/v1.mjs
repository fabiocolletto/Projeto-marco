import { uid as makeUid } from '../../utils/ids.mjs';
import { el, clear, ensureHost } from '../../utils/dom.mjs';
import { getProject, updateProject } from '../../utils/store.mjs';

// ===============================
// tools/shared/miniapps/tarefas/v1.mjs
// ===============================
// MiniApp Tarefas — v1 (atualizado)
// - Coluna de Status (Não iniciado / Em andamento / Concluída / Atrasada)
// - **Sem** coluna "Feita"; `done` é derivado de status
// - Botão de exclusão por ícone (🗑)
// - Cabeçalho da tabela sem bordas e visual limpo

/* API
import { loadSharedModule } from '../tools/shared/runtime/loader.mjs';

const ac = await loadSharedModule('core/eventsCore.v2.mjs');
const { mountTasksMiniApp } = await loadSharedModule('miniapps/tarefas/v1.mjs');

mountTasksMiniApp(rootElement, {
  ac,
  store, // projectStore
  bus,   // marcoBus
  getCurrentId: ()=> state.currentId // função que devolve o id atual do evento
});
*/

// ---------- Helpers internos ----------
const normalizeStatus = (s)=>{
  const k = String(s||'').trim().toLowerCase();
  const map = {
    'a fazer':'todo','nao iniciado':'todo','não iniciado':'todo','não-iniciado':'todo','pendente':'todo','todo':'todo',
    'iniciado':'doing','em andamento':'doing','andamento':'doing','doing':'doing',
    'concluida':'done','concluída':'done','feito':'done','done':'done',
    'atrasada':'late','atrasado':'late','late':'late'
  };
  return map[k] || '';
};
const computeStatus = (t)=>{
  try{ if(window.__ac_core_tasks_compute__) return window.__ac_core_tasks_compute__(t); }catch{}
  const prazo = t?.prazo || t?.due || '';
  if(prazo){ const d = new Date(prazo); const ref = new Date(); ref.setHours(0,0,0,0); if(!Number.isNaN(+d) && d < ref) return 'late'; }
  return normalizeStatus(t?.status) || 'todo';
};

// ---------- Normalização ----------
const normTask = (t={})=>{
  const base = {
    id: t.id || makeUid('task'),
    titulo: t.titulo ?? t.nome ?? t.title ?? t.text ?? '',
    responsavel: t.responsavel ?? t.owner ?? t.assign ?? '',
    prazo: t.prazo ?? t.data ?? t.due ?? '',   // YYYY-MM-DD preferencial
    notas: t.notas ?? t.obs ?? t.notes ?? ''
  };
  // status persistido (retrocompatível)
  const st = normalizeStatus(t.status) || computeStatus(t);
  base.status = st;
  // done derivado do status
  base.done = (st === 'done');
  return base;
};

// ---------- Modelos prontos ----------
export const taskModels = {
  casamento: [
    { titulo:'Definir orçamento', responsavel:'Anfitrião', prazo:'' },
    { titulo:'Reservar local da cerimônia', responsavel:'Cerimonial', prazo:'' },
    { titulo:'Reservar buffet', responsavel:'Cerimonial', prazo:'' },
    { titulo:'Contratar fotógrafo', responsavel:'Cerimonial', prazo:'' },
    { titulo:'Lista de convidados inicial', responsavel:'Anfitrião', prazo:'' }
  ],
  debutante15: [
    { titulo:'Definir tema/festa', responsavel:'Anfitrião', prazo:'' },
    { titulo:'Contratar DJ/banda', responsavel:'Cerimonial', prazo:'' },
    { titulo:'Coreografia valsa', responsavel:'Família', prazo:'' },
    { titulo:'Convites e distribuição', responsavel:'Anfitrião', prazo:'' }
  ],
  jantarCorporativo: [
    { titulo:'Briefing com equipe de marketing', responsavel:'Equipe', prazo:'' },
    { titulo:'Lista de VIPs', responsavel:'Comercial', prazo:'' },
    { titulo:'Reserva restaurante/espaco', responsavel:'Operações', prazo:'' },
    { titulo:'Material de apoio (brindes)', responsavel:'Marketing', prazo:'' }
  ]
};

// ---------- Render helpers ----------
function kpiRow(ac, list){
  const k = ac.stats.kpiTarefas(list||[]);
  return el('div',{className:'row row--center row--gap-md row--tight miniapp__legend'},[
    el('strong',{textContent:`${k.pendentes} pendentes`} ),
    el('span',{textContent:'•'}),
    el('span',{textContent:`${k.concluidas} concluídas • ${k.pctConcluidas}%`, className:'muted'})
  ]);
}

function progress(ac, list){
  const k = ac.stats.kpiTarefas(list||[]);
  const track = el('div',{className:'miniapp__progress-track'});
  const bar = el('div',{className:'miniapp__progress-bar'});
  bar.style.width = `${k.pctConcluidas}%`;
  track.appendChild(bar);
  return track;
}

// ---------- UI principal ----------
export function mountTasksMiniApp(root, { ac, store, bus, getCurrentId }){
  const host = ensureHost(root);
  host.classList.add('miniapp','miniapp--tarefas');

  // Expor computeStatus do core para os helpers locais, se existir
  try{ window.__ac_core_tasks_compute__ = ac?.tasks?.computeStatus; }catch{}

  const header = el('div',{className:'row row--between row--center row--tight'},[
    el('h3',{textContent:'Tarefas', className:'miniapp__title'}),
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
  const modelsRow = el('div',{className:'row row--center row--gap-sm'},[
    modelsSelect, btnAppend, btnReplace
  ]);

  // Form de nova tarefa
  const inTitle = el('input',{type:'text',placeholder:'Nova tarefa',className:'miniapp__input miniapp__input--flex'});
  const inResp  = el('input',{type:'text',placeholder:'Responsável',className:'miniapp__input w-180'});
  const inDate  = el('input',{type:'date',className:'miniapp__input w-160'});
  const btnAdd  = el('button',{className:'btn',textContent:'Adicionar'});
  const addRow  = el('div',{className:'row row--center row--gap-sm'},[inTitle,inResp,inDate,btnAdd]);

  // Tabela
  const table = el('table',{className:'miniapp__table'});
  const thead = el('thead',{},[ el('tr',{},[
    el('th',{textContent:'Tarefa'}),
    el('th',{textContent:'Responsável'}),
    el('th',{textContent:'Status'}),
    el('th',{textContent:'Prazo'}),
    el('th',{textContent:'Ações'})
  ])]);
  const tbody = el('tbody');
  table.append(thead, tbody);

  host.append(header, kpiWrap, progWrap, modelsRow, addRow, table);

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

      const ti = el('input',{type:'text',value:t.titulo,className:'miniapp__input w-100'});
      ti.addEventListener('change', async ()=>{ await saveList((normed)=>{ normed[i].titulo = ti.value; }); });

      const ri = el('input',{type:'text',value:t.responsavel||'',className:'miniapp__input w-100'});
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

      const di = el('input',{type:'date',value:(t.prazo||'').slice(0,10),className:'miniapp__input w-100'});
      di.addEventListener('change', async ()=>{
        await saveList((normed)=>{
          normed[i].prazo = di.value;
          if(normed[i].status !== 'done') normed[i].status = computeStatus(normed[i]);
        });
        await rerender();
      });

      const del = el('button',{className:'btn btn--ghost miniapp__icon-btn',title:'Remover'},['🗑']);
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

  return { refresh: rerender };
