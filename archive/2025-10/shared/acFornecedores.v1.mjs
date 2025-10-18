// ===============================
// /shared/acFornecedores.v1.mjs
// ===============================
// MiniApp Fornecedores — v1 (documento único)
// - Colunas: Fornecedor, Contato, Telefone, Categoria, Entrega (BR), Valor, Pago, Status, Ações
// - Edição por linha via menu (⋯): Editar, Duplicar, Excluir
// - Campo de notas no editor expandido
// - Datas sempre exibidas em DD/MM/AAAA; persistência em YYYY-MM-DD
// - Valores em BRL (exibição com ac.format.money); persistência como Number (reais)
// - Autosave imediato via projectStore + marcoBus
//
// API de uso:
// import * as ac from '/shared/acEventsCore.v2.mjs';
// import { mountFornecedoresMiniApp } from '/shared/acFornecedores.v1.mjs';
//
// mountFornecedoresMiniApp(rootElement, {
//   ac,
//   store, // projectStore
//   bus,   // marcoBus
//   getCurrentId: ()=> state.currentId
// });

// ---------- Utils básicos ----------
const uid = (p='f')=> p + Math.random().toString(36).slice(2,10);

function el(tag, attrs={}, children=[]){
  const n = document.createElement(tag);
  Object.entries(attrs||{}).forEach(([k,v])=>{
    if(k==='className') n.className=v;
    else if(k==='dataset') Object.assign(n.dataset,v);
    else if(k in n) n[k]=v;
    else n.setAttribute(k,v);
  });
  (children||[]).forEach(c=> n.appendChild(typeof c==='string'? document.createTextNode(c) : c));
  return n;
}
function clear(node){ while(node && node.firstChild) node.removeChild(node.firstChild); }

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

// ---------- Normalização ----------
const normalizeStatus = (s)=>{
  const k = String(s||'').trim().toLowerCase();
  const map = {
    'planejado':'planejado','cotacao':'planejado','cotação':'planejado','proposta':'planejado',
    'contrato':'contratado','contratado':'contratado','pendente':'contratado','aberto':'contratado',
    'parcial':'parcial','pago parcial':'parcial','parcialmente pago':'parcial',
    'pago':'pago','quitado':'pago',
    'cancelado':'cancelado','cancelada':'cancelado'
  };
  return map[k] || '';
};
const computeStatus = (it)=>{
  if(String(it?.status||'').toLowerCase()==='cancelado') return 'cancelado';
  const v = Number(it?.valor||0)||0; const p = Number(it?.pago||0)||0;
  if(v>0 && p>=v) return 'pago';
  if(p>0 && p<v)  return 'parcial';
  return normalizeStatus(it?.status) || (v>0? 'contratado' : 'planejado');
};

const toISO = (d)=>{ // aceita 'YYYY-MM-DD' ou 'DD/MM/AAAA'
  if(!d) return '';
  const s = String(d).trim();
  if(/\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m){ const [_,dd,mm,yy]=m; return `${yy.padStart(4,'0')}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`; }
  const dt = new Date(s); if(!Number.isNaN(+dt)) return dt.toISOString().slice(0,10);
  return '';
};

function normFornecedor(it={}){
  const base = {
    id: it.id || uid(),
    fornecedor: it.fornecedor ?? it.nome ?? it.title ?? '',
    contato: it.contato ?? '',
    telefone: it.telefone ?? it.phone ?? '',
    categoria: it.categoria ?? it.tipo ?? '',
    dataEntrega: toISO(it.dataEntrega || it.entrega || it.date || ''), // persistimos ISO
    valor: Number(it.valor ?? it.total ?? 0) || 0,
    pago: Number(it.pago ?? it.valorPago ?? 0) || 0,
    notas: it.notas ?? it.obs ?? it.notes ?? ''
  };
  base.status = normalizeStatus(it.status) || computeStatus(base);
  return base;
}

