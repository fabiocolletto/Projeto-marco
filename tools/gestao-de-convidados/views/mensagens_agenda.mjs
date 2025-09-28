// tools/gestao-de-convidados/views/mensagens_agenda.mjs
// Catálogo fixo + gerador e gerenciamento da agenda de disparos

const DEFAULT_TEMPLATES = [
  {
    id: 'save_the_date',
    titulo: 'Save the Date',
    categoria: 'pré-evento',
    corpo: 'Olá {{convidado.principal}}, reserve a data: {{evento.data}} — {{evento.titulo}} em {{evento.local}}.',
    variaveis: ['evento.titulo', 'evento.data', 'evento.local', 'convidado.principal'],
    regraDataPadrao: { tipo: 'relativo_evento', offsetDias: -30, hora: '10:00' },
  },
  {
    id: 'convite',
    titulo: 'Convite',
    categoria: 'convite',
    corpo: '{{convidado.principal}}, você está convidado para {{evento.titulo}} em {{evento.local}} dia {{evento.data}} às {{evento.hora}}.',
    variaveis: ['evento.titulo', 'evento.data', 'evento.hora', 'evento.local', 'convidado.principal'],
    regraDataPadrao: { tipo: 'relativo_evento', offsetDias: -14, hora: '10:00' },
  },
  {
    id: 'lembrete7',
    titulo: 'Lembrete 7 dias',
    categoria: 'lembrete',
    corpo: 'Faltam 7 dias para {{evento.titulo}}. Confirme sua presença, {{convidado.principal}}.',
    variaveis: ['evento.titulo', 'convidado.principal'],
    regraDataPadrao: { tipo: 'relativo_evento', offsetDias: -7, hora: '10:00' },
  },
  {
    id: 'lembrete1',
    titulo: 'Lembrete 1 dia',
    categoria: 'lembrete',
    corpo: 'É amanhã: {{evento.titulo}}! Nos vemos em {{evento.local}} às {{evento.hora}}.',
    variaveis: ['evento.titulo', 'evento.local', 'evento.hora'],
    regraDataPadrao: { tipo: 'relativo_evento', offsetDias: -1, hora: '16:00' },
  },
  {
    id: 'dia',
    titulo: 'Dia do Evento',
    categoria: 'lembrete',
    corpo: 'Chegou o dia de {{evento.titulo}}. Boa festa!',
    variaveis: ['evento.titulo'],
    regraDataPadrao: { tipo: 'relativo_evento', offsetDias: 0, hora: '08:00' },
  },
  {
    id: 'agradecimento',
    titulo: 'Agradecimento',
    categoria: 'pós-evento',
    corpo: 'Obrigado por fazer parte de {{evento.titulo}}! Foi especial ter você com a gente.',
    variaveis: ['evento.titulo'],
    regraDataPadrao: { tipo: 'relativo_evento', offsetDias: 1, hora: '10:00' },
  },
];

let agendaState = [];
let modelosState = [];

export async function render(root, ctx) {
  const project = await ctx.store.getProject(ctx.projectId);
  if (!project.mensagens || !Array.isArray(project.mensagens.modelos) || !project.mensagens.modelos.length) {
    await ctx.store.updateProject(ctx.projectId, { mensagens: { modelos: DEFAULT_TEMPLATES } });
  }
  const refreshed = await ctx.store.getProject(ctx.projectId);
  modelosState = refreshed.mensagens.modelos;
  agendaState = Array.isArray(refreshed.agenda) ? refreshed.agenda : [];

  root.innerHTML = template(modelosState, refreshed.evento);
  renderAgenda(root, modelosState);
  bindGenerator(root, ctx, refreshed);
  bindAgendaActions(root, ctx);
}

