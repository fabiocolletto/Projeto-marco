// ===============================
import { uid as makeUid } from '../../utils/ids.mjs';
import { el, clear, ensureHost } from '../../utils/dom.mjs';
import { formatMoneyBR, parseCurrencyBR, formatDateBR, toISODate, maskPhoneBR } from '../../utils/br.mjs';
import { getProject, updateProject } from '../../utils/store.mjs';

// ===============================
// tools/shared/miniapps/fornecedores/v1.mjs
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
// import { loadSharedModule } from '../tools/shared/runtime/loader.mjs';
//
// const ac = await loadSharedModule('core/eventsCore.v2.mjs');
// const { mountFornecedoresMiniApp } = await loadSharedModule('miniapps/fornecedores/v1.mjs');
//
// mountFornecedoresMiniApp(rootElement, {
//   ac,
//   store, // projectStore
//   bus,   // marcoBus
//   getCurrentId: ()=> state.currentId
// });

// ---------- Utils básicos ----------
const nextId = () => makeUid('supplier');

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

function normFornecedor(it={}){
  const base = {
    id: it.id || nextId(),
    fornecedor: it.fornecedor ?? it.nome ?? it.title ?? '',
    contato: it.contato ?? '',
    telefone: it.telefone ?? it.phone ?? '',
    categoria: it.categoria ?? it.tipo ?? '',
    dataEntrega: toISODate(it.dataEntrega || it.entrega || it.date || ''), // persistimos ISO
    valor: Number(it.valor ?? it.total ?? 0) || 0,
    pago: Number(it.pago ?? it.valorPago ?? 0) || 0,
    notas: it.notas ?? it.obs ?? it.notes ?? ''
  };
  base.status = normalizeStatus(it.status) || computeStatus(base);
  return base;
}

function formatMoney(ac, value){
  try{
    return ac?.format?.money ? ac.format.money(Number(value) || 0) : formatMoneyBR(value);
  }catch{
    return formatMoneyBR(value);
  }
}

function parseMoneyValue(ac, raw){
  try{
    return ac?.format?.parseCurrencyBR ? ac.format.parseCurrencyBR(raw) : parseCurrencyBR(raw);
  }catch{
    return parseCurrencyBR(raw);
  }
}

function formatDate(ac, value){
  if(!value) return '';
  try{
    return ac?.format?.fmtDateBR ? ac.format.fmtDateBR(value) : formatDateBR(value);
  }catch{
    return formatDateBR(value);
  }
}

function maskPhoneValue(ac, value){
  try{
    return ac?.format?.maskPhone ? ac.format.maskPhone(value) : maskPhoneBR(value);
  }catch{
    return maskPhoneBR(value);
  }
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
  return el('div',{className:'row row--center row--gap-md row--tight miniapp__legend'},[
    el('strong',{textContent:`${formatMoney(ac, pago)} pagos — ${pct}%`}),
    el('span',{textContent:'•'}),
    el('span',{textContent:`Total: ${formatMoney(ac, total)}`, className:'muted'})
  ]);
}

function progress(ac, list){
  const total = list.reduce((a,b)=> a + (Number(b.valor)||0), 0);
  const pago  = list.reduce((a,b)=> a + (Number(b.pago)||0), 0);
  const pct = total>0 ? Math.round((pago/total)*100) : 0;
  const track = el('div',{className:'miniapp__progress-track'});
  const bar = el('div',{className:'miniapp__progress-bar'});
  bar.style.width = `${pct}%`;
  track.appendChild(bar);
  return track;
}

