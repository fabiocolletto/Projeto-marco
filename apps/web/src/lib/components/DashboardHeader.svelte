<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
  <div class="space-y-2">
    <h1 class="text-3xl font-semibold text-brand">Gestão de eventos</h1>
    <h2 id="evTitle" class="text-xl font-semibold text-ink">—</h2>
    <div class="flex flex-wrap items-center gap-2 text-sm text-ink-muted" id="updatedWrap">
      <span>
        Atualizado: <span id="updatedAt">—</span>
      </span>
      <span id="storageWarn" class="chip chip--warning" style="display:none">Modo temporário (sem persistência)</span>
    </div>
  </div>

  <div class="w-full space-y-3 lg:max-w-md">
    <div class="space-y-1">
      <label class="text-xs font-medium text-ink-muted" for="switchEvent">Selecionar evento</label>
      <select
        id="switchEvent"
        class="form-select w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
      ></select>
    </div>

    <div class="flex flex-wrap items-center gap-2" id="hdrControlsRow">
      <button
        id="btnNew"
        class="rounded-xl border border-brand/20 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        type="button"
      >
        Novo evento
      </button>
      <button
        id="btnDelete"
        class="rounded-xl border border-danger/20 bg-danger/5 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
        type="button"
      >
        Excluir
      </button>
      <span id="chipReady" class="chip chip--success">Pronto</span>
      <span id="chipDirty" class="chip chip--warning" style="display:none">Edição não salva</span>
      <span id="chipSaving" class="chip chip--info" style="display:none">Salvando…</span>

      <div class="flex flex-col gap-1 rounded-xl bg-surface-muted/80 px-3 py-2 text-sm" id="hdr_sync_wrap">
        <span class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Sincronização</span>
        <div class="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2 shadow-inner" id="hdr_sync_badge">
          <span id="hdr_sync_status" class="font-semibold text-ink">Desativado</span>
          <button
            class="rounded-md border border-transparent bg-brand/10 px-2 py-1 text-xs font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            data-open="sync"
            aria-label="Abrir painel de sincronização"
            title="Abrir painel de sincronização"
          >
            Ajustar
          </button>
        </div>
        <span id="hdr_sync_detail" class="text-xs text-ink-muted">—</span>
      </div>
    </div>
  </div>
</div>
