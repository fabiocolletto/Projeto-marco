<script lang="ts">
  import { onMount } from 'svelte';
  import DashboardHeader from '$lib/components/DashboardHeader.svelte';
  import DashboardBadges from '$lib/components/DashboardBadges.svelte';
  import DashboardSummaryPanels from '$lib/components/DashboardSummaryPanels.svelte';
  import DashboardIndicators from '$lib/components/DashboardIndicators.svelte';
  import DashboardNavigation from '$lib/components/DashboardNavigation.svelte';
  import OnboardingWizard from '$lib/components/OnboardingWizard.svelte';
  import { activePanel } from '$lib/stores/ui';
  import { initDashboard } from '$lib/dashboard/initDashboard';

  onMount(() => {
    initDashboard();
  });
</script>

<svelte:head>
  <title>Gerenciar Eventos — AC (v2) + Mini‑Apps (fallback Safari)</title>
</svelte:head>

<main class="min-h-screen bg-surface-muted">
  <div class="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10">
    <DashboardHeader />

    <div class="grid gap-6 lg:grid-cols-[280px,1fr]">
      <DashboardNavigation />

      <div class="flex flex-col gap-6">
        <section
          class="card space-y-6"
          id="panel-overview-summary"
          data-panel="overview"
          hidden={$activePanel !== 'overview'}
        >
          <div class="flex flex-col gap-2">
            <h2 class="text-xl font-semibold text-ink">Resumo rápido</h2>
            <p class="text-sm text-ink-muted">
              Informações principais do evento atualizadas em tempo real.
            </p>
          </div>
          <DashboardBadges />
        </section>

        <DashboardSummaryPanels />
        <DashboardIndicators />
      </div>
    </div>
  </div>

  <OnboardingWizard />
</main>
