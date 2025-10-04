<script lang="ts">
  import type { PanelId } from '../stores/ui';
  import SyncPanel from './SyncPanel.svelte';
  import type { ProjectDataApi } from '@ac/data/projectStore';
  import type { SyncClient } from '@marco/platform/syncClient';

  export interface IndicatorCard {
    panel: PanelId;
    title: string;
    percentage: number;
    primary: string;
    secondary: string;
  }

  export interface GuestsIndicator extends IndicatorCard {
    bands: { label: string; value: number }[];
    legend: string;
  }

  export let activePanel: PanelId = 'overview';
  export let openPanel: (panel: PanelId) => void;
  export let tarefas: IndicatorCard;
  export let fornecedores: IndicatorCard;
  export let convidados: GuestsIndicator;
  export let projectData: ProjectDataApi;
  export let syncClient: SyncClient;

  export let tasksHost: HTMLDivElement | null = null;
  export let fornecedoresHost: HTMLDivElement | null = null;
  export let convidadosHost: HTMLDivElement | null = null;
  export let mensagensHost: HTMLDivElement | null = null;
  export let syncHost: HTMLDivElement | null = null;

  const width = (value: number) => `${Math.min(100, Math.max(0, value))}%`;
</script>

<section
  class="card space-y-6"
  id="panel-overview"
  data-panel="overview"
  hidden={activePanel !== 'overview'}
>
  <div class="flex flex-col gap-2">
    <h2 class="text-xl font-semibold text-ink">Indicadores do evento</h2>
    <p class="text-sm text-ink-muted">
      Acompanhe o andamento geral e acesse rapidamente os módulos para atualizar os dados.
    </p>
  </div>

  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3" id="cardIndicadores">
    <article class="mini kpi flex flex-col gap-4 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm" id="kpi_tasks">
      <header class="flex items-start justify-between gap-2">
        <h3 class="text-base font-semibold text-ink" id="kpi_task_title">{tarefas?.title}</h3>
        <button
          class="rounded-lg border border-transparent bg-brand/10 px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          data-open="tarefas"
          on:click={() => openPanel?.('tarefas')}
          type="button"
        >
          Abrir módulo
        </button>
      </header>
      <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div id="kpi_task_bar" class="h-full rounded-full bg-brand transition-all duration-300" style={`width:${width(tarefas?.percentage || 0)}`}></div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span id="kpi_task_lbl1">{tarefas?.primary}</span>
        <span id="kpi_task_lbl2">{tarefas?.secondary}</span>
      </div>
    </article>

    <article class="mini kpi flex flex-col gap-4 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm" id="kpi_for">
      <header class="flex items-start justify-between gap-2">
        <h3 class="text-base font-semibold text-ink" id="kpi_for_title">{fornecedores?.title}</h3>
        <button
          class="rounded-lg border border-transparent bg-brand/10 px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          data-open="fornecedores"
          on:click={() => openPanel?.('fornecedores')}
          type="button"
        >
          Abrir módulo
        </button>
      </header>
      <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div id="kpi_for_bar" class="h-full rounded-full bg-brand transition-all duration-300" style={`width:${width(fornecedores?.percentage || 0)}`}></div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span id="kpi_for_lbl1">{fornecedores?.primary}</span>
        <span id="kpi_for_lbl2">{fornecedores?.secondary}</span>
      </div>
    </article>

    <article class="mini kpi flex flex-col gap-4 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm" id="kpi_guests">
      <header class="flex items-start justify-between gap-2">
        <h3 class="text-base font-semibold text-ink" id="kpi_guest_title">{convidados?.title}</h3>
        <button
          class="rounded-lg border border-transparent bg-brand/10 px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          data-open="convidados"
          on:click={() => openPanel?.('convidados')}
          type="button"
        >
          Abrir módulo
        </button>
      </header>
      <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div id="kpi_guest_bar" class="h-full rounded-full bg-brand transition-all duration-300" style={`width:${width(convidados?.percentage || 0)}`}></div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span id="kpi_guest_lbl1">{convidados?.primary}</span>
        <span id="kpi_guest_lbl2">{convidados?.secondary}</span>
      </div>
      <div class="space-y-2" aria-label="Distribuição por mesas/grupos">
        <div class="flex h-3 overflow-hidden rounded-full bg-slate-200" id="kpi_guest_bands">
          {#if convidados?.bands?.length}
            {#each convidados.bands as band}
              <div
                class="seg"
                style={`width:${width(band.value)};`}
                title={`${band.label}: ${band.value.toFixed?.(0) ?? band.value}`}
              ></div>
            {/each}
          {:else}
            <div class="seg" style="width:100%"></div>
          {/if}
        </div>
        <div class="text-xs text-ink-muted" id="kpi_guest_legend">
          {convidados?.legend || 'Sem distribuição registrada'}
        </div>
      </div>
    </article>
  </div>
</section>

<section
  class="card space-y-4"
  id="panel-tarefas"
  data-panel="tarefas"
  hidden={activePanel !== 'tarefas'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Checklist de tarefas</h2>
      <p class="text-sm text-ink-muted">Organize responsabilidades, prazos e acompanhe o andamento da equipe.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel?.('overview')}
      type="button"
    >
      Voltar
    </button>
  </div>
  <div id="tasks_host" class="min-h-[260px]" bind:this={tasksHost}></div>
</section>

<section
  class="card space-y-4"
  id="panel-fornecedores"
  data-panel="fornecedores"
  hidden={activePanel !== 'fornecedores'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Fornecedores</h2>
      <p class="text-sm text-ink-muted">Centralize contratos, pagamentos e contatos essenciais.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel?.('overview')}
      type="button"
    >
      Voltar
    </button>
  </div>
  <div id="fornecedores_host" class="min-h-[260px]" bind:this={fornecedoresHost}></div>
</section>

<section
  class="card space-y-4"
  id="panel-convidados"
  data-panel="convidados"
  hidden={activePanel !== 'convidados'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Convidados e convites</h2>
      <p class="text-sm text-ink-muted">Gerencie RSVP, mesas, grupos e envios de convites.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel?.('overview')}
      type="button"
    >
      Voltar
    </button>
  </div>
  <div id="convidados_host" class="min-h-[260px]" bind:this={convidadosHost}></div>
</section>

<section
  class="card space-y-4"
  id="panel-mensagens"
  data-panel="mensagens"
  hidden={activePanel !== 'mensagens'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Mensagens</h2>
      <p class="text-sm text-ink-muted">Integre a comunicação do evento com templates e histórico compartilhado.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel?.('overview')}
      type="button"
    >
      Voltar
    </button>
  </div>
  <div id="mensagens_host" class="min-h-[260px]" bind:this={mensagensHost}></div>
</section>

<section
  class="card space-y-4"
  id="panel-sync"
  data-panel="sync"
  hidden={activePanel !== 'sync'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Sincronização</h2>
      <p class="text-sm text-ink-muted">Conecte-se a provedores para salvar snapshots e restaurar dados.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel?.('overview')}
      type="button"
    >
      Voltar
    </button>
  </div>
  <div id="sync_host" class="space-y-4" bind:this={syncHost}>
    <SyncPanel {projectData} {syncClient} />
  </div>
</section>