// ---------- Formatação BR ----------
function fmtBRDate(ac, iso){
  if(!iso) return '';
  try{ return ac?.format?.fmtDateBR ? ac.format.fmtDateBR(iso) : iso.split('-').reverse().join('/'); }
  catch{ return iso.split('-').reverse().join('/'); }
}
function parseBRL(str){ // "1.234,56" -> 1234.56 (Number)
  const s = String(str||'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',', '.');
  const n = parseFloat(s); return Number.isFinite(n) ? n : 0;
}
function fmtBRL(ac, n){ try{ return ac?.format?.money ? ac.format.money(Number(n)||0) : (Number(n)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); } catch{ return `R$ ${(Number(n)||0).toFixed(2)}`; } }
function maskTelBR(v){
  let s = String(v||'').replace(/\D/g,'').slice(0,11);
  if(s.length<=10) return s.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (m,a,b,c)=> (a?`(${a}`:'') + (a&&a.length===2?') ':'') + (b||'') + (c?`-${c}`:'') );
  return s.replace(/(\d{0,2})(\d{0,5})(\d{0,4}).*/, (m,a,b,c)=> (a?`(${a}`:'') + (a&&a.length===2?') ':'') + (b||'') + (c?`-${c}`:'') );
}

// ---------- UI helpers ----------
function tableHeader(){
  return el('thead',{},[ el('tr',{},[
    el('th',{textContent:'Fornecedor'}),
    el('th',{textContent:'Contato'}),
    el('th',{textContent:'Telefone'}),
    el('th',{textContent:'Categoria'}),
    el('th',{textContent:'Entrega'}),
    el('th',{textContent:'Valor'}),
    el('th',{textContent:'Pago'}),
    el('th',{textContent:'Status'}),
    el('th',{textContent:'Ações'})
  ])]);
}

function kpiRow(ac, list){
  const total = list.reduce((a,b)=> a + (Number(b.valor)||0), 0);
  const pago  = list.reduce((a,b)=> a + (Number(b.pago)||0), 0);
  const pct = total>0 ? Math.round((pago/total)*100) : 0;
  return el('div',{className:'row',style:'gap:.75rem;align-items:center;margin:6px 0'},[
    el('strong',{textContent:`${fmtBRL(ac, pago)} pagos — ${pct}%`}),
    el('span',{textContent:'•'}),
    el('span',{textContent:`Total: ${fmtBRL(ac, total)}`, className:'muted'})
  ]);
}

function progress(ac, list){
  const total = list.reduce((a,b)=> a + (Number(b.valor)||0), 0);
  const pago  = list.reduce((a,b)=> a + (Number(b.pago)||0), 0);
  const pct = total>0 ? Math.round((pago/total)*100) : 0;
  const track = el('div',{className:'progress__track',style:'height:10px;border-radius:6px;background:#eef2f6;overflow:hidden'});
  const bar = el('div',{className:'progress__bar',style:`height:10px;border-radius:6px;background:#0b65c2;width:${pct}%;transition:width .25s ease`});
  track.appendChild(bar);
  return track;
}

