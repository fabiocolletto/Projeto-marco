<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ProjectMeta } from '@ac/data/projectStore';

  export interface SyncStatus {
    status: string;
    detail: string;
    active: boolean;
  }

  export let title = '—';
  export let updatedAt = '—';
  export let usingFallback = false;
  export let metas: ProjectMeta[] = [];
  export let currentId: string | null = null;
  export let chips: { ready: boolean; dirty: boolean; saving: boolean } = {
    ready: true,
    dirty: false,
    saving: false,
  };
  export let sync: SyncStatus = { status: 'Desativado', detail: '—', active: false };
  export let allowDelete = false;

  const dispatch = createEventDispatcher<{
    select: { id: string | null };
    create: void;
    delete: void;
    openSync: void;
  }>();

  const handleSelect = (event: Event): void => {
    const target = event.currentTarget as HTMLSelectElement | null;
    const value = target?.value || '';
    dispatch('select', { id: value || null });
  };

  const handleCreate = (): void => {
    dispatch('create');
  };

  const handleDelete = (): void => {
    dispatch('delete');
  };

  const handleOpenSync = (): void => {
    dispatch('openSync');
  };
</script>

<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
  <div class="space-y-2">
    <h1 class="text-3xl font-semibold text-brand">Gestão de eventos</h1>
    <h2 id="evTitle" class="text-xl font-semibold text-ink">{title || '—'}</h2>
    <div class="flex flex-wrap items-center gap-2 text-sm text-ink-muted" id="updatedWrap">
      <span>
        Atualizado: <span id="updatedAt">{updatedAt || '—'}</span>
      </span>
      {#if usingFallback}
        <span id="storageWarn" class="chip chip--warning">Modo temporário (sem persistência)</span>
      {/if}
    </div>
  </div>

  <div class="w-full space-y-3 lg:max-w-md">
    <div class="space-y-1">
      <label class="text-xs font-medium text-ink-muted" for="switchEvent">Selecionar evento</label>
      <select
        id="switchEvent"
        class="form-select w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
        on:change={handleSelect}
        bind:value={currentId}
      >
        {#if !metas.length}
          <option value="" disabled selected>Sem eventos cadastrados</option>
        {/if}
        {#each metas as meta}
          <option value={meta.id}>{meta.nome || meta.id}</option>
        {/each}
      </select>
    </div>

    <div class="flex flex-wrap items-center gap-2" id="hdrControlsRow">
      <button
        id="btnNew"
        class="rounded-xl border border-brand/20 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        type="button"
        on:click={handleCreate}
      >
        Novo evento
      </button>
      <button
        id="btnDelete"
        class="rounded-xl border border-danger/20 bg-danger/5 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        disabled={!allowDelete}
        on:click={handleDelete}
      >
        Excluir
      </button>
      <span id="chipReady" class="chip chip--success" hidden={!chips.ready || chips.saving || chips.dirty}>Pronto</span>
      <span id="chipDirty" class="chip chip--warning" hidden={!chips.dirty || chips.saving}>Edição não salva</span>
      <span id="chipSaving" class="chip chip--info" hidden={!chips.saving}>Salvando…</span>

      <div class="flex flex-col gap-1 rounded-xl bg-surface-muted/80 px-3 py-2 text-sm" id="hdr_sync_wrap">
        <span class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Sincronização</span>
        <div
          class={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 shadow-inner transition ${
            sync.active ? 'bg-brand/10 ring-1 ring-brand/50' : 'bg-surface'
          }`}
          id="hdr_sync_badge"
        >
          <span id="hdr_sync_status" class="font-semibold text-ink">{sync.status}</span>
          <button
            class="rounded-md border border-transparent bg-brand/10 px-2 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            data-open="sync"
            aria-label="Abrir painel de sincronização"
            title="Abrir painel de sincronização"
            on:click={handleOpenSync}
            type="button"
          >
            Ajustar
          </button>
        </div>
        <span id="hdr_sync_detail" class="text-xs text-ink-muted">{sync.detail}</span>
      </div>
    </div>
  </div>
</div>
