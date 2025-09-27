// tools/gestao-de-convidados/views/mensagens_agenda.mjs
// Catálogo fixo + gerador e lista de disparos (com estimativa de público)
const DEFAULT_TEMPLATES = [
  { id:'save_the_date', titulo:'Save the Date', categoria:'pré-evento',
    corpo:'Olá {{convidado.principal}}, reserve a data: {{evento.data}} — {{evento.titulo}} em {{evento.local}}.',
    variaveis:['evento.titulo','evento.data','evento.local','convidado.principal'],
    regraDataPadrao:{ tipo:'relativo_evento', offsetDias:-30, hora:'10:00' } },
  { id:'convite', titulo:'Convite', categoria:'convite',
    corpo:'{{convidado.principal}}, você está convidado para {{evento.titulo}} em {{evento.local}} dia {{evento.data}} às {{evento.hora}}.',
    variaveis:['evento.titulo','evento.data','evento.hora','evento.local','convidado.principal'],
    regraDataPadrao:{ tipo:'relativo_evento', offsetDias:-14, hora:'10:00' } },
  { id:'lembrete7', titulo:'Lembrete 7 dias', categoria:'lembrete',
    corpo:'Faltam 7 dias para {{evento.titulo}}. Confirme sua presença, {{convidado.principal}}.',
    variaveis:['evento.titulo','convidado.principal'],
    regraDataPadrao:{ tipo:'relativo_evento', offsetDias:-7, hora:'10:00' } },
  { id:'lembrete1', titulo:'Lembrete 1 dia', categoria:'lembrete',
    corpo:'É amanhã: {{evento.titulo}}! Nos vemos em {{evento.local}} às {{evento.hora}}.',
    variaveis:['evento.titulo','evento.local','evento.hora'],
    regraDataPadrao:{ tipo:'relativo_evento', offsetDias:-1, hora:'16:00' } },
  { id:'dia', titulo:'Dia do Evento', categoria:'lembrete',
    corpo:'Chegou o dia de {{evento.titulo}}. Boa festa!',
    variaveis:['evento.titulo'],
    regraDataPadrao:{ tipo:'relativo_evento', offsetDias:0, hora:'08:00' } },
  { id:'agradecimento', titulo:'Agradecimento', categoria:'pós-evento',
    corpo:'Obrigado por fazer parte de {{evento.titulo}}! Foi especial ter você com a gente.',
    variaveis:['evento.titulo'],
    regraDataPadrao:{ tipo:'relativo_evento', offsetDias:1, hora:'10:00' } },
];