// ---------- Editor expandido ----------
function editorRow(ac, item, onChange){
  const wrap = el('div',{className:'editor'});

  const inFornecedor = el('input',{type:'text',value:item.fornecedor||'',placeholder:'Fornecedor',style:'flex:1'});
  const inContato    = el('input',{type:'text',value:item.contato||'',placeholder:'Contato',style:'flex:1'});
  const inTel        = el('input',{type:'text',value:item.telefone||'',placeholder:'Telefone',style:'width:180px'});
  const inCat        = el('input',{type:'text',value:item.categoria||'',placeholder:'Categoria',style:'width:160px'});
  const inEnt        = el('input',{type:'date',value:(item.dataEntrega||'').slice(0,10),style:'width:160px'});
  const inVal        = el('input',{type:'text',value:fmtBRL(ac, item.valor||0),style:'width:140px'});
  const inPago       = el('input',{type:'text',value:fmtBRL(ac, item.pago||0),style:'width:140px'});
  const inStatus     = el('select',{},[
    el('option',{value:'planejado',textContent:'Planejado'}),
    el('option',{value:'contratado',textContent:'Contratado'}),
    el('option',{value:'parcial',textContent:'Pago parcial'}),
    el('option',{value:'pago',textContent:'Pago (100%)'}),
    el('option',{value:'cancelado',textContent:'Cancelado'})
  ]);
  inStatus.value = computeStatus(item);
  const inNotas = el('textarea',{value:item.notas||'',placeholder:'Anotações',rows:3,style:'width:100%;resize:vertical'});

  inTel.addEventListener('input', ()=>{ inTel.value = maskTelBR(inTel.value); });
  const syncMoney = (inp, key)=>{
    inp.addEventListener('blur', ()=>{ const num = parseBRL(inp.value); inp.value = fmtBRL(ac, num); onChange({[key]: num}); });
    inp.addEventListener('change', ()=>{ const num = parseBRL(inp.value); onChange({[key]: num}); });
  };
  syncMoney(inVal,'valor'); syncMoney(inPago,'pago');

  inFornecedor.addEventListener('change', ()=> onChange({fornecedor: inFornecedor.value}));
  inContato.addEventListener('change',    ()=> onChange({contato: inContato.value}));
  inTel.addEventListener('change',        ()=> onChange({telefone: inTel.value}));
  inCat.addEventListener('change',        ()=> onChange({categoria: inCat.value}));
  inEnt.addEventListener('change',        ()=> onChange({dataEntrega: inEnt.value}));
  inStatus.addEventListener('change',     ()=> onChange({status: inStatus.value}));
  inNotas.addEventListener('change',      ()=> onChange({notas: inNotas.value}));

  const grid = el('div',{className:'grid'},[
    labeled('Fornecedor', inFornecedor),
    labeled('Contato', inContato),
    labeled('Telefone', inTel),
    labeled('Categoria', inCat),
    labeled('Entrega (BR)', inEnt),
    labeled('Valor do contrato', inVal),
    labeled('Pago até agora', inPago),
    labeled('Status', inStatus),
    labeled('Anotações', inNotas, {full:true})
  ]);

  wrap.appendChild(grid);
  return wrap;
}
function labeled(lbl, input, opts={}){
  const w = el('label',{className:'fld'},[
    el('span',{className:'small',textContent:lbl}),
    input
  ]);
  if(opts.full) w.style.gridColumn = '1 / -1';
  return w;
}

