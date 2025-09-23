<!-- Exemplo mínimo de markup esperado (ids podem ser seus atuais) -->
<!-- Botões topo -->
<button id="btnIniciar"></button>
<button id="btnAbrir"></button>
<button id="btnSalvar"></button>
<button id="btnExportarPDF"></button>
<button id="btnCopiaEtiqueta"></button>
<button id="btnBaixaEtiqueta"></button>
<button id="btnExportaCSV"></button>

<!-- Inputs do evento -->
<input id="s1_evt_nome" />
<input id="s1_evt_data" type="date"/>
<input id="s1_evt_hora" type="time"/>
<input id="s1_evt_local"/>
<input id="s1_evt_endereco"/>
<input id="s1_evt_anfitriao"/>

<!-- Resumo/etiqueta compacto (fica sempre visível) -->
<div id="etiquetaBar">
  <strong data-bind="nome">—</strong>
  <span data-bind="datahora">—</span>
  <span data-bind="local">—</span>
  <span data-bind="endereco">—</span>
  <span data-bind="fone">—</span>
</div>

<!-- Lista de convidados -->
<div id="listaWrap">
  <ul id="listaUl"></ul>
  <button id="btnAddGuest">+</button>
  <input id="guestInput" placeholder="Nome do convidado"/>
  <div id="listaStats"></div>
  <textarea id="listaBulk" placeholder="Cole nomes aqui (um por linha, vírgulas ou tabs)"></textarea>
  <pre id="outLista" style="display:none"></pre>
</div>

<script type="module">
/**
 * initAppV3 – única função que orquestra tudo do App v3.
 * - Estado: evento + convidados, com persistência localStorage.
 * - Etiqueta/resumo sempre visível.
 * - “Iniciar” cria/abre arquivo lógico (suporte nativo a File System quando disponível).
 * - Abrir/Salvar JSON do projeto.
 * - Exportar: TXT (etiqueta), CSV (convidados), Imprimir (gera PDF via diálogo do navegador).
 * - Lista: adicionar pelo “+”, colagem em massa (dedup case-insensitive), estatísticas.
 */