// ---------- Editor expandido ----------
function editorRow(ac, item, onChange){
  const wrap = el('div',{className:'miniapp__editor'});

  const inFornecedor = el('input',{type:'text',value:item.fornecedor||'',placeholder:'Fornecedor',className:'miniapp__input miniapp__input--flex'});
  const inContato    = el('input',{type:'text',value:item.contato||'',placeholder:'Contato',className:'miniapp__input miniapp__input--flex'});
  const inTel        = el('input',{type:'text',value:item.telefone||'',placeholder:'Telefone',className:'miniapp__input w-180'});
  const inCat        = el('input',{type:'text',value:item.categoria||'',placeholder:'Categoria',className:'miniapp__input w-160'});
  const inEnt        = el('input',{type:'date',value:(item.dataEntrega||'').slice(0,10),className:'miniapp__input w-160'});
  const inVal        = el('input',{type:'text',value:formatMoney(ac, item.valor||0),className:'miniapp__input w-140'});
  const inPago       = el('input',{type:'text',value:formatMoney(ac, item.pago||0),className:'miniapp__input w-140'});
  const inStatus     = el('select',{className:'miniapp__select w-160'},[
    el('option',{value:'planejado',textContent:'Planejado'}),
    el('option',{value:'contratado',textContent:'Contratado'}),
    el('option',{value:'parcial',textContent:'Pago parcial'}),
    el('option',{value:'pago',textContent:'Pago (100%)'}),
    el('option',{value:'cancelado',textContent:'Cancelado'})
  ]);
  inStatus.value = computeStatus(item);
  const inNotas = el('textarea',{value:item.notas||'',placeholder:'Anotações',rows:3,className:'miniapp__textarea'});

  inTel.addEventListener('input', ()=>{ inTel.value = maskPhoneValue(ac, inTel.value); });
  const syncMoney = (inp, key)=>{
    inp.addEventListener('blur', ()=>{ const num = parseMoneyValue(ac, inp.value); inp.value = formatMoney(ac, num); onChange({[key]: num}); });
    inp.addEventListener('change', ()=>{ const num = parseMoneyValue(ac, inp.value); onChange({[key]: num}); });
  };
  syncMoney(inVal,'valor'); syncMoney(inPago,'pago');

  inFornecedor.addEventListener('change', ()=> onChange({fornecedor: inFornecedor.value}));
  inContato.addEventListener('change',    ()=> onChange({contato: inContato.value}));
  inTel.addEventListener('change',        ()=>{ inTel.value = maskPhoneValue(ac, inTel.value); onChange({telefone: inTel.value}); });
  inCat.addEventListener('change',        ()=> onChange({categoria: inCat.value}));
  inEnt.addEventListener('change',        ()=> onChange({dataEntrega: inEnt.value}));
  inStatus.addEventListener('change',     ()=> onChange({status: inStatus.value}));
  inNotas.addEventListener('change',      ()=> onChange({notas: inNotas.value}));

  const grid = el('div',{className:'miniapp__grid'},[
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
  if(opts.full) w.classList.add('fld--full');
  return w;
}

// ---------- Montagem principal ----------
export function mountFornecedoresMiniApp(root, { ac, store, bus, getCurrentId }){
  const host = ensureHost(root);
  host.classList.add('miniapp','miniapp--fornecedores');

  const header = el('div',{className:'row row--between row--center row--tight'},[
    el('h3',{textContent:'Fornecedores', className:'miniapp__title'}),
  ]);

  const kpiWrap = el('div');
  const progWrap = el('div',{className:'progress progress--lg'});

  // Form de novo contrato
  const inFornecedor = el('input',{type:'text',placeholder:'Fornecedor',className:'miniapp__input miniapp__input--flex'});
  const inContato    = el('input',{type:'text',placeholder:'Contato',className:'miniapp__input miniapp__input--flex'});
  const inTel        = el('input',{type:'text',placeholder:'Telefone',className:'miniapp__input w-160'});
  const inCat        = el('input',{type:'text',placeholder:'Categoria',className:'miniapp__input w-160'});
  const inEnt        = el('input',{type:'date',className:'miniapp__input w-160'});
  const inVal        = el('input',{type:'text',placeholder:'R$ 0,00',className:'miniapp__input w-140'});
  const inPago       = el('input',{type:'text',placeholder:'R$ 0,00',className:'miniapp__input w-140'});
  const inStatus     = el('select',{className:'miniapp__select w-160'},[
    el('option',{value:'',textContent:'Status…'}),
    el('option',{value:'planejado',textContent:'Planejado'}),
    el('option',{value:'contratado',textContent:'Contratado'}),
    el('option',{value:'parcial',textContent:'Pago parcial'}),
    el('option',{value:'pago',textContent:'Pago (100%)'}),
    el('option',{value:'cancelado',textContent:'Cancelado'})
  ]);
  const btnAdd = el('button',{className:'btn',textContent:'Adicionar contrato'});
  inTel.addEventListener('input', ()=>{ inTel.value = maskPhoneValue(ac, inTel.value); });
  const moneyBlur = (inp)=> inp.addEventListener('blur', ()=>{ const n=parseMoneyValue(ac, inp.value); inp.value = formatMoney(ac,n); });
  moneyBlur(inVal); moneyBlur(inPago);
  const addRow = el('div',{className:'row row--center row--gap-sm'},[
    inFornecedor,inContato,inTel,inCat,inEnt,inVal,inPago,inStatus,btnAdd
  ]);

  // Tabela
  const table = el('table',{className:'miniapp__table'});
  const thead = tableHeader();
  const tbody = el('tbody');
  table.append(thead, tbody);

  // Monta no root
  host.append(header, kpiWrap, progWrap, addRow, table);

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
      const td = (child, cls)=> el('td',cls?{className:cls}:{},[child]);

      const tFor = el('span',{textContent: it.fornecedor||'—'});
      const tCon = el('span',{textContent: it.contato||'—'});
      const tTel = el('span',{textContent: it.telefone || '—'});
      const tCat = el('span',{textContent: it.categoria||'—'});
      const tEnt = el('span',{textContent: formatDate(ac, it.dataEntrega)||'—'});
      const tVal = el('span',{textContent: formatMoney(ac, it.valor||0)});
      const tPag = el('span',{textContent: formatMoney(ac, it.pago||0)});

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
      const menu = el('div',{className:'miniapp__menu'},[ el('details',{},[
        el('summary',{},['⋯']),
        el('div',{className:'miniapp__menu-pop'},[
          el('button',{type:'button',textContent:'Editar',onclick:()=> openEditor()}),
          el('button',{type:'button',textContent:'Duplicar',onclick:async ()=>{ await saveList((normed)=>{ const clone = JSON.parse(JSON.stringify(normed[i])); clone.id = nextId(); normed.splice(i+1,0,clone); }); await rerender(); }}),
          el('button',{type:'button',textContent:'Excluir',onclick:async ()=>{ await saveList((normed)=>{ normed.splice(i,1); }); await rerender(); }})
        ])
      ])]);

      tr.append(
        td(tFor), td(tCon), td(tTel), td(tCat), td(tEnt), td(tVal), td(tPag), td(st), td(menu,'actions')
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
      telefone:maskPhoneValue(ac, (inTel.value||'').trim()),
      categoria:(inCat.value||'').trim(),
      dataEntrega: inEnt.value||'',
      valor: parseMoneyValue(ac, inVal.value),
      pago: parseMoneyValue(ac, inPago.value),
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
