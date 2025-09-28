// tools/gestao-de-convidados/views/convites.mjs
import { higienizarLinha, higienizarLista } from '../../shared/higienizarLista.mjs';

export async function render(root, ctx) {
  let project = await ctx.store.getProject(ctx.projectId);
  let lista = Array.isArray(project?.lista) ? project.lista : [];

  mountDashboard(root, project, lista);

  const tbody = root.querySelector('#ac-rows');
  const drawerHost = root.querySelector('#drawer');
  lista.forEach((item) => tbody.appendChild(row(item)));

  const refs = collectRefs(root);
  updateStats(refs, lista);
  updateSummary(refs, project);

  root.querySelector('#ac-import').addEventListener('click', async () => {
    const txt = root.querySelector('#ac-paste').value.trim();
    if (!txt) return;

    const res = txt.includes('\n')
      ? higienizarLista(txt)
      : { convidados: [higienizarLinha(txt)] };

    const now = Date.now();
    const novos = res.convidados.map((g) => ({
      id: crypto.randomUUID(),
      envio: { enviado: false, enviadoEm: null, modeloId: null },
      rsvp: {
        status: 'pendente',
        confirmadosN: 0,
        confirmadosNomes: [],
        observacao: '',
        atualizadoEm: now,
      },
      ...g,
    }));

    const listaNova = [...lista, ...novos];
    await ctx.store.updateProject(ctx.projectId, { lista: listaNova });
    lista = listaNova;
    project.lista = listaNova;

    novos.forEach((n) => tbody.appendChild(row(n)));
    root.querySelector('#ac-paste').value = '';
    updateStats(refs, lista);
    updateSummary(refs, project);
    notify(ctx, `${novos.length} convite(s) adicionados.`);
  });

  root.querySelector('#single-add').addEventListener('click', async () => {
    const nome = root.querySelector('#single-nome').value.trim();
    const tel = root.querySelector('#single-tel').value.trim();
    if (!nome && !tel) return;

    const item = higienizarLinha(`${nome} | ${tel}`);
    const novo = {
      id: crypto.randomUUID(),
      envio: { enviado: false, enviadoEm: null, modeloId: null },
      rsvp: {
        status: 'pendente',
        confirmadosN: 0,
        confirmadosNomes: [],
        observacao: '',
        atualizadoEm: Date.now(),
      },
      ...item,
    };

    const listaNova = [...lista, novo];
    await ctx.store.updateProject(ctx.projectId, { lista: listaNova });
    lista = listaNova;
    project.lista = listaNova;

    tbody.appendChild(row(novo));
    root.querySelector('#single-nome').value = '';
    root.querySelector('#single-tel').value = '';
    updateStats(refs, lista);
    updateSummary(refs, project);
    notify(ctx, 'Convite adicionado.');
  });

  tbody.addEventListener('click', async (evt) => {
    const btn = evt.target.closest('button[data-action]');
    if (!btn) return;

    const tr = btn.closest('tr');
    const id = tr.dataset.id;
    const proj = await ctx.store.getProject(ctx.projectId);
    const idx = (proj.lista || []).findIndex((x) => x.id === id);
    if (idx < 0) return;
    const item = proj.lista[idx];

    if (btn.dataset.action === 'editar') {
      openDrawer(drawerHost, item, async (next) => {
        proj.lista[idx] = next;
        const updated = await ctx.store.updateProject(ctx.projectId, {
          lista: proj.lista,
        });
        lista = updated.lista || [];
        project.lista = lista;
        tr.replaceWith(row(next));
        updateStats(refs, lista);
        updateSummary(refs, project);
        notify(ctx, 'Convite atualizado.');
      });
    }

    if (btn.dataset.action === 'confirmar') {
      item.rsvp.confirmadosN = item.totalConvite;
      item.rsvp.confirmadosNomes = [
        item.principal,
        ...(item.acompanhantesNomes || []),
      ].filter(Boolean);
      item.rsvp.status = 'confirmado_total';
      item.rsvp.atualizadoEm = Date.now();
      proj.lista[idx] = item;
      const updated = await ctx.store.updateProject(ctx.projectId, {
        lista: proj.lista,
      });
      lista = updated.lista || [];
      project.lista = lista;
      tr.replaceWith(row(item));
      updateStats(refs, lista);
      updateSummary(refs, project);
      notify(ctx, 'Convite confirmado.');
    }

    if (btn.dataset.action === 'ausente') {
      item.rsvp.confirmadosN = 0;
      item.rsvp.confirmadosNomes = [];
      item.rsvp.status = 'ausente';
      item.rsvp.atualizadoEm = Date.now();
      proj.lista[idx] = item;
      const updated = await ctx.store.updateProject(ctx.projectId, {
        lista: proj.lista,
      });
      lista = updated.lista || [];
      project.lista = lista;
      tr.replaceWith(row(item));
      updateStats(refs, lista);
      updateSummary(refs, project);
      notify(ctx, 'Convite marcado como ausente.');
    }

    if (btn.dataset.action === 'enviar') {
      item.envio.enviado = true;
      item.envio.enviadoEm = Date.now();
      proj.lista[idx] = item;
      const updated = await ctx.store.updateProject(ctx.projectId, {
        lista: proj.lista,
      });
      lista = updated.lista || [];
      project.lista = lista;
      tr.replaceWith(row(item));
      updateStats(refs, lista);
      updateSummary(refs, project);
      notify(ctx, 'Envio marcado.');
    }

    if (btn.dataset.action === 'excluir') {
      if (!confirm('Excluir este convite?')) return;
      proj.lista.splice(idx, 1);
      const updated = await ctx.store.updateProject(ctx.projectId, {
        lista: proj.lista,
      });
      lista = updated.lista || [];
      project.lista = lista;
      tr.remove();
      updateStats(refs, lista);
      updateSummary(refs, project);
      notify(ctx, 'Convite removido.');
    }
  });

  bindForms(root, ctx, refs, () => project);
}