export function initAppV3(userCfg = {}) {
  const cfg = {
    storageKey: 'ac_evt_v3',
    // Seletores (pode adaptar aos seus)
    btnStart:        '#btnIniciar',
    btnOpen:         '#btnAbrir',
    btnSave:         '#btnSalvar',
    btnPrint:        '#btnExportarPDF',
    btnCopyTag:      '#btnCopiaEtiqueta',
    btnDownloadTag:  '#btnBaixaEtiqueta',
    btnExportCSV:    '#btnExportaCSV',

    // Campos do evento
    fields: {
      nome:      '#s1_evt_nome',
      data:      '#s1_evt_data',
      hora:      '#s1_evt_hora',
      local:     '#s1_evt_local',
      endereco:  '#s1_evt_endereco',
      anfitriao: '#s1_evt_anfitriao',
    },

    // Resumo/etiqueta
    etiquetaBar: '#etiquetaBar',

    // Lista de convidados
    listaUl:     '#listaUl',
    btnAddGuest: '#btnAddGuest',
    guestInput:  '#guestInput',
    listaBulk:   '#listaBulk',
    listaStats:  '#listaStats',
    outLista:    '#outLista',

    ...userCfg
  };

  const $  =(s,el=document)=>el.querySelector(s);
  const $$ =(s,el=document)=>Array.from(el.querySelectorAll(s));

  const fmt = {
    dateBR: iso => !iso ? '' : String(iso).split('-').reverse().join('/'),
    dataHora(e){
      const d=this.dateBR(e.data); return [d, e.hora].filter(Boolean).join(' ');
    }
  };
  const mask = {
    fone: s => (s||'').match(/(\(?\d{2}\)?\s*\d{4,5}[- ]?\d{4})/)?.[0] || (s||'')
  };

  const state = {
    evento: { nome:'', data:'', hora:'', local:'', endereco:'', anfitriao:'' },
    convidados: [], // array de strings únicas (case-insensitive)
    meta: { version: 3 }
  };

  // Restaura do localStorage
  try {
    const raw = JSON.parse(localStorage.getItem(cfg.storageKey)||'{}');
    if (raw?.evento) Object.assign(state.evento, raw.evento);
    if (Array.isArray(raw?.convidados)) state.convidados = raw.convidados.slice(0, 100000);
  } catch(_){}

  let fileHandle = null; // File System Access API (quando suportado)

  // ==== Persistência ====
  function persist() {
    localStorage.setItem(cfg.storageKey, JSON.stringify({
      evento: state.evento,
      convidados: state.convidados,
      meta: state.meta
    }));
  }

  // ==== Inputs <-> Estado ====
  const fieldEntries = Object.entries(cfg.fields)
    .map(([k,sel])=>[k, $(sel)])
    .filter(([,el])=>!!el);

  function paintInputs(){
    fieldEntries.forEach(([k,el])=>{
      const val = state.evento[k] ?? '';
      if (el && el.value !== val) el.value = val;
    });
  }

  function syncFromInputs(){
    fieldEntries.forEach(([k,el])=>{
      if (!el) return;
      state.evento[k] = el.value.trim();
    });
    persist();
    syncEtiqueta();
  }

  fieldEntries.forEach(([k,el])=>{
    el?.addEventListener('input', () => { state.evento[k] = el.value.trim(); persist(); syncEtiqueta(); });
  });

  // ==== Etiqueta/Resumo ====
  function etiquetaTexto(){
    const e=state.evento;
    return [
      `Evento: ${e.nome||'-'}`,
      `Data: ${fmt.dateBR(e.data)||'-'}${e.hora?` às ${e.hora}`:''}`,
      `Local: ${e.local||'-'}`,
      `Endereço: ${e.endereco||'-'}`,
      `Contato: ${e.anfitriao||'-'}`
    ].join('\n');
  }

  function syncEtiqueta(){
    const e=state.evento;
    $$('#etiquetaBar [data-bind], [data-bind]', $(cfg.etiquetaBar) || document).forEach(el=>{
      const k = el.dataset.bind;
      el.textContent =
        k==='datahora' ? (fmt.dataHora(e) || '—') :
        k==='fone'     ? (mask.fone(e.anfitriao) || '—') :
        (e[k] || '—');
    });
    // Atualiza estatísticas da lista também (andamento)
    paintListaStats();
  }

  // ==== Lista de Convidados ====
  const listaUl   = $(cfg.listaUl);
  const inputAdd  = $(cfg.guestInput);
  const btnAdd    = $(cfg.btnAddGuest);
  const bulkTa    = $(cfg.listaBulk);
  const outLista  = $(cfg.outLista);

  function canonical(s){ return s.trim().replace(/\s+/g,' '); }
  function keyCI(s){ return canonical(s).toLowerCase(); }

  function addGuest(name){
    const c = canonical(name);
    if (!c) return false;
    const key = keyCI(c);
    if (!state.convidados.some(n=>keyCI(n)===key)){
      state.convidados.push(c);
      state.convidados.sort((a,b)=>a.localeCompare(b,'pt-BR'));
      persist();
      paintLista();
      return true;
    }
    return false;
  }

  function removeGuest(name){
    const key = keyCI(name);
    const i = state.convidados.findIndex(n=>keyCI(n)===key);
    if (i>=0){
      state.convidados.splice(i,1);
      persist();
      paintLista();
    }
  }

  function paintLista(){
    if (!listaUl) return;
    listaUl.innerHTML = '';
    state.convidados.forEach(n=>{
      const li = document.createElement('li');
      li.textContent = n;
      li.style.display='flex';
      li.style.alignItems='center';
      li.style.gap='8px';
      const rm = document.createElement('button');
      rm.type='button'; rm.textContent='×';
      rm.setAttribute('aria-label',`Remover ${n}`);
      rm.addEventListener('click', ()=>removeGuest(n));
      li.appendChild(rm);
      listaUl.appendChild(li);
    });
    paintListaStats();
    if (outLista) outLista.textContent = state.convidados.join('\n');
  }

  function paintListaStats(){
    const el=$(cfg.listaStats);
    if (!el) return;
    const filledFields = Object.values(state.evento).filter(v=>String(v||'').trim()).length;
    const totalFields = 6;
    const pct = Math.round((filledFields/totalFields)*100);
    const total = state.convidados.length;
    el.textContent = `Andamento: ${pct}% • Convidados: ${total}`;
  }

  btnAdd?.addEventListener('click', ()=>{
    if (addGuest(inputAdd?.value||'')) { if (inputAdd) inputAdd.value=''; }
    inputAdd?.focus();
  });

  inputAdd?.addEventListener('keydown', (ev)=>{
    if (ev.key==='Enter'){ ev.preventDefault(); btnAdd?.click(); }
  });

  bulkTa?.addEventListener('input', (e)=>{
    // Normaliza entrada em massa (nova linha, vírgula, ponto-e-vírgula, tab)
    const tokens=String(e.target.value)
      .replace(/\r\n?/g,'\n')
      .split(/\n|,|;|\t/g)
      .map(s=>canonical(s))
      .filter(Boolean);

    // Dedup mantendo ordem de primeira ocorrência (case-insensitive)
    const seen = new Set();
    const uniq = [];
    for (const t of tokens){
      const k = keyCI(t);
      if (!seen.has(k)){ seen.add(k); uniq.push(t); }
    }
    if (outLista) outLista.textContent = uniq.join('\n');
  });

  // Se o usuário quiser despejar o texto processado no estado:
  outLista?.addEventListener('dblclick', ()=>{
    const lines = outLista.textContent.split('\n').map(canonical).filter(Boolean);
    lines.forEach(addGuest);
  });

  // ==== Arquivo (Abrir/Salvar) ====
  async function salvarArquivo(handle = fileHandle){
    const payload = new Blob([JSON.stringify({evento:state.evento, convidados:state.convidados, meta:state.meta}, null, 2)], {type:'application/json'});
    const nomeSug = (state.evento.nome||'evento').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') || 'evento';
    // File System Access API
    if (handle?.createWritable){
      const w = await handle.createWritable();
      await w.write(payload); await w.close();
      return true;
    }
    if ('showSaveFilePicker' in window){
      const h = await window.showSaveFilePicker({
        suggestedName: `${nomeSug || 'evento'}.json`,
        types: [{ description: 'Projeto do Assistente Cerimonial', accept:{'application/json':['.json']} }]
      });
      fileHandle = h;
      return salvarArquivo(h);
    }
    // Fallback: download
    const url=URL.createObjectURL(payload);
    const a=document.createElement('a');
    a.href=url; a.download=`${nomeSug || 'evento'}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url); a.remove();},0);
    return true;
  }

  async function abrirArquivo(){
    // Preferível: File System Access API
    if ('showOpenFilePicker' in window){
      const [h] = await window.showOpenFilePicker({
        types: [{ description: 'Projeto do Assistente Cerimonial', accept:{'application/json':['.json']} }]
      });
      fileHandle = h;
      const f = await h.getFile();
      const json = JSON.parse(await f.text());
      carregarEstado(json);
      return true;
    }
    // Fallback: <input type="file">
    return new Promise((resolve)=>{
      const inp=document.createElement('input');
      inp.type='file'; inp.accept='application/json';
      inp.addEventListener('change', async ()=>{
        const f=inp.files?.[0]; if (!f) return resolve(false);
        const json = JSON.parse(await f.text());
        carregarEstado(json);
        resolve(true);
      }, {once:true});
      inp.click();
    });
  }

  function carregarEstado(json){
    if (json?.evento && typeof json.evento==='object'){
      Object.assign(state.evento, json.evento);
    }
    if (Array.isArray(json?.convidados)){
      state.convidados = Array.from(new Set(json.convidados.map(canonical).filter(Boolean)));
      state.convidados.sort((a,b)=>a.localeCompare(b,'pt-BR'));
    }
    persist();
    paintInputs(); syncEtiqueta(); paintLista();
  }

  // ==== Exportações rápidas ====
  async function copyEtiqueta(){
    const txt = etiquetaTexto();
    try{
      await navigator.clipboard.writeText(txt);
    }catch(_){
      const ta=document.createElement('textarea');
      ta.value=txt; ta.style.position='fixed'; ta.style.top='-1000px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
  }

  function downloadEtiqueta(){
    const blob=new Blob([etiquetaTexto()],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='etiqueta.txt';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url); a.remove();},0);
  }

  function exportCSV(){
    // CSV simples: Nome\n
    const rows = [['nome']].concat(state.convidados.map(n=>[n]));
    const csv = rows.map(r=>r.map(v=>{
      const s=String(v??'');
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(';')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='convidados.csv';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url); a.remove();},0);
  }

  function imprimirPDF(){
    // Use suas @media print para gerar o PDF como você já faz
    window.print();
  }

  // ==== “Iniciar” (experiência simplificada) ====
  async function startFlow(){
    // Sincroniza inputs -> estado e “abre” um arquivo lógico para este evento
    syncFromInputs();
    // Se File System Access existir, sugere já salvar
    if ('showSaveFilePicker' in window){
      try { await salvarArquivo(); } catch(_){}
    }
    // Atualiza UI (o resto já está sincronizado)
  }

  // ==== Ligações dos botões ====
  $(cfg.btnStart)?.addEventListener('click', startFlow);
  $(cfg.btnOpen)?.addEventListener('click', abrirArquivo);
  $(cfg.btnSave)?.addEventListener('click', ()=>salvarArquivo());
  $(cfg.btnPrint)?.addEventListener('click', imprimirPDF);
  $(cfg.btnCopyTag)?.addEventListener('click', copyEtiqueta);
  $(cfg.btnDownloadTag)?.addEventListener('click', downloadEtiqueta);
  $(cfg.btnExportCSV)?.addEventListener('click', exportCSV);

  // ==== Inicialização ====
  paintInputs(); syncEtiqueta(); paintLista();

  // API opcional para uso externo
  return {
    getState: ()=>JSON.parse(JSON.stringify(state)),
    setState: (next)=>carregarEstado(next),
    addGuest, removeGuest,
    salvarArquivo: ()=>salvarArquivo(),
    abrirArquivo,
    exportCSV, copyEtiqueta, downloadEtiqueta, imprimirPDF,
    repaint: ()=>{ paintInputs(); syncEtiqueta(); paintLista(); }
  };
}

// Inicialização automática, se quiser:
document.addEventListener('DOMContentLoaded', ()=> { try{ initAppV3(); }catch(_){} });
</script>
