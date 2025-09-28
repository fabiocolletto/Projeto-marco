// tools/gestao-de-convidados/views/convites.mjs
// Editor de convites + RSVP inline com drawer "Editar"

import { higienizarLinha, higienizarLista } from '/shared/higienizarLista.mjs';

let state = {
  lista: [],
  filtros: {
    rsvp: 'todos',
    telefone: 'todos',
    envio: 'todos',
  },
};

export async function render(root, ctx) {
  const project = await ctx.store.getProject(ctx.projectId);
  state = {
    lista: Array.isArray(project.lista) ? project.lista : [],
    filtros: { rsvp: 'todos', telefone: 'todos', envio: 'todos' },
  };

  root.innerHTML = template();
  renderRows(root);
  bindPasteForm(root, ctx);
  bindSingleForm(root, ctx);
  bindFilters(root);
  bindTableActions(root, ctx);
}

function template() {
  return `
    <section class="ac-section-block">
      <h3>Convites</h3>
      <div class="ac-grid-2">
        <div class="ac-card">
          <h4>Adicionar vários</h4>
          <p class="ac-muted">Cole ou digite uma linha por convite. Use <code>Nome | Telefone</code>.</p>
          <textarea id="ac-paste" rows="6" placeholder="Nome do convidado e acompanhantes | telefone"></textarea>
          <div class="ac-actions">
            <button id="ac-import" class="ac-primary">Higienizar & adicionar</button>
          </div>
        </div>
        <div class="ac-card">
          <h4>Adicionar um convite</h4>
          <label>Nome(s)
            <input id="single-nome" placeholder="Ana e João" />
          </label>
          <label>Telefone
            <input id="single-tel" placeholder="(41) 99999-0000" />
          </label>
          <div class="ac-actions">
            <button id="single-add">Adicionar convite</button>
          </div>
        </div>
      </div>

      <div class="ac-toolbar">
        <label>Status RSVP
          <select id="filter-rsvp">
            <option value="todos">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="confirmado">Confirmados</option>
            <option value="parcial">Parciais</option>
            <option value="ausente">Ausentes</option>
          </select>
        </label>
        <label>Telefone
          <select id="filter-telefone">
            <option value="todos">Todos</option>
            <option value="com">Com telefone</option>
            <option value="sem">Sem telefone</option>
          </select>
        </label>
        <label>Envio
          <select id="filter-envio">
            <option value="todos">Todos</option>
            <option value="enviado">Enviados</option>
            <option value="nao">Não enviados</option>
          </select>
        </label>
      </div>

      <div class="ac-table-wrap">
        <table class="ac-table">
          <thead>
            <tr>
              <th>Convidado</th>
              <th>Telefone</th>
              <th>Total</th>
              <th>Enviado?</th>
              <th>Enviado em</th>
              <th>RSVP</th>
              <th>Confirmados</th>
              <th>Nomes confirmados</th>
              <th>Observação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="ac-rows"></tbody>
        </table>
      </div>
    </section>
    <div id="drawer" class="ac-drawer" hidden></div>
  `;
}

function bindPasteForm(root, ctx) {
  const button = root.querySelector('#ac-import');
  button.addEventListener('click', async () => {
    const text = root.querySelector('#ac-paste').value.trim();
    if (!text) return;
    try {
      ctx.markDirty?.();
      const res = higienizarLista(text);
      await persistList(ctx, root, [...state.lista, ...decorateGuests(res.convidados)]);
      root.querySelector('#ac-paste').value = '';
      ctx.setStatus?.('Convites adicionados', 'saved');
    } catch (error) {
      console.error(error);
      alert('Não foi possível higienizar a lista. Verifique o conteúdo.');
    }
  });
}

