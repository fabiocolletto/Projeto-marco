// AC — Mini‑App de Mensagens (v1)
// Padrão de montagem: mountMensagensMiniApp(host, { ac, store, bus, getCurrentId })
// Mantém compatibilidade com o ecossistema (autosave via store, eventos via bus).

export function mountMensagensMiniApp(host, deps){
  const { ac, store, bus, getCurrentId } = deps || {};
  if(!host) return;

  // ===== Estado local =====
  let projectId = (typeof getCurrentId === 'function') ? getCurrentId() : null;
  let project = null; // cache do projeto aberto
  let mensagens = []; // array mutável
  let saveTimer = null;
  const AUTO_SAVE_MS = 700;

  // ===== Helpers =====
  const $  = (sel, root = host) => root.querySelector(sel);
  const $$ = (sel, root = host) => [...root.querySelectorAll(sel)];
  const uid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2,7));

  const fmtDateBR = (d) => ac?.format?.fmtDateBR ? ac.format.fmtDateBR(d) : (d ? d.split('-').reverse().join('/') : '');
  const fmtDateTime = (d,h) => [fmtDateBR(d), (h||'').slice(0,5)].filter(Boolean).join(' ');
  const nowIsoDate = () => new Date(Date.now() - (new Date()).getTimezoneOffset()*60000).toISOString().slice(0,10);
  const today = nowIsoDate();

  function ensureShape(p){
    if(!p || typeof p !== 'object') p = {};
    p.mensagens ||= [];
    return p;
  }

  function scheduleSave(){
    if(saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, AUTO_SAVE_MS);
  }

  async function doSave(){
    if(!projectId) return;
    try{
      const fresh = await store.getProject?.(projectId);
      const next = ensureShape(fresh||{});
      // persistir somente o bloco de mensagens nesta operação
      next.mensagens = mensagens.slice();
      next.updatedAt = Date.now();
      await store.updateProject?.(projectId, next);
      project = await store.getProject?.(projectId);
      bus?.publish?.('ac:project-updated', { id: projectId, updatedAt: next.updatedAt });
    }catch(err){ console.error('[acMensagens] save error', err); }
  }

  function setMensagens(arr){
    mensagens = Array.isArray(arr) ? arr.slice() : [];
    mensagens.forEach(ensureMsgShape);
    renderList();
  }

  function ensureMsgShape(m){
    m.id ||= uid();
    m.titulo ||= '';
    m.canal ||= 'WhatsApp';
    // manter padrão core: campos `data` e `hora`
    if(!m.data) m.data = '';
    if(!m.hora) m.hora = '';
    m.alvo ||= 'Todos convidados'; // Confirmados, Pendentes, Fornecedores, Personalizado
    m.destinatarios ||= ''; // quando Personalizado
    m.status ||= inferStatus(m); // rascunho, agendado, enviado, cancelado
    m.nota ||= '';
    return m;
  }

  function inferStatus(m){
    if(!m?.data) return 'rascunho';
    const when = new Date(`${m.data}T${(m.hora||'00:00')}:00`);
    const now = new Date();
    if(isNaN(when.getTime())) return 'rascunho';
    return (when.getTime() <= now.getTime()) ? 'enviado' : 'agendado';
  }

  function sortMensagens(a,b){
    const ad = a?.data || ''; const bd = b?.data || '';
    if(ad !== bd) return (ad < bd ? -1 : 1);
    const ah = (a?.hora||''); const bh = (b?.hora||'');
    return (ah < bh ? -1 : (ah > bh ? 1 : 0));
  }

  // ===== UI =====
  host.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'ac-msgs';
  wrap.innerHTML = `
    <style>
      .ac-msgs{font:inherit}
      .ac-msgs .form{display:grid;grid-template-columns:1.2fr .9fr .7fr .6fr .9fr auto;gap:8px;align-items:end;margin-bottom:12px}
      .ac-msgs .field{display:flex;flex-direction:column}
      .ac-msgs .field label{font-size:.8rem;color:#555;margin:0 0 4px}
      .ac-msgs input, .ac-msgs select, .ac-msgs textarea{border:1px solid #d7dce2;border-radius:8px;padding:6px 8px;font:inherit}
      .ac-msgs textarea{min-height:34px;resize:vertical}
      .ac-msgs button{border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:8px 10px;cursor:pointer}
      .ac-msgs button.primary{background:#0b65c2;color:#fff;border-color:#0b65c2}
      .ac-msgs .list{display:flex;flex-direction:column;gap:8px}
      .ac-msgs .row{display:grid;grid-template-columns:1.2fr .9fr .7fr .6fr .9fr auto;gap:8px;align-items:center;border:1px solid #eef2f6;border-radius:10px;padding:8px}
      .ac-msgs .muted{color:#6b7280;font-size:.85rem}
      .ac-msgs .title{font-weight:600}
      .ac-msgs .chip{font-size:.75rem;padding:2px 8px;border-radius:999px;border:1px solid #d1d5db;display:inline-block}
      .ac-msgs .chip.whatsapp{background:#e8f5e9}
      .ac-msgs .chip.email{background:#e3f2fd}
      .ac-msgs .chip.sms{background:#f3e8ff}
      .ac-msgs .chip.ig{background:#fde2e2}
      .ac-msgs .chip.call{background:#fff7ed}
      .ac-msgs details{border:1px solid #f1f5f9;border-radius:10px}
      .ac-msgs details[open]{box-shadow:0 0 0 1px #ffa245 inset;background:#fff7ed}
      .ac-msgs details > summary{list-style:none;cursor:pointer;padding:0}
      .ac-msgs details .row{border:0;padding:8px}
      .ac-msgs .row .actions{display:flex;gap:4px;justify-content:flex-end}
      .ac-msgs .row .actions button{padding:6px 8px}
      .ac-msgs .edit{padding:8px;border-top:1px dashed #e5e7eb;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px}
      .ac-msgs .edit .full{grid-column:1 / -1}
      @media (max-width:960px){
        .ac-msgs .form{grid-template-columns:1fr 1fr .8fr .7fr 1fr auto}
        .ac-msgs .row{grid-template-columns:1fr 1fr .8fr .7fr 1fr auto}
        .ac-msgs .edit{grid-template-columns:1fr 1fr}
      }
      @media (max-width:640px){
        .ac-msgs .form{grid-template-columns:1fr}
        .ac-msgs .row{grid-template-columns:1fr}
        .ac-msgs .row .actions{justify-content:flex-start}
        .ac-msgs .edit{grid-template-columns:1fr}
      }
    </style>

    <div class="form" aria-label="Nova mensagem">
      <div class="field"><label>Título / Assunto</label><input id="f_titulo" type="text" placeholder="Ex.: Lembrete de confirmação" /></div>
      <div class="field"><label>Canal</label>
        <select id="f_canal">
          <option>WhatsApp</option>
          <option>E-mail</option>
          <option>SMS</option>
          <option>Instagram</option>
          <option>Ligação</option>
        </select>
      </div>
      <div class="field"><label>Data</label><input id="f_data" type="date" /></div>
      <div class="field"><label>Hora</label><input id="f_hora" type="time" /></div>
      <div class="field"><label>Alvo</label>
        <select id="f_alvo">
          <option>Todos convidados</option>
          <option>Confirmados</option>
          <option>Pendentes</option>
          <option>Fornecedores</option>
          <option>Personalizado</option>
        </select>
      </div>
      <div class="field"><button id="btn_add" class="primary" type="button">Adicionar</button></div>
      <div class="field" style="grid-column:1/-1"><label>Anotações</label><textarea id="f_nota" placeholder="Ex.: usar modelo X, incluir link de RSVP..."></textarea></div>
      <div class="field" style="grid-column:1/-1;display:none" id="wrapDest">
        <label>Destinatários (quando Personalizado) — separe por vírgula</label>
        <input id="f_dest" type="text" placeholder="email@exemplo.com, +55 11 90000-0000, @perfil" />
      </div>
    </div>

    <div class="list" id="msg_list" aria-live="polite"></div>
  `;
  host.appendChild(wrap);

  // refs do form
  const fTitulo = $('#f_titulo', wrap);
  const fCanal  = $('#f_canal',  wrap);
  const fData   = $('#f_data',   wrap);
  const fHora   = $('#f_hora',   wrap);
  const fAlvo   = $('#f_alvo',   wrap);
  const fNota   = $('#f_nota',   wrap);
  const fDest   = $('#f_dest',   wrap);
  const wrapDest= $('#wrapDest', wrap);
  const listEl  = $('#msg_list', wrap);

  fData.value = today;

  fAlvo.addEventListener('change', ()=>{ wrapDest.style.display = (fAlvo.value === 'Personalizado') ? 'block' : 'none'; });
  $('#btn_add', wrap).addEventListener('click', onAdd);

  function onAdd(){
    const m = ensureMsgShape({
      id: uid(),
      titulo: (fTitulo.value||'').trim(),
      canal: fCanal.value,
      data: (fData.value||'').trim(),
      hora: (fHora.value||'').slice(0,5),
      alvo: fAlvo.value,
      destinatarios: (fAlvo.value==='Personalizado') ? (fDest.value||'') : '',
      status: 'agendado',
      nota: (fNota.value||'').trim()
    });
    if(!m.titulo && !m.data){ m.status='rascunho'; }
    mensagens.push(m);
    mensagens.sort(sortMensagens);
    renderList();
    scheduleSave();
    // limpar form
    fTitulo.value=''; fNota.value=''; fDest.value=''; fHora.value=''; fAlvo.value='Todos convidados'; wrapDest.style.display='none';
  }

  function renderList(){
    listEl.innerHTML = '';
    if(!mensagens.length){
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Nenhuma mensagem cadastrada ainda.';
      listEl.appendChild(empty);
      return;
    }
    mensagens.sort(sortMensagens).forEach(m=> listEl.appendChild(renderItem(m)));
  }

  function canalChipClass(c){
    c = (c||'').toLowerCase();
    if(c.includes('whats')) return 'whatsapp';
    if(c.includes('mail')) return 'email';
    if(c.includes('sms')) return 'sms';
    if(c.includes('insta')) return 'ig';
    if(c.includes('liga')) return 'call';
    return '';
  }

  function renderItem(m){
    ensureMsgShape(m);
    const det = document.createElement('details');
    det.className = 'msg';
    det.dataset.id = m.id;
    const when = fmtDateTime(m.data, m.hora) || '—';

    det.innerHTML = `
      <summary>
        <div class="row">
          <div class="title">${escapeHtml(m.titulo)||'—'}</div>
          <div><span class="chip ${canalChipClass(m.canal)}">${escapeHtml(m.canal||'—')}</span></div>
          <div class="muted">${when}</div>
          <div class="muted">${escapeHtml(m.alvo||'—')}</div>
          <div class="muted">${escapeHtml(m.status||'rascunho')}</div>
          <div class="actions">
            <button data-act="toggle">Editar</button>
            <button data-act="dup">Duplicar</button>
            <button data-act="del" class="danger">Excluir</button>
          </div>
        </div>
      </summary>
      <div class="edit">
        <div class="field"><label>Título</label><input data-bind="titulo" type="text" value="${escapeAttr(m.titulo)}" /></div>
        <div class="field"><label>Canal</label>
          <select data-bind="canal">
            ${['WhatsApp','E-mail','SMS','Instagram','Ligação'].map(v=>`<option${m.canal===v?' selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Data</label><input data-bind="data" type="date" value="${escapeAttr(m.data)}" /></div>
        <div class="field"><label>Hora</label><input data-bind="hora" type="time" value="${escapeAttr((m.hora||'').slice(0,5))}" /></div>
        <div class="field"><label>Status</label>
          <select data-bind="status">
            ${['rascunho','agendado','enviado','cancelado'].map(v=>`<option${m.status===v?' selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Alvo</label>
          <select data-bind="alvo">
            ${['Todos convidados','Confirmados','Pendentes','Fornecedores','Personalizado'].map(v=>`<option${m.alvo===v?' selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="field full" data-wrap-dest style="${m.alvo==='Personalizado'?'':'display:none'}">
          <label>Destinatários (quando Personalizado)</label>
          <input data-bind="destinatarios" type="text" value="${escapeAttr(m.destinatarios||'')}" />
        </div>
        <div class="field full"><label>Anotações</label><textarea data-bind="nota">${escapeHtml(m.nota||'')}</textarea></div>
      </div>
    `;

    det.addEventListener('click', (ev)=>{
      const b = ev.target.closest('button'); if(!b) return;
      const act = b.getAttribute('data-act');
      if(act==='toggle'){ ev.preventDefault(); det.open = !det.open; }
      if(act==='dup'){ ev.preventDefault(); duplicateMsg(m.id); }
      if(act==='del'){ ev.preventDefault(); deleteMsg(m.id); }
    });

    // data binding (autosave)
    det.querySelectorAll('[data-bind]').forEach(inp=>{
      inp.addEventListener('input', ()=>{
        const k = inp.getAttribute('data-bind');
        const v = (inp.tagName==='TEXTAREA'||inp.tagName==='INPUT') ? inp.value : inp.value;
        const idx = mensagens.findIndex(x=>x.id===m.id);
        if(idx>=0){ mensagens[idx][k] = (k==='hora') ? (v||'').slice(0,5) : v; }
        if(k==='alvo'){
          const wrap = det.querySelector('[data-wrap-dest]');
          if(wrap) wrap.style.display = (v==='Personalizado') ? 'block' : 'none';
        }
        // status automático se for rascunho/agendado e datas mudarem
        if(k==='data' || k==='hora'){
          const mm = mensagens[idx];
          if(mm && (mm.status==='rascunho' || mm.status==='agendado')){
            mm.status = inferStatus(mm);
          }
        }
        scheduleSave();
        // refresh cabeçalho do summary
        const head = det.querySelector('.row');
        if(head){
          head.querySelector('.title').textContent = mensagens[idx].titulo || '—';
          head.querySelector('.muted:nth-of-type(2)').textContent = fmtDateTime(mensagens[idx].data, mensagens[idx].hora) || '—';
          head.querySelector('.muted:nth-of-type(3)').textContent = mensagens[idx].alvo || '—';
          head.querySelector('.muted:nth-of-type(4)').textContent = mensagens[idx].status || 'rascunho';
          const chip = head.querySelector('.chip'); chip.textContent = mensagens[idx].canal || '—';
          chip.className = 'chip ' + canalChipClass(mensagens[idx].canal);
        }
      });
    });

    return det;
  }

  function duplicateMsg(id){
    const src = mensagens.find(x=>x.id===id); if(!src) return;
    const clone = ensureMsgShape(JSON.parse(JSON.stringify(src)));
    clone.id = uid();
    // empurrar ligeiramente a hora para evitar colisão visual
    if(clone.hora){
      const [H,M] = clone.hora.split(':').map(n=>parseInt(n||'0',10));
      const d = new Date(`${clone.data||today}T${clone.hora}:00`);
      d.setMinutes(d.getMinutes()+5);
      clone.data = d.toISOString().slice(0,10);
      clone.hora = d.toTimeString().slice(0,5);
    }
    mensagens.push(clone);
    mensagens.sort(sortMensagens);
    renderList();
    scheduleSave();
  }

  function deleteMsg(id){
    if(!confirm('Excluir esta mensagem?')) return;
    mensagens = mensagens.filter(x=>x.id!==id);
    renderList();
    scheduleSave();
  }

  // ===== Boot / integração =====
  async function loadProject(id){
    projectId = id || projectId;
    if(!projectId) return;
    try{
      project = await store.getProject?.(projectId);
      project = ensureShape(project||{});
      setMensagens(project.mensagens||[]);
    }catch(err){ console.error('[acMensagens] load error', err); }
  }

  // re-render ao abrir outro evento
  bus?.subscribe?.('ac:open-event', ({ id })=>{ if(id){ loadProject(id); } });
  // refresh quando qualquer outro módulo atualizar o projeto
  bus?.subscribe?.('ac:project-updated', async ({ id })=>{ if(id && id===projectId){ await loadProject(projectId); } });

  // carregar inicial
  loadProject(projectId);
}

// Utilidades simples de escape para não quebrar o HTML dos templates
function escapeHtml(str){
  return String(str||'').replace(/[&<>"']/g, s=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
}
function escapeAttr(str){ return escapeHtml(str).replace(/"/g,'&quot;'); }