function template(modelos, evento) {
  const options = modelos.map((modelo) => `<option value="${modelo.id}">${modelo.titulo}</option>`).join('');
  return `
    <section class="ac-section-block">
      <h3>Mensagens & Agenda</h3>
      <div class="ac-grid-2">
        <div class="ac-card">
          <h4>Catálogo fixo</h4>
          <div class="ac-modelos" id="ac-modelos">
            ${modelos
              .map(
                (modelo) => `
                  <article class="ac-modelo">
                    <header>
                      <h5>${modelo.titulo}</h5>
                      <small>${modelo.categoria}</small>
                    </header>
                    <p class="ac-pre">${modelo.corpo}</p>
                    <footer><small>Variáveis: ${modelo.variaveis.join(', ')}</small></footer>
                  </article>
                `,
              )
              .join('')}
          </div>
        </div>
        <div class="ac-card">
          <h4>Planejar disparo</h4>
          <form id="agenda-form" class="ac-form">
            <label>Modelo
              <select id="agenda-modelo">${options}</select>
            </label>
            <label>Data do evento
              <input id="agenda-data" type="date" value="${evento?.data || ''}" />
            </label>
            <label>Hora do evento
              <input id="agenda-hora" type="time" value="${evento?.hora || ''}" />
            </label>
            <label>Público alvo
              <select id="agenda-publico">
                <option value="todos">Todos</option>
                <option value="somenteComTelefone">Somente com telefone</option>
                <option value="semTelefone">Sem telefone</option>
                <option value="pendente">Pendentes</option>
                <option value="confirmado">Confirmados</option>
                <option value="ausente">Ausentes</option>
              </select>
            </label>
            <div class="ac-actions">
              <button type="submit" class="ac-primary">Adicionar à agenda</button>
            </div>
          </form>
        </div>
      </div>

      <div class="ac-table-wrap">
        <table class="ac-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Modelo</th>
              <th>Público</th>
              <th>Estimado</th>
              <th>Enviados</th>
              <th>Status</th>
              <th>Observação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="tbody-agenda"></tbody>
        </table>
      </div>
    </section>
    <div id="drawer-agenda" class="ac-drawer" hidden></div>
  `;
}

function bindGenerator(root, ctx, project) {
  const form = root.querySelector('#agenda-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const modeloId = root.querySelector('#agenda-modelo').value;
    const modelo = modelosState.find((item) => item.id === modeloId);
    if (!modelo) return;
    const dataEvento = root.querySelector('#agenda-data').value;
    if (!dataEvento) {
      alert('Informe a data do evento na aba Evento.');
      return;
    }
    const horaEvento = root.querySelector('#agenda-hora').value || '10:00';
    const base = new Date(`${dataEvento}T${horaEvento}:00`);
    const envio = applyRule(base, modelo.regraDataPadrao);
    const publico = root.querySelector('#agenda-publico').value;
    const estimado = estimatePublic(project.lista || [], publico);
    const preview = renderTemplate(modelo.corpo, sampleGuest(project.lista), project.evento);
    const novo = {
      id: crypto.randomUUID(),
      dataHoraISO: envio.toISOString(),
      modeloId,
      publico: { tipo: publico },
      escopo: { tipo: 'em_lote', convidadoId: null },
      preview: { exemploTexto: preview },
      metricas: { estimado, enviados: 0 },
      status: 'planejado',
      observacao: '',
    };
    ctx.markDirty?.();
    agendaState = [...agendaState, novo];
    await persistAgenda(ctx, agendaState, root);
    ctx.setStatus?.('Disparo adicionado à agenda', 'saved');
  });
}

function renderAgenda(root, modelos) {
  const tbody = root.querySelector('#tbody-agenda');
  tbody.innerHTML = agendaState.length
    ? agendaState
        .map((item, index) => renderRow(item, modelos, index))
        .join('')
    : '<tr><td colspan="8">Nenhum disparo planejado.</td></tr>';
}

function renderRow(item, modelos, index) {
  const modelo = modelos.find((m) => m.id === item.modeloId);
  const titulo = modelo ? modelo.titulo : item.modeloId;
  const data = new Date(item.dataHoraISO).toLocaleString();
  return `
    <tr data-id="${item.id}" data-index="${index}">
      <td>${data}</td>
      <td>${titulo}</td>
      <td>${item.publico?.tipo || '-'}</td>
      <td>${item.metricas?.estimado ?? 0}</td>
      <td>${item.metricas?.enviados ?? 0}</td>
      <td>${labelStatus(item.status)}</td>
      <td>${item.observacao || '-'}</td>
      <td class="ac-actions-col">
        <button data-action="editar" data-id="${item.id}" class="ac-primary">Editar</button>
        <button data-action="duplicar" data-id="${item.id}">Duplicar</button>
        <button data-action="up" data-id="${item.id}" aria-label="Mover para cima">↑</button>
        <button data-action="down" data-id="${item.id}" aria-label="Mover para baixo">↓</button>
        <button data-action="enviado" data-id="${item.id}">Marcar enviados</button>
        <button data-action="excluir" data-id="${item.id}" class="ac-danger">Excluir</button>
      </td>
    </tr>
  `;
}