function bindSingleForm(root, ctx) {
  root.querySelector('#single-add').addEventListener('click', async () => {
    const nome = root.querySelector('#single-nome').value.trim();
    const tel = root.querySelector('#single-tel').value.trim();
    if (!nome && !tel) return;
    ctx.markDirty?.();
    const convidado = higienizarLinha(`${nome} | ${tel}`);
    await persistList(ctx, root, [...state.lista, ...decorateGuests([convidado])]);
    root.querySelector('#single-nome').value = '';
    root.querySelector('#single-tel').value = '';
    ctx.setStatus?.('Convite adicionado', 'saved');
  });
}

function bindFilters(root) {
  root.querySelector('#filter-rsvp').addEventListener('change', (event) => {
    state.filtros.rsvp = event.target.value;
    renderRows(root);
  });
  root.querySelector('#filter-telefone').addEventListener('change', (event) => {
    state.filtros.telefone = event.target.value;
    renderRows(root);
  });
  root.querySelector('#filter-envio').addEventListener('change', (event) => {
    state.filtros.envio = event.target.value;
    renderRows(root);
  });
}

function bindTableActions(root, ctx) {
  const tbody = root.querySelector('#ac-rows');
  tbody.addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const convidado = state.lista.find((item) => item.id === id);
    if (!convidado) return;

    if (btn.dataset.action === 'editar') {
      openDrawer(root.querySelector('#drawer'), convidado, ctx, root);
      return;
    }

    if (btn.dataset.action === 'enviar') {
      ctx.markDirty?.();
      convidado.envio.enviado = true;
      convidado.envio.enviadoEm = Date.now();
      await persistList(ctx, root, updateListItem(convidado));
      return;
    }

    if (btn.dataset.action === 'confirmar-todos') {
      ctx.markDirty?.();
      convidado.rsvp.status = 'confirmado_total';
      convidado.rsvp.confirmadosN = convidado.totalConvite;
      convidado.rsvp.confirmadosNomes = [convidado.principal, ...(convidado.acompanhantesNomes || [])].filter(Boolean);
      convidado.rsvp.atualizadoEm = Date.now();
      await persistList(ctx, root, updateListItem(convidado));
      return;
    }

    if (btn.dataset.action === 'ausente') {
      ctx.markDirty?.();
      convidado.rsvp.status = 'ausente';
      convidado.rsvp.confirmadosN = 0;
      convidado.rsvp.confirmadosNomes = [];
      convidado.rsvp.atualizadoEm = Date.now();
      await persistList(ctx, root, updateListItem(convidado));
      return;
    }

    if (btn.dataset.action === 'confirmar-parcial') {
      const total = Number(prompt('Quantas pessoas confirmaram?', convidado.rsvp.confirmadosN || 1));
      if (Number.isNaN(total)) return;
      ctx.markDirty?.();
      convidado.rsvp.confirmadosN = Math.min(Math.max(total, 0), convidado.totalConvite);
      convidado.rsvp.status = convidado.rsvp.confirmadosN === 0
        ? 'ausente'
        : convidado.rsvp.confirmadosN === convidado.totalConvite
          ? 'confirmado_total'
          : 'confirmado_parcial';
      convidado.rsvp.atualizadoEm = Date.now();
      await persistList(ctx, root, updateListItem(convidado));
      return;
    }

    if (btn.dataset.action === 'excluir') {
      if (!confirm('Excluir este convite?')) return;
      ctx.markDirty?.();
      await persistList(ctx, root, state.lista.filter((item) => item.id !== id));
      return;
    }
  });
}

function renderRows(root) {
  const tbody = root.querySelector('#ac-rows');
  if (!tbody) return;
  const rows = applyFilters(state.lista, state.filtros).map(renderRow).join('');
  tbody.innerHTML = rows || '<tr><td colspan="10">Nenhum convite cadastrado.</td></tr>';
}

