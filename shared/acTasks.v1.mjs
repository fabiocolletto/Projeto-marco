// MiniApp Tarefas — v1.1
// Atualizações desta versão:
// - Remove a coluna "Feita" e passa a controlar conclusão via campo "Status"
// - Campo de Status (Não iniciado / Em andamento / Concluída / Atrasada)
// - Botão de exclusão com ícone (🗑) e cabeçalho da tabela sem bordas
// - Mantém compatibilidade com dados antigos (done/concluida/feito)

// ================= Helpers =================
const uid = (p='t')=> p + Math.random().toString(36).slice(2,10);

// Mapeia rótulos diversos para chaves canônicas
const normalizeStatus = (s)=>{
  const k = String(s||'').trim().toLowerCase();
  const map = {
    'nao iniciado':'todo','não iniciado':'todo','não-iniciado':'todo','a fazer':'todo','pendente':'todo','todo':'todo',
    'em andamento':'doing','andamento':'doing','doing':'doing',
    'concluida':'done','concluída':'done','feito':'done','concluída(s)':'done','done':'done',
    'atrasada':'late','atrasado':'late','late':'late'
  };
  return map[k] || '';
};

const computeStatus = (t)=>{
  const done = !!(t?.done ?? t?.concluida ?? t?.feito);
  if(done) return 'done';
  const st = normalizeStatus(t?.status);
  if(st) return st;
  const prazo = t?.prazo || t?.due || '';
  if(prazo){
    const d = new Date(prazo); const ref = new Date(); ref.setHours(0,0,0,0);
    if(!Number.isNaN(+d) && d < ref) return 'late';
  }
  return 'todo';
};

const normTask = (t={})=>{
  const base = {
    id: t.id || uid(),
    titulo: t.titulo ?? t.nome ?? t.title ?? t.text ?? '',
    responsavel: t.responsavel ?? t.owner ?? t.assign ?? '',
    prazo: t.prazo ?? t.data ?? t.due ?? '',
    done: !!(t.done ?? t.concluida ?? t.feito),
    notas: t.notas ?? t.obs ?? t.notes ?? ''
  };
  const st = normalizeStatus(t.status) || computeStatus(base);
  base.status = st;
  // coerência done/status
  if(base.status==='done') base.done=true; else if(base.done) base.status='done';
  return base;
};

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

// Persistência utilitária (store: projectStore)
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

// DOM helpers
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
  const k = ac.stats.kpiTarefas(list||[]);
  return el('div',{className:'row',style:'gap:.75rem;align-items:center;margin:6px 0'},[
    el('strong',{textContent:`${k.pendentes} pendentes`} ),
    el('span',{textContent:'•'}),
    el('span',{textContent:`${k.concluidas} concluídas • ${k.pctConcluidas}%`, className:'muted'})
  ]);
}

function progress(ac, list){
  const k = ac.stats.kpiTarefas(list||[]);
  const track = el('div',{className:'progress__track',style:'height:10px;border-radius:6px;background:#eef2f6;overflow:hidden'});
  const bar = el('div',{className:'progress__bar',style:`height:10px;border-radius:6px;background:#0b65c2;width:${k.pctConcluidas}%;transition:width .25s ease`});
  track.appendChild(bar);
  return track;
}

// ================== UI principal ==================
export function mountTasksMiniApp(root, { ac, store, bus, getCurrentId }){
  if(!root) throw new Error('root inválido');

  // escopo de estilos locais
  root.classList.add('ac-mini','ac-tasks');
  const style = el('style',{},[`
    .ac-tasks table{width:100%;border-collapse:separate;border-spacing:0 6px}
    .ac-tasks thead th{background:transparent;border:0;box-shadow:none;text-align:left;font-size:12px;color:#555;padding:4px 8px}
    .ac-tasks tbody td{background:#fafafa;border:0;padding:6px 8px}
    .ac-tasks tbody td:first-child{border-top-left-radius:10px;border-bottom-left-radius:10px}
    .ac-tasks tbody td:last-child{border-top-right-radius:10px;border-bottom-right-radius:10px}
    .ac-tasks .icon-btn{border:0;background:transparent;cursor:pointer;font-size:16px;line-height:1;padding:4px;border-radius:8px}
    .ac-tasks .icon-btn:hover{background:#ffe9d6}
  `]);
  root.appendChild(style);

  const header = el('div',{className:'row',style:'justify-content:space-between;align-items:center;margin-bottom:8px'},[
    el('h3',{textContent:'Tarefas', style:'margin:0;color:#0b65c2;font-size:1rem'})
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
  const table = el('table',{className:'table'});
  const thead = el('thead',{},[ el('tr',{},[
    el('th',{textContent:'Tarefa'}),
    el('th',{textContent:'Responsável'}),
    el('th',{textContent:'Status'}),
    el('th',{textContent:'Prazo'}),
    el('th',{textContent:'Ações'})
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
    // Notifica painel geral para atualizar KPIs sem recarregar
    bus?.publish?.('ac:project-updated',{ id: currentId, updatedAt: Date.now() });
    return next;
  }

  function rowStatusSelect(value){
    const sel = el('select',{},[
      el('option',{value:'todo',textContent:'Não iniciado'}),
      el('option',{value:'doing',textContent:'Em andamento'}),
      el('option',{value:'done',textContent:'Concluída'}),
      el('option',{value:'late',textContent:'Atrasada'})
    ]);
    sel.value = normalizeStatus(value)||'todo';
    return sel;
  }

  function renderTable(ac, list){
    clear(tbody);
    list.forEach((t,i)=>{
      const tr = el('tr');

      const ti = el('input',{type:'text',value:t.titulo,style:'width:100%'});
      ti.addEventListener('change', async ()=>{ await saveList((normed)=>{ normed[i].titulo = ti.value; }); });

      const ri = el('input',{type:'text',value:t.responsavel||'',style:'width:100%'});
      ri.addEventListener('change', async ()=>{ await saveList((normed)=>{ normed[i].responsavel = ri.value; }); });

      const si = rowStatusSelect(t.status);
      si.addEventListener('change', async ()=>{
        const v = si.value;
        await saveList((normed)=>{ normed[i].status = v; normed[i].done = (v==='done'); });
        await rerender();
      });

      const di = el('input',{type:'date',value:(t.prazo||'').slice(0,10),style:'width:100%'});
      di.addEventListener('change', async ()=>{ 
        await saveList((normed)=>{ 
          normed[i].prazo = di.value; 
          if(normed[i].status!=='done') normed[i].status = computeStatus(normed[i]);
        }); 
        await rerender();
      });

      const del = el('button',{className:'icon-btn',title:'Remover',ariaLabel:'Remover'},['🗑']);
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
    await saveList((normed)=>{ normed.push(normTask({ titulo:title, responsavel:inResp.value||'', prazo:inDate.value||'', status:'todo', done:false })); });
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
}
