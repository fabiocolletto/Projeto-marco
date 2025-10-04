<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { ProjectDataApi, ProjectStore } from '@ac/data/projectStore';
  import DashboardHeader from './components/DashboardHeader.svelte';
  import DashboardBadges from './components/DashboardBadges.svelte';
  import DashboardIndicators from './components/DashboardIndicators.svelte';
  import DashboardSummaryPanels from './components/DashboardSummaryPanels.svelte';
  import DashboardNavigation from './components/DashboardNavigation.svelte';
  import { activePanel, openPanel } from './stores/ui';
  import type { PanelId } from './stores/ui';
  import { createEventosController } from './controller';

  export let projectData: ProjectDataApi;
  export let ac: any;
  export let bus: { publish?: Function; subscribe?: Function } | null = null;
  export let store: ProjectStore | null = null;

  const miniApps = {
    tarefas: undefined as any,
    fornecedores: undefined as any,
    convidados: undefined as any,
    mensagens: undefined as any,
  };

  const controller = createEventosController({ projectData, ac, bus: bus ?? undefined, store, miniApps });

  const state = controller.state;
  const form = controller.form;
  const dateTime = controller.dateTime;
  const indicators = controller.indicators;
  const badges = controller.badges;
  const chips = controller.chips;
  const syncStatus = controller.syncStatus;
  const syncClient = controller.syncClient;

  const { setValue, getValue, setDateTime, maskCep, fillCep, select, createNew, deleteCurrent, mountMiniApp, refreshFornecedores } = controller;

  let tasksHost: HTMLDivElement | null = null;
  let fornecedoresHost: HTMLDivElement | null = null;
  let convidadosHost: HTMLDivElement | null = null;
  let mensagensHost: HTMLDivElement | null = null;
  let modulesReady = false;

  onMount(async () => {
    await controller.init();
    try {
      const [tarefas, fornecedores, convidados, mensagens] = await Promise.all([
        import('@marco/features-tarefas'),
        import('@marco/features-fornecedores'),
        import('@marco/features-convites'),
        import('@marco/features-mensagens'),
      ]);
      miniApps.tarefas = tarefas;
      miniApps.fornecedores = fornecedores;
      miniApps.convidados = convidados;
      miniApps.mensagens = mensagens;
      modulesReady = true;
      refreshFornecedores();
    } catch (error) {
      console.warn('[EventosApp] Falha ao carregar mini-apps', error);
    }
  });

  onDestroy(() => {
    controller.destroy();
  });

  $: if (modulesReady && tasksHost) mountMiniApp('tarefas', tasksHost);
  $: if (modulesReady && fornecedoresHost) mountMiniApp('fornecedores', fornecedoresHost);
  $: if (modulesReady && convidadosHost) mountMiniApp('convidados', convidadosHost);
  $: if (modulesReady && mensagensHost) mountMiniApp('mensagens', mensagensHost);

  const handleSelect = async (event: CustomEvent<{ id: string | null }>) => {
    await select(event.detail.id);
  };

  const handleCreate = async () => {
    await createNew();
  };

  const handleDelete = async () => {
    await deleteCurrent();
  };

  const handleSyncOpen = () => {
    openPanel('sync');
  };

  const handleBadgeOpen = (event: CustomEvent<{ panel: PanelId }>) => {
    openPanel(event.detail.panel);
  };

  const handleCepInput = (value: string) => maskCep(value);
  const handleCepBlur = async (prefix: string, value: string) => {
    await fillCep(prefix, value);
  };

  $: updatedAtLabel = $state.project?.updatedAt
    ? (ac?.format?.fmtDateTime ? ac.format.fmtDateTime($state.project.updatedAt) : String($state.project.updatedAt))
    : '—';
  $: if (!updatedAtLabel) {
    updatedAtLabel = '—';
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      openPanel('overview');
    }
  };
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="eventos-app grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
  <div class="space-y-4">
    <DashboardNavigation />
  </div>

  <div class="space-y-6">
    <DashboardHeader
      title={$form.evento?.nome ?? '—'}
      updatedAt={updatedAtLabel}
      usingFallback={$state.usingFallback}
      metas={$state.metas}
      currentId={$state.currentId}
      chips={$chips}
      sync={$syncStatus}
      allowDelete={Boolean($state.currentId)}
      on:select={handleSelect}
      on:create={handleCreate}
      on:delete={handleDelete}
      on:openSync={handleSyncOpen}
    />

    <DashboardBadges
      eventoRows={$badges.evento}
      anfitriaoRows={$badges.anfitriao}
      cerimonialRows={$badges.cerimonial}
      on:open={handleBadgeOpen}
    />

    <DashboardIndicators
      activePanel={$activePanel}
      openPanel={openPanel}
      tarefas={$indicators.tarefas}
      fornecedores={$indicators.fornecedores}
      convidados={$indicators.convidados}
      {projectData}
      syncClient={syncClient}
      bind:tasksHost
      bind:fornecedoresHost
      bind:convidadosHost
      bind:mensagensHost
    />

    <DashboardSummaryPanels
      activePanel={$activePanel}
      openPanel={openPanel}
      getValue={getValue}
      setValue={setValue}
      dateTimeValue={$dateTime}
      setDateTime={setDateTime}
      handleCepInput={handleCepInput}
      handleCepBlur={handleCepBlur}
    />

  </div>
</div>