export async function render(root, ctx){
  // Garante templates no projeto
  const project = await ctx.store.getProject(ctx.projectId);
  if (!project.mensagens || !project.mensagens.modelos || project.mensagens.modelos.length === 0){
    await ctx.store.updateProject(ctx.projectId, { mensagens: { modelos: DEFAULT_TEMPLATES } });
  }
  const p = await ctx.store.getProject(ctx.projectId);
  const modelos = p.mensagens.modelos;

  root.innerHTML = `
    <section class="ac-section-block">
      <h3>Mensagens & Agenda</h3>
      <div class="ac-grid-2">
        <div class="ac-card">
          <h4>Catálogo de modelos</h4>
          <div class="ac-modelos" id="ac-modelos"></div>
        </div>
        <div class="ac-card">
          <h4>Gerar agenda</h4>
          <label>Modelo
            <select id="modelo">${modelos.map(m=>`<option value="${m.id}">${m.titulo}</option>`).join('')}</select>
          </label>
          <label>Data/hora base do evento <input id="base-data" type="date" value="${p.evento?.data||''}"/> <input id="base-hora" type="time" value="${p.evento?.hora||''}"/></label>
          <label>Público
            <select id="publico">
              <option value="todos">Todos</option>
              <option value="somenteComTelefone">Somente com telefone</option>
              <option value="semTelefone">Sem telefone</option>
              <option value="pendente">Pendentes de RSVP</option>
              <option value="confirmado">Confirmados</option>
              <option value="ausente">Ausentes</option>
            </select>
          </label>
          <div class="ac-actions"><button id="btn-add">Adicionar à agenda</button></div>
        </div>
      </div>

      <div class="ac-table-wrap">
        <table class="ac-table">
          <thead><tr><th>Data/Hora</th><th>Modelo</th><th>Público</th><th>Estimado</th><th>Enviados</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody id="tbody-agenda"></tbody>
        </table>
      </div>
    </section>
  `;

  // Render catálogo
  const cat = root.querySelector('#ac-modelos');
  cat.innerHTML = modelos.map(m=>`<article class="ac-modelo">
    <h5>${m.titulo}</h5>
    <small>${m.categoria}</small>
    <p class="ac-pre">${m.corpo}</p>
  </article>`).join('');

  // Render agenda existente
  const tbody = root.querySelector('#tbody-agenda');
  (p.agenda||[]).forEach(d => tbody.appendChild(rowAgenda(d, modelos)));

  root.querySelector('#btn-add').addEventListener('click', async ()=>{
    const modeloId = root.querySelector('#modelo').value;
    const modelo = modelos.find(m=>m.id===modeloId);
    const baseData = root.querySelector('#base-data').value;
    const baseHora = root.querySelector('#base-hora').value || '10:00';
    if(!baseData){ alert('Defina a data do evento na tela Evento.'); return; }
    const dtBase = new Date(`${baseData}T${baseHora}:00`);
    const when = applyRule(dtBase, modelo.regraDataPadrao);
    const publico = root.querySelector('#publico').value;
    const estimado = estimatePublic(p.lista||[], publico);

    const entry = {
      id: crypto.randomUUID(),
      dataHoraISO: when.toISOString(),
      modeloId,
      publico: { tipo: publico },
      escopo: { tipo: 'em_lote', convidadoId: null },
      preview: { exemploTexto: renderTemplate(modelo.corpo, sampleGuest(p.lista), p.evento) },
      metricas: { estimado, enviados: 0 },
      status: 'planejado',
      observacao: ''
    };
    const agenda = [...(p.agenda||[]), entry];
    await ctx.store.updateProject(ctx.projectId, { agenda });
    tbody.appendChild(rowAgenda(entry, modelos));
  });

  tbody.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const tr = btn.closest('tr');
    const id = tr.dataset.id;
    const proj = await ctx.store.getProject(ctx.projectId);
    const idx = (proj.agenda||[]).findIndex(x=>x.id===id);
    if (idx<0) return;
    const item = proj.agenda[idx];

    if (btn.dataset.action==='enviado'){
      item.metricas.enviados = item.metricas.estimado;
      item.status = 'enviado_manual';
      proj.agenda[idx] = item;
      await ctx.store.updateProject(ctx.projectId, { agenda: proj.agenda });
      tr.replaceWith(rowAgenda(item, proj.mensagens.modelos));
    }
    if (btn.dataset.action==='excluir'){
      if(!confirm('Excluir esta linha da agenda?')) return;
      proj.agenda.splice(idx,1);
      await ctx.store.updateProject(ctx.projectId, { agenda: proj.agenda });
      tr.remove();
    }
  });
}

function rowAgenda(d, modelos){
  const tr = document.createElement('tr');
  tr.dataset.id = d.id;
  const m = modelos.find(mm=>mm.id===d.modeloId);
  tr.innerHTML = `
    <td>${new Date(d.dataHoraISO).toLocaleString()}</td>
    <td>${m?m.titulo:d.modeloId}</td>
    <td>${d.publico?.tipo}</td>
    <td>${d.metricas?.estimado??0}</td>
    <td>${d.metricas?.enviados??0}</td>
    <td>${d.status}</td>
    <td class="ac-actions-col">
      <button data-action="enviado">Marcar enviados</button>
      <button data-action="excluir" class="ac-danger">Excluir</button>
    </td>
  `;
  return tr;
}

function estimatePublic(lista, tipo){
  const hasPhone = g => !!(g.telefone || g.telefoneFormatado);
  if (tipo==='todos') return lista.length;
  if (tipo==='somenteComTelefone') return lista.filter(hasPhone).length;
  if (tipo==='semTelefone') return lista.filter(g=>!hasPhone(g)).length;
  if (tipo==='pendente') return lista.filter(g=>g.rsvp?.status==='pendente').length;
  if (tipo==='confirmado') return lista.filter(g=>['confirmado_total','confirmado_parcial'].includes(g.rsvp?.status)).length;
  if (tipo==='ausente') return lista.filter(g=>g.rsvp?.status==='ausente').length;
  return 0;
}

function applyRule(base, regra){
  const d = new Date(base);
  if (regra?.tipo === 'relativo_evento'){
    d.setDate(d.getDate() + (regra.offsetDias||0));
    const [h,m] = (regra.hora||'10:00').split(':');
    d.setHours(parseInt(h,10), parseInt(m,10), 0, 0);
  }
  return d;
}

function sampleGuest(lista){
  return lista && lista.length ? lista[0] : { principal:'Convidado', telefoneFormatado:'' };
}

function renderTemplate(tpl, convidado, evento){
  return tpl.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_, k) => {
    const [root, prop] = k.split('.');
    if (root==='convidado') return convidado?.[prop] ?? '';
    if (root==='evento') return evento?.[prop] ?? '';
    return '';
  });
}

export function destroy(){} 