function notify(ctx, msg) {
  if (typeof ctx.setStatus === 'function') {
    ctx.setStatus(msg);
  }
}

function mountDashboard(root, project, lista) {
  const ev = project?.evento || {};
  const cer = project?.cerimonialista || {};
  const anfitriao = ev?.anfitriao || {};

  root.innerHTML = `
    <section class="ac-section-block ac-dashboard">
      <div class="ac-dashboard__top">
        <div class="ac-status-grid">
          <article class="ac-status-card">
            <span class="ac-status-label">Convites cadastrados</span>
            <strong id="stat-total">${lista.length}</strong>
            <small>Todos os convites salvos</small>
          </article>
          <article class="ac-status-card">
            <span class="ac-status-label">Convites enviados</span>
            <strong id="stat-enviados">0</strong>
            <small>Mensagens marcadas como enviadas</small>
          </article>
          <article class="ac-status-card">
            <span class="ac-status-label">Pessoas confirmadas</span>
            <strong id="stat-confirmados">0</strong>
            <small>Total de convidados confirmados</small>
          </article>
          <article class="ac-status-card">
            <span class="ac-status-label">Convites pendentes</span>
            <strong id="stat-pendentes">0</strong>
            <small>Aguardando envio ou resposta</small>
          </article>
        </div>
        <article class="ac-card ac-summary-card">
          <header>
            <div>
              <h4 id="summary-title">${ev.titulo || 'Defina o nome do evento'}</h4>
              <p class="ac-summary-sub" id="summary-date">${formatDate(ev.data, ev.hora)}</p>
            </div>
            <span class="ac-summary-badge" id="summary-status">${lista.length ? 'Em andamento' : 'Comece adicionando convites'}</span>
          </header>
          <dl>
            <div>
              <dt>Local</dt>
              <dd id="summary-local">${ev.local || 'Informe o local'}</dd>
            </div>
            <div>
              <dt>Endereço</dt>
              <dd id="summary-endereco">${formatEndereco(ev)}</dd>
            </div>
            <div>
              <dt>Organizador</dt>
              <dd id="summary-cerimonialista">${cer.nomeCompleto || 'Cadastre o organizador'}</dd>
            </div>
            <div>
              <dt>Anfitrião</dt>
              <dd id="summary-anfitriao">${anfitriao.nome || 'Cadastre o anfitrião'}</dd>
            </div>
          </dl>
          <p id="summary-resumo">${ev.resumo ? sanitize(ev.resumo) : '<span class="ac-muted">Use os formulários abaixo para registrar o resumo do evento.</span>'}</p>
        </article>
      </div>
    </section>
    <section class="ac-section-block">
      <div class="ac-grid-3">
        <form class="ac-card ac-form-card" id="form-geral">
          <h4>Dados gerais</h4>
          <label>Nome do evento
            <input name="titulo" value="${ev.titulo || ''}" placeholder="Ex.: Casamento Ana & João" />
          </label>
          <div class="ac-form-inline">
            <label>Data
              <input type="date" name="data" value="${ev.data || ''}" />
            </label>
            <label>Hora
              <input type="time" name="hora" value="${ev.hora || ''}" />
            </label>
          </div>
          <label>Local
            <input name="local" value="${ev.local || ''}" placeholder="Espaço, salão, igreja…" />
          </label>
          <label>Endereço completo
            <input name="endereco" value="${ev.endereco?.logradouro || ''}" placeholder="Rua, número, cidade" />
          </label>
          <label>Resumo do evento
            <textarea name="resumo" rows="3" placeholder="Breve descrição ou instruções.">${ev.resumo || ''}</textarea>
          </label>
          <div class="ac-actions">
            <button type="submit" class="ac-primary">Salvar dados gerais</button>
          </div>
        </form>
        <form class="ac-card ac-form-card" id="form-organizador">
          <h4>Dados do organizador</h4>
          <label>Nome completo
            <input name="nome" value="${cer.nomeCompleto || ''}" placeholder="Quem coordena o evento" />
          </label>
          <label>Telefone / WhatsApp
            <input name="telefone" value="${cer.telefone || ''}" placeholder="(00) 90000-0000" />
          </label>
          <label>Redes sociais ou e-mail
            <input name="redeSocial" value="${cer.redeSocial || ''}" placeholder="@usuario ou e-mail" />
          </label>
          <div class="ac-actions">
            <button type="submit" class="ac-primary">Salvar organizador</button>
          </div>
        </form>
        <form class="ac-card ac-form-card" id="form-anfitriao">
          <h4>Dados do anfitrião</h4>
          <label>Nome dos anfitriões
            <input name="nome" value="${anfitriao.nome || ''}" placeholder="Responsáveis pelo evento" />
          </label>
          <label>Contato principal
            <input name="contato" value="${anfitriao.contato || ''}" placeholder="Telefone ou e-mail" />
          </label>
          <label>Observações
            <textarea name="observacao" rows="3" placeholder="Notas importantes para a recepção.">${anfitriao.observacao || ''}</textarea>
          </label>
          <div class="ac-actions">
            <button type="submit" class="ac-primary">Salvar anfitrião</button>
          </div>
        </form>
      </div>
    </section>
    <section class="ac-section-block">
      <h3>Convites</h3>
      <div class="ac-grid-2">
        <div class="ac-card">
          <h4>Adicionar vários (colar)</h4>
          <textarea id="ac-paste" rows="4" placeholder="Uma linha por convite: Nome(s) | Telefone"></textarea>
          <div class="ac-actions"><button id="ac-import" class="ac-primary">Higienizar &amp; Adicionar</button></div>
        </div>
        <div class="ac-card">
          <h4>Adicionar um</h4>
          <div class="ac-form-row">
            <input id="single-nome" placeholder="Nome(s)" />
            <input id="single-tel" placeholder="Telefone" />
            <button id="single-add">Adicionar</button>
          </div>
        </div>
      </div>
      <div class="ac-table-wrap">
        <table class="ac-table">
          <thead>
            <tr>
              <th>Convidado</th><th>Telefone</th><th>Total</th>
              <th>Enviado?</th><th>Enviado em</th>
              <th>RSVP</th><th>Confirmados</th><th>Ações</th>
            </tr>
          </thead>
          <tbody id="ac-rows"></tbody>
        </table>
      </div>
    </section>
    <div id="drawer" class="ac-drawer" hidden></div>
  `;
}

