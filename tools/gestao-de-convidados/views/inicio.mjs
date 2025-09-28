// tools/gestao-de-convidados/views/inicio.mjs
// Painel inicial com resumo do evento e indicadores rápidos

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString();
}

function formatTime(timeStr) {
  if (!timeStr) return '-';
  const [h, m] = timeStr.split(':');
  if (!h) return timeStr;
  const date = new Date();
  date.setHours(Number(h), Number(m || '0'));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export async function render(root, ctx) {
  const project = await ctx.store.getProject(ctx.projectId);
  const evento = project?.evento || {};
  const lista = Array.isArray(project?.lista) ? project.lista : [];
  const confirmados = lista.filter((g) => ['confirmado_total', 'confirmado_parcial'].includes(g?.rsvp?.status));
  const ausentes = lista.filter((g) => g?.rsvp?.status === 'ausente');
  const pendentes = lista.filter((g) => !g?.rsvp || g.rsvp.status === 'pendente');
  const comTelefone = lista.filter((g) => g.telefone || g.telefoneFormatado);
  const totalPessoas = lista.reduce((acc, g) => acc + (g.totalConvite || 0), 0);
  const confirmadosTotal = confirmados.reduce((acc, g) => acc + (g.rsvp?.confirmadosN || 0), 0);

  root.innerHTML = `
    <section class="ac-section-block">
      <h3>Painel do evento</h3>
      <div class="ac-dashboard">
        <article class="ac-card">
          <h4>Próximo evento</h4>
          <p class="ac-dashboard__title">${evento.titulo || 'Defina o título do evento'}</p>
          <dl class="ac-dashboard__list">
            <div><dt>Data</dt><dd>${formatDate(evento.data)}</dd></div>
            <div><dt>Hora</dt><dd>${formatTime(evento.hora)}</dd></div>
            <div><dt>Local</dt><dd>${evento.local || '-'}</dd></div>
          </dl>
        </article>
        <article class="ac-card">
          <h4>Convites</h4>
          <div class="ac-kpis">
            <div><strong>${lista.length}</strong><span>Convites</span></div>
            <div><strong>${totalPessoas}</strong><span>Pessoas convidadas</span></div>
            <div><strong>${comTelefone.length}</strong><span>Com telefone</span></div>
          </div>
        </article>
        <article class="ac-card">
          <h4>Status RSVP</h4>
          <div class="ac-kpis">
            <div><strong>${confirmados.length}</strong><span>Confirmados</span></div>
            <div><strong>${confirmadosTotal}</strong><span>Pessoas confirmadas</span></div>
            <div><strong>${pendentes.length}</strong><span>Pendentes</span></div>
            <div><strong>${ausentes.length}</strong><span>Ausentes</span></div>
          </div>
        </article>
        <article class="ac-card">
          <h4>Agenda de mensagens</h4>
          <p>${(project.agenda || []).length} disparo(s) planejados.</p>
          <button class="ac-link" data-nav="agenda">Ir para Mensagens & Agenda</button>
        </article>
      </div>
    </section>
  `;

  root.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => ctx.navigate(btn.dataset.nav));
  });
}

export function destroy() {}