function renderRow(guest) {
  const enviado = guest.envio?.enviado;
  const enviadoEm = guest.envio?.enviadoEm ? new Date(guest.envio.enviadoEm).toLocaleString() : '-';
  const status = guest.rsvp?.status || 'pendente';
  const confirmados = `${guest.rsvp?.confirmadosN ?? 0}/${guest.totalConvite}`;
  const nomesConfirmados = guest.rsvp?.confirmadosNomes?.join(', ') || '-';
  const telefone = guest.telefoneFormatado || guest.telefone || '-';
  return `
    <tr>
      <td>${guest.nome}</td>
      <td>${telefone}</td>
      <td>${guest.totalConvite}</td>
      <td>${enviado ? 'Sim' : 'Não'}</td>
      <td>${enviadoEm}</td>
      <td><span class="ac-badge ac-badge--${status}">${labelStatus(status)}</span></td>
      <td>${confirmados}</td>
      <td>${nomesConfirmados}</td>
      <td>${guest.rsvp?.observacao || '-'}</td>
      <td class="ac-actions-col">
        <button data-action="editar" data-id="${guest.id}" class="ac-primary">Editar</button>
        <button data-action="confirmar-todos" data-id="${guest.id}">Confirmar todos</button>
        <button data-action="confirmar-parcial" data-id="${guest.id}">Confirmar parcial</button>
        <button data-action="ausente" data-id="${guest.id}">Ausente</button>
        <button data-action="enviar" data-id="${guest.id}">Marcar enviado</button>
        <button data-action="excluir" data-id="${guest.id}" class="ac-danger">Excluir</button>
      </td>
    </tr>
  `;
}

function labelStatus(status) {
  switch (status) {
    case 'confirmado_total':
      return 'Confirmado';
    case 'confirmado_parcial':
      return 'Confirmado parcial';
    case 'ausente':
      return 'Ausente';
    default:
      return 'Pendente';
  }
}

function applyFilters(lista, filtros) {
  return lista.filter((guest) => {
    if (filtros.rsvp === 'pendente' && (guest.rsvp?.status || 'pendente') !== 'pendente') return false;
    if (filtros.rsvp === 'confirmado' && guest.rsvp?.status !== 'confirmado_total') return false;
    if (filtros.rsvp === 'parcial' && guest.rsvp?.status !== 'confirmado_parcial') return false;
    if (filtros.rsvp === 'ausente' && guest.rsvp?.status !== 'ausente') return false;

    if (filtros.telefone === 'com' && !(guest.telefone || guest.telefoneFormatado)) return false;
    if (filtros.telefone === 'sem' && (guest.telefone || guest.telefoneFormatado)) return false;

    if (filtros.envio === 'enviado' && !guest.envio?.enviado) return false;
    if (filtros.envio === 'nao' && guest.envio?.enviado) return false;

    return true;
  });
}

async function persistList(ctx, root, lista) {
  state.lista = lista.map((guest) => ({ ...guest }));
  await ctx.store.updateProject(ctx.projectId, { lista: state.lista });
  renderRows(root);
}

function decorateGuests(guests) {
  const now = Date.now();
  return guests.map((guest) => ({
    id: crypto.randomUUID(),
    envio: { enviado: false, enviadoEm: null, modeloId: null },
    rsvp: { status: 'pendente', confirmadosN: 0, confirmadosNomes: [], observacao: '', atualizadoEm: now },
    ...guest,
  }));
}

function updateListItem(updated) {
  return state.lista.map((guest) => (guest.id === updated.id ? { ...updated } : guest));
}

