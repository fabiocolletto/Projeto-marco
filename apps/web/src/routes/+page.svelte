<script lang="ts">
  import { onMount } from 'svelte';
  import DashboardHeader from '$lib/components/DashboardHeader.svelte';
  import DashboardBadges from '$lib/components/DashboardBadges.svelte';
  import DashboardSummaryPanels from '$lib/components/DashboardSummaryPanels.svelte';
  import DashboardIndicators from '$lib/components/DashboardIndicators.svelte';
  import { initDashboard } from '$lib/dashboard/initDashboard';

  onMount(() => {
    initDashboard();
  });
</script>

<svelte:head>
  <title>Gerenciar Eventos — AC (v2) + Mini‑Apps (fallback Safari)</title>
</svelte:head>

<main class="ac">
  <div class="container">
    <section class="card" id="cardResumo">
      <DashboardHeader />
      <DashboardBadges />
      <DashboardSummaryPanels />
    </section>

    <DashboardIndicators />
  </div>
</main>