function collectRefs(root) {
  return {
    stats: {
      total: root.querySelector('#stat-total'),
      enviados: root.querySelector('#stat-enviados'),
      confirmados: root.querySelector('#stat-confirmados'),
      pendentes: root.querySelector('#stat-pendentes'),
    },
    summary: {
      title: root.querySelector('#summary-title'),
      date: root.querySelector('#summary-date'),
      status: root.querySelector('#summary-status'),
      local: root.querySelector('#summary-local'),
      endereco: root.querySelector('#summary-endereco'),
      cerimonialista: root.querySelector('#summary-cerimonialista'),
      anfitriao: root.querySelector('#summary-anfitriao'),
      resumo: root.querySelector('#summary-resumo'),
    },
  };
}

function updateStats(refs, lista) {
  const stats = computeStats(lista);
  if (refs.stats.total) refs.stats.total.textContent = stats.total;
  if (refs.stats.enviados) refs.stats.enviados.textContent = stats.enviados;
  if (refs.stats.confirmados) refs.stats.confirmados.textContent = stats.confirmados;
  if (refs.stats.pendentes) refs.stats.pendentes.textContent = stats.pendentes;
}

function computeStats(lista) {
  const stats = {
    total: lista.length,
    enviados: 0,
    confirmados: 0,
    pendentes: 0,
  };

  lista.forEach((item) => {
    if (item?.envio?.enviado) stats.enviados += 1;
    if (typeof item?.rsvp?.confirmadosN === 'number') {
      stats.confirmados += item.rsvp.confirmadosN;
    }
    if (!item?.envio?.enviado || (item?.rsvp?.status || 'pendente') === 'pendente') {
      stats.pendentes += 1;
    }
  });

  return stats;
}