function openDrawer(host, convidado, ctx, root) {
  host.hidden = false;
  const listaAcompanhantes = convidado.acompanhantesNomes?.join('\n') || '';
  host.innerHTML = drawerTemplate(convidado, listaAcompanhantes);

  const close = () => {
    host.hidden = true;
    host.innerHTML = '';
  };
  host.querySelector('#drawer-close').addEventListener('click', close);
  host.querySelector('.ac-drawer__overlay').addEventListener('click', close);
  host.querySelector('#drawer-cancel').addEventListener('click', close);

  host.querySelector('#drawer-duplicate').addEventListener('click', async () => {
    const copy = { ...convidado, id: crypto.randomUUID(), envio: { enviado: false, enviadoEm: null, modeloId: null } };
    ctx.markDirty?.();
    await persistList(ctx, root, [...state.lista, copy]);
    close();
  });

  host.querySelector('#drawer-delete').addEventListener('click', async () => {
    if (!confirm('Excluir este convite?')) return;
    ctx.markDirty?.();
    await persistList(ctx, root, state.lista.filter((guest) => guest.id !== convidado.id));
    close();
  });

  host.querySelector('#drawer-reapply').addEventListener('click', () => {
    const nome = host.querySelector('#f-nome').value.trim();
    const acompan = host.querySelector('#f-acompanhantes').value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    const tel = host.querySelector('#f-tel').value.trim();
    const raw = [nome, ...acompan].join(' e ');
    const sanitized = higienizarLinha(`${raw} | ${tel}`);
    host.querySelector('#f-nome').value = sanitized.nome || nome;
    host.querySelector('#f-acompanhantes').value = sanitized.acompanhantesNomes?.join('\n') || acompan.join('\n');
    host.querySelector('#f-total').value = sanitized.totalConvite || convidado.totalConvite;
    host.querySelector('#f-tel').value = sanitized.telefoneFormatado || sanitized.telefone || tel;
    renderWarnings(host, sanitized);
  });

  host.querySelector('#drawer-form').addEventListener('input', () => {
    ctx.markDirty?.();
    const nome = host.querySelector('#f-nome').value;
    const acompan = host.querySelector('#f-acompanhantes').value;
    const tel = host.querySelector('#f-tel').value;
    const sanitized = higienizarLinha(`${nome} | ${acompan.replace(/\n/g, ' e ')} | ${tel}`);
    renderWarnings(host, sanitized);
  });

  const initialSanitized = higienizarLinha(`${convidado.nome} | ${listaAcompanhantes.replace(/\n/g, ' e ')} | ${convidado.telefone || convidado.telefoneFormatado || ''}`);
  renderWarnings(host, initialSanitized);

  host.querySelector('#drawer-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const nome = host.querySelector('#f-nome').value.trim();
    const acompan = host
      .querySelector('#f-acompanhantes')
      .value.split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    const tel = host.querySelector('#f-tel').value.trim();
    const total = Math.max(1, parseInt(host.querySelector('#f-total').value, 10) || convidado.totalConvite);
    const sanitized = higienizarLinha(`${[nome, ...acompan].join(' e ')} | ${tel}`);
    const next = {
      ...convidado,
      ...sanitized,
      acompanhantesNomes: acompan.length ? acompan : sanitized.acompanhantesNomes,
      acompanhantes: acompan.length ? acompan.length : sanitized.acompanhantes,
      totalConvite: total,
      rsvp: updateRSVP(host, convidado, total),
      envio: updateEnvio(host, convidado),
    };
    await persistList(ctx, root, updateListItem(next));
    ctx.setStatus?.('Convite atualizado', 'saved');
    close();
  });
}