function bindAgendaActions(root, ctx) {
  const tbody = root.querySelector('#tbody-agenda');
  tbody.addEventListener('click', async (event) => {
    const actionBtn = event.target.closest('button[data-action]');
    if (!actionBtn) return;
    const id = actionBtn.dataset.id;
    const item = agendaState.find((entry) => entry.id === id);
    if (!item) return;

    switch (actionBtn.dataset.action) {
      case 'editar': {
        openAgendaDrawer(root.querySelector('#drawer-agenda'), item, ctx, root);
        break;
      }
      case 'duplicar': {
        const copy = { ...item, id: crypto.randomUUID(), status: 'planejado', metricas: { ...item.metricas, enviados: 0 } };
        ctx.markDirty?.();
        agendaState = [...agendaState, copy];
        await persistAgenda(ctx, agendaState, root);
        break;
      }
      case 'up': {
        ctx.markDirty?.();
        agendaState = moveItem(agendaState, id, -1);
        await persistAgenda(ctx, agendaState, root, { silentStatus: true });
        break;
      }
      case 'down': {
        ctx.markDirty?.();
        agendaState = moveItem(agendaState, id, 1);
        await persistAgenda(ctx, agendaState, root, { silentStatus: true });
        break;
      }
      case 'enviado': {
        ctx.markDirty?.();
        item.metricas.enviados = item.metricas.estimado;
        item.status = 'enviado_manual';
        agendaState = agendaState.map((entry) => (entry.id === id ? { ...item } : entry));
        await persistAgenda(ctx, agendaState, root);
        break;
      }
      case 'excluir': {
        if (!confirm('Excluir este disparo da agenda?')) return;
        ctx.markDirty?.();
        agendaState = agendaState.filter((entry) => entry.id !== id);
        await persistAgenda(ctx, agendaState, root);
        break;
      }
      default:
        break;
    }
  });
}

async function persistAgenda(ctx, agenda, root, options = {}) {
  agendaState = agenda.map((entry) => ({ ...entry }));
  await ctx.store.updateProject(ctx.projectId, { agenda: agendaState });
  renderAgenda(root, modelosState);
  if (!options.silentStatus) {
    ctx.setStatus?.('Agenda atualizada', 'saved');
  }
}

function openAgendaDrawer(host, item, ctx, root) {
  host.hidden = false;
  host.innerHTML = drawerTemplate(item);

  const close = () => {
    host.hidden = true;
    host.innerHTML = '';
  };
  host.querySelector('#drawer-close').addEventListener('click', close);
  host.querySelector('.ac-drawer__overlay').addEventListener('click', close);
  host.querySelector('#drawer-cancel').addEventListener('click', close);

  host.querySelector('#agenda-drawer-delete').addEventListener('click', async () => {
    if (!confirm('Excluir disparo?')) return;
    ctx.markDirty?.();
    agendaState = agendaState.filter((entry) => entry.id !== item.id);
    await persistAgenda(ctx, agendaState, root);
    close();
  });

  host.querySelector('#agenda-drawer-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const dataHora = new Date(`${data.get('data')}T${data.get('hora') || '10:00'}:00`);
    if (Number.isNaN(dataHora.getTime())) {
      alert('Data ou hora inválida.');
      return;
    }
    const updated = {
      ...item,
      dataHoraISO: dataHora.toISOString(),
      publico: { tipo: data.get('publico') },
      metricas: {
        estimado: parseInt(data.get('estimado'), 10) || 0,
        enviados: parseInt(data.get('enviados'), 10) || 0,
      },
      status: data.get('status'),
      observacao: (data.get('observacao') || '').toString().trim(),
    };
    ctx.markDirty?.();
    agendaState = agendaState.map((entry) => (entry.id === item.id ? updated : entry));
    await persistAgenda(ctx, agendaState, root);
    close();
  });

  host.querySelector('#agenda-drawer-form').addEventListener('input', () => ctx.markDirty?.());
}