function updateSummary(refs, project) {
  const ev = project?.evento || {};
  const cer = project?.cerimonialista || {};
  const anfitriao = ev?.anfitriao || {};

  if (refs.summary.title) refs.summary.title.textContent = ev.titulo || 'Defina o nome do evento';
  if (refs.summary.date) refs.summary.date.textContent = formatDate(ev.data, ev.hora);

  const lista = Array.isArray(project?.lista) ? project.lista : [];
  if (refs.summary.status) {
    refs.summary.status.textContent = lista.length ? 'Em andamento' : 'Comece adicionando convites';
  }

  if (refs.summary.local) refs.summary.local.textContent = ev.local || 'Informe o local';
  if (refs.summary.endereco) refs.summary.endereco.textContent = formatEndereco(ev);
  if (refs.summary.cerimonialista) refs.summary.cerimonialista.textContent = cer.nomeCompleto || 'Cadastre o organizador';
  if (refs.summary.anfitriao) refs.summary.anfitriao.textContent = anfitriao.nome || 'Cadastre o anfitrião';
  if (refs.summary.resumo) {
    refs.summary.resumo.innerHTML = ev.resumo
      ? sanitize(ev.resumo)
      : '<span class="ac-muted">Use os formulários abaixo para registrar o resumo do evento.</span>';
  }
}

