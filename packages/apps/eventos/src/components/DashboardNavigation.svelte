<script lang="ts">
  import { activePanel, openPanel, panelDefinitions } from '../stores/ui';
  import type { PanelId } from '../stores/ui';

  const selectPanel = (panel: PanelId) => () => openPanel(panel);
</script>

<nav
  aria-label="Seções do dashboard"
  class="card flex gap-2 overflow-x-auto bg-surface p-3 lg:flex-col lg:overflow-visible lg:p-4"
>
  {#each panelDefinitions as panel}
    {#if panel.id !== 'overview'}
      <button
        type="button"
        data-open={panel.id}
        class={`group flex min-w-[200px] flex-1 flex-col gap-1 rounded-xl px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 lg:min-w-0 ${
          $activePanel === panel.id
            ? 'bg-brand/5 ring-1 ring-brand/40'
            : 'hover:bg-surface-muted'
        }`}
        aria-current={$activePanel === panel.id ? 'page' : undefined}
        on:click={selectPanel(panel.id)}
      >
        <span class="flex items-center gap-2 text-sm font-semibold text-ink">
          <span aria-hidden="true">{panel.icon}</span>
          {panel.label}
        </span>
        <span class="text-xs text-ink-muted/80">{panel.description}</span>
      </button>
    {:else}
      <button
        type="button"
        class={`group flex min-w-[200px] flex-1 flex-col gap-1 rounded-xl px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 lg:min-w-0 ${
          $activePanel === 'overview'
            ? 'bg-brand text-brand-foreground shadow-inner'
            : 'bg-surface-muted text-ink hover:bg-brand/10'
        }`}
        data-open="overview"
        aria-current={$activePanel === 'overview' ? 'page' : undefined}
        on:click={selectPanel('overview')}
      >
        <span class="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden="true">{panel.icon}</span>
          {panel.label}
        </span>
        <span class="text-xs opacity-80">{panel.description}</span>
      </button>
    {/if}
  {/each}
</nav>
