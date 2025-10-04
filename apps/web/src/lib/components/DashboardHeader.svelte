<div class="row" style="align-items:flex-start; gap:16px">
  <div>
    <h1 class="app-title">Gestão de eventos</h1>
    <h2 id="evTitle">—</h2>
    <div class="small muted" id="updatedWrap">
      Atualizado: <span id="updatedAt">—</span>
      <span id="storageWarn" class="pill pillwarn" style="display:none;margin-left:8px">Modo temporário (sem persistência)</span>
    </div>
  </div>

  <div class="select-block" style="margin-left:auto; min-width:min(520px, 100%)">
    <label class="small" for="switchEvent">Selecionar evento</label>
    <select id="switchEvent"></select>

    <div class="row" id="hdrControlsRow" style="align-items:center; gap:8px; flex-wrap:wrap">
      <button id="btnNew" class="btn btn--ghost" type="button">Novo</button>
      <button id="btnDelete" class="btn btn--ghost danger" type="button">Excluir</button>
      <span id="chipReady" class="pill pillok">Pronto</span>
      <span id="chipDirty" class="pill pillwarn" style="display:none">Edição não salva</span>
      <span id="chipSaving" class="pill pillsaving" style="display:none">Salvando…</span>

      <div class="hdr-sync" id="hdr_sync_wrap">
        <span class="small-label">Sincronização</span>
        <div class="badge" id="hdr_sync_badge">
          <span id="hdr_sync_status">Desativado</span>
          <button
            class="edit-btn"
            data-open="#secSync"
            aria-label="Abrir painel de sincronização"
            title="Abrir painel de sincronização"
          >
            ✎
          </button>
        </div>
        <span id="hdr_sync_detail" class="small muted">—</span>
      </div>
    </div>
  </div>
</div>
