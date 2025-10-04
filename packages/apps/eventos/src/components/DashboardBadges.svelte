<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PanelId } from '../stores/ui';

  export type BadgeRow = [string, string];

  export let eventoRows: BadgeRow[] = [];
  export let anfitriaoRows: BadgeRow[] = [];
  export let cerimonialRows: BadgeRow[] = [];

  const dispatch = createEventDispatcher<{ open: { panel: PanelId } }>();

  const open = (panel: PanelId) => () => dispatch('open', { panel });
</script>

<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Resumo do evento">
  <article class="relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm" id="badgeEvento">
    <div class="flex items-start justify-between gap-2">
      <h3 class="text-lg font-semibold text-ink">Evento</h3>
      <button
        class="rounded-lg border border-transparent bg-brand/10 px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        data-open="evento"
        aria-label="Editar evento"
        on:click={open('evento')}
        type="button"
      >
        Editar
      </button>
    </div>
    <dl class="grid gap-2 text-sm text-ink-muted" id="kvEvento">
      {#if eventoRows.length}
        {#each eventoRows as [label, value]}
          <div class="grid gap-1">
            <dt class="font-semibold text-ink/80">{label}</dt>
            <dd>{value}</dd>
          </div>
        {/each}
      {:else}
        <p class="text-xs text-ink-muted/70">Sem informações registradas.</p>
      {/if}
    </dl>
  </article>

  <article class="relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm" id="badgeAnfitriao">
    <div class="flex items-start justify-between gap-2">
      <h3 class="text-lg font-semibold text-ink">Anfitrião</h3>
      <button
        class="rounded-lg border border-transparent bg-brand/10 px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        data-open="anfitriao"
        aria-label="Editar anfitrião"
        on:click={open('anfitriao')}
        type="button"
      >
        Editar
      </button>
    </div>
    <dl class="grid gap-2 text-sm text-ink-muted" id="kvAnfitriao">
      {#if anfitriaoRows.length}
        {#each anfitriaoRows as [label, value]}
          <div class="grid gap-1">
            <dt class="font-semibold text-ink/80">{label}</dt>
            <dd>{value}</dd>
          </div>
        {/each}
      {:else}
        <p class="text-xs text-ink-muted/70">Sem informações registradas.</p>
      {/if}
    </dl>
  </article>

  <article class="relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm" id="badgeCerimonial">
    <div class="flex items-start justify-between gap-2">
      <h3 class="text-lg font-semibold text-ink">Cerimonialista</h3>
      <button
        class="rounded-lg border border-transparent bg-brand/10 px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        data-open="cerimonial"
        aria-label="Editar cerimonialista"
        on:click={open('cerimonial')}
        type="button"
      >
        Editar
      </button>
    </div>
    <dl class="grid gap-2 text-sm text-ink-muted" id="kvCerimonial">
      {#if cerimonialRows.length}
        {#each cerimonialRows as [label, value]}
          <div class="grid gap-1">
            <dt class="font-semibold text-ink/80">{label}</dt>
            <dd>{value}</dd>
          </div>
        {/each}
      {:else}
        <p class="text-xs text-ink-muted/70">Sem informações registradas.</p>
      {/if}
    </dl>
  </article>
</div>
