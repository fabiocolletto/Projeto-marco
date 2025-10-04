<script lang="ts">
  import SyncPanel from './SyncPanel.svelte';
  import { activePanel, openPanel } from '$lib/stores/ui';
</script>

<section
  class="card space-y-6"
  id="panel-overview"
  data-panel="overview"
  hidden={$activePanel !== 'overview'}
>
  <div class="flex flex-col gap-2">
    <h2 class="text-xl font-semibold text-ink">Indicadores do evento</h2>
    <p class="text-sm text-ink-muted">
      Acompanhe o andamento geral e acesse rapidamente os módulos para atualizar os dados.
    </p>
  </div>

  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <article class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm" id="kpi_tasks">
      <header class="flex items-start justify-between gap-2">
        <h3 class="text-base font-semibold text-ink" id="kpi_task_title">Tarefas</h3>
        <button
          class="rounded-lg border border-transparent bg-brand/10 px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          data-open="tarefas"
          on:click={() => openPanel('tarefas')}
        >
          Abrir módulo
        </button>
      </header>
      <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div id="kpi_task_bar" class="h-full rounded-full bg-brand transition-all duration-300" style="width:0%"></div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span id="kpi_task_lbl1">0 concluídas — 0%</span>
        <span id="kpi_task_lbl2">Total: 0</span>
      </div>
    </article>

    <article class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm" id="kpi_for">
      <header class="flex items-start justify-between gap-2">
        <h3 class="text-base font-semibold text-ink" id="kpi_for_title">Fornecedores</h3>
        <button
          class="rounded-lg border border-transparent bg-brand/10 px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          data-open="fornecedores"
          on:click={() => openPanel('fornecedores')}
        >
          Abrir módulo
        </button>
      </header>
      <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div id="kpi_for_bar" class="h-full rounded-full bg-brand transition-all duration-300" style="width:0%"></div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span id="kpi_for_lbl1">R$ 0,00 pagos — 0%</span>
        <span id="kpi_for_lbl2">Total: R$ 0,00</span>
      </div>
    </article>

    <article class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm" id="kpi_guests">
      <header class="flex items-start justify-between gap-2">
        <h3 class="text-base font-semibold text-ink" id="kpi_guest_title">Convidados &amp; Convites</h3>
        <button
          class="rounded-lg border border-transparent bg-brand/10 px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          data-open="convidados"
          on:click={() => openPanel('convidados')}
        >
          Abrir módulo
        </button>
      </header>
      <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div id="kpi_guest_bar" class="h-full rounded-full bg-brand transition-all duration-300" style="width:0%"></div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span id="kpi_guest_lbl1">0 confirmados — 0%</span>
        <span id="kpi_guest_lbl2">Total: 0</span>
      </div>
      <div class="space-y-2" aria-label="Distribuição por mesas/grupos">
        <div class="flex h-3 overflow-hidden rounded-full bg-slate-200" id="kpi_guest_bands"></div>
        <div class="text-xs text-ink-muted" id="kpi_guest_legend"></div>
      </div>
    </article>
  </div>
</section>

<section
  class="card space-y-4"
  id="panel-tarefas"
  data-panel="tarefas"
  hidden={$activePanel !== 'tarefas'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Checklist de tarefas</h2>
      <p class="text-sm text-ink-muted">Organize responsabilidades, prazos e acompanhe o andamento da equipe.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel('overview')}
    >
      Voltar
    </button>
  </div>
  <div id="tasks_host" class="min-h-[260px]"></div>
</section>

<section
  class="card space-y-4"
  id="panel-fornecedores"
  data-panel="fornecedores"
  hidden={$activePanel !== 'fornecedores'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Fornecedores</h2>
      <p class="text-sm text-ink-muted">Centralize contratos, pagamentos e contatos essenciais.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel('overview')}
    >
      Voltar
    </button>
  </div>
  <div id="fornecedores_host" class="min-h-[260px]"></div>
</section>

<section
  class="card space-y-4"
  id="panel-convidados"
  data-panel="convidados"
  hidden={$activePanel !== 'convidados'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Convidados e convites</h2>
      <p class="text-sm text-ink-muted">Gerencie RSVP, mesas, grupos e envios de convites.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel('overview')}
    >
      Voltar
    </button>
  </div>
  <div id="convidados_host" class="min-h-[260px]"></div>
</section>

<section
  class="card space-y-4"
  id="panel-mensagens"
  data-panel="mensagens"
  hidden={$activePanel !== 'mensagens'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Mensagens</h2>
      <p class="text-sm text-ink-muted">Integre a comunicação do evento com templates e histórico compartilhado.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel('overview')}
    >
      Voltar
    </button>
  </div>
  <div id="mensagens_host" class="min-h-[260px]"></div>
</section>

<section
  class="card space-y-4"
  id="panel-sync"
  data-panel="sync"
  hidden={$activePanel !== 'sync'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Sincronização</h2>
      <p class="text-sm text-ink-muted">Conecte-se a provedores para salvar snapshots e restaurar dados.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel('overview')}
    >
      Voltar
    </button>
  </div>
  <div id="sync_host" class="space-y-4">
    <SyncPanel />
  </div>
</section>