function bindForms(root, ctx, refs, projectGetter) {
  const formGeral = root.querySelector('#form-geral');
  const formOrganizador = root.querySelector('#form-organizador');
  const formAnfitriao = root.querySelector('#form-anfitriao');

  if (formGeral) {
    formGeral.addEventListener('submit', async (evt) => {
      evt.preventDefault();
      const data = new FormData(formGeral);
      const project = projectGetter();
      const nextEvento = {
        ...project.evento,
        titulo: (data.get('titulo') || '').trim(),
        data: data.get('data') || '',
        hora: data.get('hora') || '',
        local: (data.get('local') || '').trim(),
        resumo: (data.get('resumo') || '').trim(),
        endereco: {
          ...(project.evento?.endereco || {}),
          logradouro: (data.get('endereco') || '').trim(),
        },
      };

      const updated = await ctx.store.updateProject(ctx.projectId, {
        evento: nextEvento,
      });
      Object.assign(project, updated);
      updateSummary(refs, updated);
      notify(ctx, 'Dados gerais atualizados.');
    });
  }

  if (formOrganizador) {
    formOrganizador.addEventListener('submit', async (evt) => {
      evt.preventDefault();
      const data = new FormData(formOrganizador);
      const project = projectGetter();
      const nextCer = {
        ...project.cerimonialista,
        nomeCompleto: (data.get('nome') || '').trim(),
        telefone: (data.get('telefone') || '').trim(),
        redeSocial: (data.get('redeSocial') || '').trim(),
      };

      const updated = await ctx.store.updateProject(ctx.projectId, {
        cerimonialista: nextCer,
      });
      Object.assign(project, updated);
      updateSummary(refs, updated);
      notify(ctx, 'Organizador atualizado.');
    });
  }

  if (formAnfitriao) {
    formAnfitriao.addEventListener('submit', async (evt) => {
      evt.preventDefault();
      const data = new FormData(formAnfitriao);
      const project = projectGetter();
      const nextHost = {
        ...project.evento?.anfitriao,
        nome: (data.get('nome') || '').trim(),
        contato: (data.get('contato') || '').trim(),
        observacao: (data.get('observacao') || '').trim(),
      };

      const updated = await ctx.store.updateProject(ctx.projectId, {
        evento: {
          ...project.evento,
          anfitriao: nextHost,
        },
      });
      Object.assign(project, updated);
      updateSummary(refs, updated);
      notify(ctx, 'Dados do anfitrião atualizados.');
    });
  }
}

function formatDate(dateStr, timeStr) {
  if (!dateStr && !timeStr) return 'Defina data e horário';
  let dateLabel = 'Defina a data';
  if (dateStr) {
    const parts = dateStr.split('-').map(Number);
    if (parts.length >= 3) {
      const [y, m, d] = parts;
      const date = new Date(Date.UTC(y, m - 1, d));
      dateLabel = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }).format(date);
    } else {
      dateLabel = dateStr;
    }
  }

  const timeLabel = timeStr ? `${timeStr}h` : 'Horário a definir';
  return `${dateLabel} · ${timeLabel}`;
}

function formatEndereco(ev) {
  const end = ev?.endereco || {};
  if (end.logradouro) return end.logradouro;
  return 'Endereço a definir';
}

function sanitize(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br/>');
}

function row(item) {
  const tr = document.createElement('tr');
  tr.dataset.id = item.id;
  const enviadoEm = item.envio?.enviadoEm
    ? new Date(item.envio.enviadoEm).toLocaleString()
    : '-';
  const rsvp = item.rsvp?.status || 'pendente';
  const conf = item.rsvp?.confirmadosN ?? 0;
  tr.innerHTML = `
    <td>${item.nome}</td>
    <td>${item.telefoneFormatado || item.telefone || '-'}</td>
    <td>${item.totalConvite}</td>
    <td>${item.envio?.enviado ? 'Sim' : 'Não'}</td>
    <td>${enviadoEm}</td>
    <td><span class="ac-badge ac-badge--${rsvp}">${rsvp.replace('_', ' ')}</span></td>
    <td>${conf}/${item.totalConvite}</td>
    <td class="ac-actions-col">
      <button data-action="editar">Editar</button>
      <button data-action="confirmar">Confirmar todos</button>
      <button data-action="ausente">Ausente</button>
      <button data-action="enviar">Marcar enviado</button>
      <button data-action="excluir" class="ac-danger">Excluir</button>
    </td>
  `;
  return tr;
}