function drawerTemplate(convidado, listaAcompanhantes) {
  const nomes = [convidado.principal, ...(convidado.acompanhantesNomes || [])].filter(Boolean);
  const checkboxes = nomes
    .map((nome) => {
      const checked = convidado.rsvp?.confirmadosNomes?.includes(nome) ? 'checked' : '';
      return `<label><input type="checkbox" data-name="${nome}" ${checked}/> ${nome}</label>`;
    })
    .join('');
  const options = Array.from({ length: convidado.totalConvite + 1 }, (_, i) => {
    const selected = convidado.rsvp?.confirmadosN === i ? 'selected' : '';
    return `<option value="${i}" ${selected}>${i}</option>`;
  }).join('');
  const enviado = convidado.envio?.enviado ? 'checked' : '';
  return `
    <div class="ac-drawer__overlay"></div>
    <div class="ac-drawer__panel">
      <header class="ac-drawer__header">
        <h4>Editar convite</h4>
        <button id="drawer-close" aria-label="Fechar">×</button>
      </header>
      <form id="drawer-form" class="ac-drawer__content">
        <section class="ac-form-grid">
          <label>Nome(s)
            <input id="f-nome" value="${convidado.nome}" required />
          </label>
          <label>Telefone
            <input id="f-tel" value="${convidado.telefoneFormatado || convidado.telefone || ''}" placeholder="+55 41 99999-0000" />
          </label>
          <label>Total do convite
            <input id="f-total" type="number" min="1" value="${convidado.totalConvite}" />
          </label>
        </section>
        <section class="ac-fieldset">
          <legend>Acompanhantes</legend>
          <textarea id="f-acompanhantes" rows="4" placeholder="Um por linha">${listaAcompanhantes}</textarea>
          <p class="ac-muted">Higienização respeita nomes com vírgula, "e" e ampersand.</p>
        </section>
        <section class="ac-fieldset">
          <legend>RSVP</legend>
          <div class="ac-rsvp">
            <div class="ac-rsvp__names">
              ${checkboxes || '<em>Informe os nomes para marcar individualmente.</em>'}
            </div>
            <div>
              <label>Confirmados (número)
                <select id="f-conf">${options}</select>
              </label>
              <label>Observação
                <textarea id="f-obs" rows="2">${convidado.rsvp?.observacao || ''}</textarea>
              </label>
            </div>
          </div>
        </section>
        <section class="ac-fieldset">
          <legend>Envio</legend>
          <label><input type="checkbox" id="f-enviado" ${enviado}/> Mensagem enviada</label>
          <label>Modelo utilizado
            <input id="f-modelo" value="${convidado.envio?.modeloId || ''}" placeholder="ID do modelo (opcional)" />
          </label>
        </section>
        <div id="drawer-alert" class="ac-alert" hidden></div>
        <footer class="ac-drawer__footer">
          <div class="ac-drawer__footer-left">
            <button type="button" id="drawer-reapply">Reaplicar higienização</button>
            <button type="button" id="drawer-duplicate">Duplicar</button>
            <button type="button" id="drawer-delete" class="ac-danger">Excluir</button>
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

function updateRSVP(host, convidado, totalConvite) {
  const checked = Array.from(host.querySelectorAll('.ac-rsvp__names input[type="checkbox"]:checked')).map((input) => input.dataset.name);
  const confirmadosN = checked.length ? checked.length : parseInt(host.querySelector('#f-conf').value, 10) || 0;
  const status = confirmadosN === 0
    ? 'ausente'
    : confirmadosN === totalConvite
      ? 'confirmado_total'
      : 'confirmado_parcial';
  return {
    status,
    confirmadosN,
    confirmadosNomes: checked.length ? checked : convidado.rsvp?.confirmadosNomes || [],
    observacao: host.querySelector('#f-obs').value.trim(),
    atualizadoEm: Date.now(),
  };
}

function updateEnvio(host, convidado) {
  const enviado = host.querySelector('#f-enviado').checked;
  return {
    enviado,
    enviadoEm: enviado ? (convidado.envio?.enviadoEm || Date.now()) : null,
    modeloId: host.querySelector('#f-modelo').value.trim() || null,
  };
}

function renderWarnings(host, sanitized) {
  const alertBox = host.querySelector('#drawer-alert');
  if (!alertBox) return;
  const warnings = [];
  if (!sanitized.telefone && host.querySelector('#f-tel').value.trim()) {
    warnings.push('Telefone não reconhecido. Verifique DDD/DDD internacional.');
  }
  if (!sanitized.nome) {
    warnings.push('Nome vazio após higienização.');
  }
  if (sanitized.totalConvite < 1) {
    warnings.push('Total do convite inválido.');
  }
  if (!warnings.length) {
    alertBox.hidden = true;
    alertBox.textContent = '';
    return;
  }
  alertBox.hidden = false;
  alertBox.innerHTML = warnings.map((msg) => `<p>${msg}</p>`).join('');
}

export function destroy() {
  state = { lista: [], filtros: { rsvp: 'todos', telefone: 'todos', envio: 'todos' } };
}