// ---------- Montagem principal ----------
export function mountFornecedoresMiniApp(root, { ac, store, bus, getCurrentId }){
  if(!root) throw new Error('root inválido');

  // Estilos mínimos e escopados para o mini-app
  const style = el('style',{},[document.createTextNode(`
    .for-mini{font-size:14px}
    .for-mini .row{display:flex;gap:.5rem}
    .for-mini .muted{opacity:.75}
    .for-mini table{width:100%;border-collapse:separate;border-spacing:0 8px;margin-top:8px}
    .for-mini thead th{padding:8px 10px;font-size:12px;color:#555;border-bottom:0;background:transparent;text-align:left}
    .for-mini td{background:#fff;border:1px solid #e5e9f2;border-left-width:0;border-right-width:0;padding:8px 10px}
    .for-mini tr{box-shadow:0 1px 0 rgba(0,0,0,.03)}
    .for-mini .menu details{position:relative}
    .for-mini .menu summary{list-style:none;cursor:pointer;padding:4px 8px;border:1px solid #d0d7e2;border-radius:8px;background:#fff}
    .for-mini .menu summary::-webkit-details-marker{display:none}
    .for-mini .menu[open] summary{box-shadow:0 0 0 1px #0b65c2 inset}
    .for-mini .menu .pop{position:absolute;right:0;top:32px;background:#fff;border:1px solid #d0d7e2;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:2}
    .for-mini .menu .pop button{display:block;width:100%;text-align:left;padding:8px 12px;background:#fff;border:0}
    .for-mini .menu .pop button:hover{background:#f3f6fb}
    .for-mini .editor{padding:10px;border:1px dashed #d0d7e2;border-radius:8px;background:#fafcff;margin-top:8px}
    .for-mini .grid{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:.5rem}
    .for-mini .fld{display:flex;flex-direction:column;gap:4px}
    .for-mini input, .for-mini select, .for-mini textarea{padding:8px;border:1px solid #d0d7e2;border-radius:8px}
    .for-mini .btn{padding:8px 10px;border:1px solid #d0d7e2;border-radius:8px;background:#fff;cursor:pointer}
  `)]);

  const header = el('div',{className:'row',style:'justify-content:space-between;align-items:center;margin-bottom:8px'},[
    el('h3',{textContent:'Fornecedores', style:'margin:0;color:#0b65c2;font-size:1rem'}),
  ]);

  const kpiWrap = el('div');
  const progWrap = el('div',{className:'progress progress--lg'});

  // Form de novo contrato
  const inFornecedor = el('input',{type:'text',placeholder:'Fornecedor',style:'flex:1'});
  const inContato    = el('input',{type:'text',placeholder:'Contato',style:'flex:1'});
  const inTel        = el('input',{type:'text',placeholder:'Telefone',style:'width:160px'});
  const inCat        = el('input',{type:'text',placeholder:'Categoria',style:'width:160px'});
  const inEnt        = el('input',{type:'date',style:'width:160px'});
  const inVal        = el('input',{type:'text',placeholder:'R$ 0,00',style:'width:140px'});
  const inPago       = el('input',{type:'text',placeholder:'R$ 0,00',style:'width:140px'});
  const inStatus     = el('select',{},[
    el('option',{value:'',textContent:'Status…'}),
    el('option',{value:'planejado',textContent:'Planejado'}),
    el('option',{value:'contratado',textContent:'Contratado'}),
    el('option',{value:'parcial',textContent:'Pago parcial'}),
    el('option',{value:'pago',textContent:'Pago (100%)'}),
    el('option',{value:'cancelado',textContent:'Cancelado'})
  ]);
  const btnAdd = el('button',{className:'btn',textContent:'Adicionar contrato'});
  inTel.addEventListener('input', ()=>{ inTel.value = maskTelBR(inTel.value); });
  const moneyBlur = (inp)=> inp.addEventListener('blur', ()=>{ const n=parseBRL(inp.value); inp.value = fmtBRL(ac,n); });
  moneyBlur(inVal); moneyBlur(inPago);
  const addRow = el('div',{className:'row',style:'gap:.5rem;align-items:center;margin:8px 0;flex-wrap:wrap'},[
    inFornecedor,inContato,inTel,inCat,inEnt,inVal,inPago,inStatus,btnAdd
  ]);

  // Tabela
  const table = el('table',{className:'table'});
  const thead = tableHeader();
  const tbody = el('tbody');
  table.append(thead, tbody);

  // Monta no root
  root.classList?.add('for-mini');
  root.append(style, header, kpiWrap, progWrap, addRow, table);

  // ------- Estado local -------
  let currentId = getCurrentId?.();

  async function readList(){
    currentId = getCurrentId?.();
    const prj = await getProject(store, currentId) || {};
    const list = (prj.fornecedores||[]).map(normFornecedor);
    return { prj, list };
  }

  async function saveList(mutator){
    currentId = getCurrentId?.();
    const next = await updateProject(store, currentId, (draft)=>{
      draft.fornecedores ||= [];
      const normed = (draft.fornecedores||[]).map(normFornecedor);
      mutator(normed, draft);
      draft.fornecedores = normed.map(normFornecedor);
    });
    bus?.publish?.('ac:project-updated',{ id: currentId, updatedAt: Date.now() });
    return next;
  }

  function renderTable(ac, list){
    clear(tbody);
    list.forEach((it,i)=>{
      const tr = el('tr');
      const td = (child)=> el('td',{},[child]);

      const tFor = el('span',{textContent: it.fornecedor||'—'});
      const tCon = el('span',{textContent: it.contato||'—'});
      const tTel = el('span',{textContent: it.telefone||'—'});
      const tCat = el('span',{textContent: it.categoria||'—'});
      const tEnt = el('span',{textContent: fmtBRDate(ac, it.dataEntrega)||'—'});
      const tVal = el('span',{textContent: fmtBRL(ac, it.valor||0)});
      const tPag = el('span',{textContent: fmtBRL(ac, it.pago||0)});

      const st = el('select',{},[
        el('option',{value:'planejado',textContent:'Planejado'}),
        el('option',{value:'contratado',textContent:'Contratado'}),
        el('option',{value:'parcial',textContent:'Pago parcial'}),
        el('option',{value:'pago',textContent:'Pago (100%)'}),
        el('option',{value:'cancelado',textContent:'Cancelado'})
      ]);
      st.value = computeStatus(it);
      st.addEventListener('change', async ()=>{
        await saveList((normed)=>{ normed[i].status = st.value; });
        await rerender();
      });

      // menu de ações por linha
      const menu = el('div',{className:'menu'},[ el('details',{},[
        el('summary',{},['⋯']),
        el('div',{className:'pop'},[
          el('button',{type:'button',textContent:'Editar',onclick:()=> openEditor()}),
          el('button',{type:'button',textContent:'Duplicar',onclick:async ()=>{ await saveList((normed)=>{ const clone = JSON.parse(JSON.stringify(normed[i])); clone.id=uid(); normed.splice(i+1,0,clone); }); await rerender(); }}),
          el('button',{type:'button',textContent:'Excluir',onclick:async ()=>{ await saveList((normed)=>{ normed.splice(i,1); }); await rerender(); }})
        ])
      ])]);

      tr.append(
        td(tFor), td(tCon), td(tTel), td(tCat), td(tEnt), td(tVal), td(tPag), td(st), td(menu)
      );
      tbody.appendChild(tr);

      // editor expandido (linha abaixo)
      const trEdit = el('tr');
      const tdEdit = el('td',{colSpan:9});
      trEdit.appendChild(tdEdit);
      tbody.appendChild(trEdit);

      function openEditor(){
        clear(tdEdit);
        const ed = editorRow(ac, it, (patch)=>{
          saveList((normed)=>{ Object.assign(normed[i], patch); normed[i].status = computeStatus(normed[i]); });
          // KPIs/linha são re-renderados no próximo rerender
        });
        tdEdit.appendChild(ed);
      }
    });
  }

  async function rerender(){
    const { list } = await readList();
    clear(kpiWrap); kpiWrap.appendChild(kpiRow(ac, list));
    clear(progWrap); progWrap.appendChild(progress(ac, list));
    renderTable(ac, list);
  }

  // ------- Ações -------
  btnAdd.addEventListener('click', async ()=>{
    const base = normFornecedor({
      fornecedor:(inFornecedor.value||'').trim(),
      contato:(inContato.value||'').trim(),
      telefone:(inTel.value||'').trim(),
      categoria:(inCat.value||'').trim(),
      dataEntrega: inEnt.value||'',
      valor: parseBRL(inVal.value),
      pago: parseBRL(inPago.value),
      status: inStatus.value||''
    });
    if(!base.fornecedor){ inFornecedor.focus(); return; }
    await saveList((normed)=>{ normed.push(base); });
    inFornecedor.value=''; inContato.value=''; inTel.value=''; inCat.value=''; inEnt.value=''; inVal.value=''; inPago.value=''; inStatus.value='';
    await rerender();
  });

  // ------- Reatividade com o bus -------
  bus?.subscribe?.('ac:open-event', async ({id})=>{ if(id){ await rerender(); } });
  bus?.subscribe?.('ac:project-updated', async ({id})=>{ if(id===getCurrentId?.()) await rerender(); });

  // Primeira renderização
  rerender();

  return { refresh: rerender };
}