function openDrawer(host, item, onSave) {
  host.hidden = false;
  const nomes = [item.principal, ...(item.acompanhantesNomes || [])].filter(Boolean);
  const checks = nomes
    .map((n) => {
      const checked = item.rsvp.confirmadosNomes?.includes(n) ? 'checked' : '';
      return `<label><input type="checkbox" data-name="${n}" ${checked}/> ${n}</label>`;
    })
    .join('') || '<em>Sem nomes de acompanhantes — use o seletor numérico.</em>';
  const numOptions = Array.from(
    { length: item.totalConvite + 1 },
    (_, i) => `<option value="${i}" ${i === item.rsvp.confirmadosN ? 'selected' : ''}>${i}</option>`
  ).join('');
  host.innerHTML = `
    <div class="ac-drawer__overlay"></div>
    <div class="ac-drawer__panel">
      <header class="ac-drawer__header">
        <h4>Editar convite</h4>
        <button id="close">×</button>
      </header>
      <div class="ac-drawer__content">
        <div class="ac-form-grid">
          <label>Nome(s) <input id="f-nome" value="${item.nome}"/></label>
          <label>Telefone <input id="f-tel" value="${item.telefone || ''}" placeholder="Ex.: +55 41 99999-0000"/></label>
          <label>Total do convite <input id="f-total" type="number" min="1" value="${item.totalConvite}"/></label>
        </div>
        <fieldset class="ac-fieldset">
          <legend>RSVP</legend>
          <div class="ac-rsvp">
            <div class="ac-rsvp__names">${checks}</div>
            <div class="ac-rsvp__count">
              <label>Confirmados (número)
                <select id="f-conf">${numOptions}</select>
              </label>
            </div>
            <label>Observação <input id="f-obs" value="${item.rsvp?.observacao || ''}"/></label>
          </div>
        </fieldset>
        <fieldset class="ac-fieldset">
          <legend>Envio</legend>
          <label><input type="checkbox" id="f-enviado" ${item.envio?.enviado ? 'checked' : ''}/> Mensagem enviada</label>
          <label>Modelo <input id="f-modelo" value="${item.envio?.modeloId || ''}" placeholder="Opcional: id do modelo"/></label>
        </fieldset>
      </div>
      <footer class="ac-drawer__footer">
        <button id="save" class="ac-primary">Salvar alterações</button>
        <button id="cancel">Cancelar</button>
      </footer>
    </div>
  `;

  const close = () => {
    host.hidden = true;
    host.innerHTML = '';
  };

  host.querySelector('#cancel').addEventListener('click', close);
  host.querySelector('#close').addEventListener('click', close);
  host.querySelector('.ac-drawer__overlay').addEventListener('click', close);
  host.querySelector('#save').addEventListener('click', async () => {
    const next = {
      ...item,
      nome: host.querySelector('#f-nome').value.trim(),
      telefone: host.querySelector('#f-tel').value.trim(),
      totalConvite: Number(host.querySelector('#f-total').value) || item.totalConvite,
      rsvp: {
        ...item.rsvp,
        confirmadosN: Number(host.querySelector('#f-conf').value) || 0,
        confirmadosNomes: Array.from(host.querySelectorAll('input[data-name]:checked')).map((c) => c.dataset.name),
        observacao: host.querySelector('#f-obs').value.trim(),
        status: deriveStatus(item, host),
        atualizadoEm: Date.now(),
      },
      envio: {
        ...item.envio,
        enviado: host.querySelector('#f-enviado').checked,
        enviadoEm: host.querySelector('#f-enviado').checked ? Date.now() : null,
        modeloId: host.querySelector('#f-modelo').value.trim() || null,
      },
    };
    close();
    await onSave(next);
  });
}

function deriveStatus(item, host) {
  const enviado = host.querySelector('#f-enviado').checked;
  const confirmados = Number(host.querySelector('#f-conf').value) || 0;
  if (confirmados >= item.totalConvite) return 'confirmado_total';
  if (confirmados > 0) return 'confirmado_parcial';
  if (enviado) return 'aguardando_resposta';
  return 'pendente';
}