function drawerTemplate(item) {
  const date = item.dataHoraISO ? new Date(item.dataHoraISO) : new Date();
  const data = date.toISOString().slice(0, 10);
  const hora = date.toISOString().slice(11, 16);
  return `
    <div class="ac-drawer__overlay"></div>
    <div class="ac-drawer__panel">
      <header class="ac-drawer__header">
        <h4>Editar disparo</h4>
        <button id="drawer-close" aria-label="Fechar">×</button>
      </header>
      <form id="agenda-drawer-form" class="ac-drawer__content">
        <div class="ac-form-grid">
          <label>Data
            <input type="date" name="data" value="${data}" required />
          </label>
          <label>Hora
            <input type="time" name="hora" value="${hora}" required />
          </label>
          <label>Público
            <select name="publico" required>
              ${['todos', 'somenteComTelefone', 'semTelefone', 'pendente', 'confirmado', 'ausente']
                .map((tipo) => `<option value="${tipo}" ${item.publico?.tipo === tipo ? 'selected' : ''}>${tipo}</option>`)
                .join('')}
            </select>
          </label>
          <label>Estimado
            <input type="number" min="0" name="estimado" value="${item.metricas?.estimado ?? 0}" />
          </label>
          <label>Enviados
            <input type="number" min="0" name="enviados" value="${item.metricas?.enviados ?? 0}" />
          </label>
          <label>Status
            <select name="status">
              ${['planejado', 'enviado_manual', 'expirado', 'cancelado']
                .map((status) => `<option value="${status}" ${item.status === status ? 'selected' : ''}>${labelStatus(status)}</option>`)
                .join('')}
            </select>
          </label>
        </div>
        <label>Observação
          <textarea name="observacao" rows="3">${item.observacao || ''}</textarea>
        </label>
        <footer class="ac-drawer__footer">
          <div class="ac-drawer__footer-left">
            <button type="button" id="agenda-drawer-delete" class="ac-danger">Excluir</button>
          </div>
          <div class="ac-drawer__footer-right">
            <button type="submit" class="ac-primary">Salvar</button>
            <button type="button" id="drawer-cancel">Cancelar</button>
          </div>
        </footer>
      </form>
    </div>
  `;
}

function applyRule(base, regra) {
  const date = new Date(base);
  if (regra?.tipo === 'relativo_evento') {
    date.setDate(date.getDate() + (regra.offsetDias || 0));
    const [h, m] = (regra.hora || '10:00').split(':');
    date.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  }
  return date;
}

function estimatePublic(lista, tipo) {
  const hasTelefone = (guest) => Boolean(guest.telefone || guest.telefoneFormatado);
  if (tipo === 'todos') return lista.length;
  if (tipo === 'somenteComTelefone') return lista.filter(hasTelefone).length;
  if (tipo === 'semTelefone') return lista.filter((guest) => !hasTelefone(guest)).length;
  if (tipo === 'pendente') return lista.filter((guest) => (guest.rsvp?.status || 'pendente') === 'pendente').length;
  if (tipo === 'confirmado') return lista.filter((guest) => ['confirmado_total', 'confirmado_parcial'].includes(guest.rsvp?.status)).length;
  if (tipo === 'ausente') return lista.filter((guest) => guest.rsvp?.status === 'ausente').length;
  return 0;
}

function sampleGuest(lista) {
  return lista && lista.length
    ? lista[0]
    : { principal: 'Convidado', telefoneFormatado: '' };
}

function renderTemplate(modelo, convidado, evento) {
  return modelo.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (_, key) => {
    const [root, prop] = key.split('.');
    if (root === 'evento') return evento?.[prop] ?? '';
    if (root === 'convidado') return convidado?.[prop] ?? '';
    return '';
  });
}

function moveItem(lista, id, delta) {
  const index = lista.findIndex((entry) => entry.id === id);
  if (index < 0) return lista;
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= lista.length) return lista;
  const clone = lista.slice();
  const [item] = clone.splice(index, 1);
  clone.splice(nextIndex, 0, item);
  return clone;
}

function labelStatus(status) {
  switch (status) {
    case 'enviado_manual':
      return 'Enviado manualmente';
    case 'expirado':
      return 'Expirado';
    case 'cancelado':
      return 'Cancelado';
    default:
      return 'Planejado';
  }
}

export function destroy() {
  agendaState = [];
  modelosState = [];
}
