<script lang="ts">
  import SyncPanel from './SyncPanel.svelte';
</script>

<section class="card" id="cardIndicadores">
  <h2>Indicadores do evento</h2>
  <div class="mini-grid">
    <div class="mini kpi" id="kpi_tasks">
      <div class="label"><h3 class="title" id="kpi_task_title">Tarefas</h3></div>
      <div class="actions">
        <button class="edit-btn" data-open="#secTarefas" aria-label="Editar tarefas" title="Abrir painel de tarefas">✎</button>
      </div>
      <div class="progress progress--lg">
        <div class="progress__track"><div id="kpi_task_bar" class="progress__bar" style="width:0%"></div></div>
      </div>
      <div class="hbar-legend">
        <span id="kpi_task_lbl1">0 concluídas — 0%</span><span id="kpi_task_lbl2">Total: 0</span>
      </div>
    </div>

    <div class="mini kpi" id="kpi_for">
      <div class="label"><h3 class="title" id="kpi_for_title">Fornecedores</h3></div>
      <div class="actions">
        <button class="edit-btn" data-open="#secFornecedores" aria-label="Editar fornecedores" title="Abrir painel de fornecedores">✎</button>
      </div>
      <div class="progress progress--lg">
        <div class="progress__track"><div id="kpi_for_bar" class="progress__bar" style="width:0%"></div></div>
      </div>
      <div class="hbar-legend">
        <span id="kpi_for_lbl1">R$ 0,00 pagos — 0%</span><span id="kpi_for_lbl2">Total: R$ 0,00</span>
      </div>
    </div>

    <div class="mini kpi" id="kpi_guests">
      <div class="label"><h3 class="title" id="kpi_guest_title">Convidados &amp; Convites</h3></div>
      <div class="actions">
        <button class="edit-btn" data-open="#secConvidados" aria-label="Editar convidados" title="Abrir painel de convidados">✎</button>
      </div>
      <div class="progress progress--lg">
        <div class="progress__track"><div id="kpi_guest_bar" class="progress__bar" style="width:0%"></div></div>
      </div>
      <div class="hbar-legend">
        <span id="kpi_guest_lbl1">0 confirmados — 0%</span><span id="kpi_guest_lbl2">Total: 0</span>
      </div>
      <div class="progress progress--lg progress--segments" aria-label="Distribuição por mesas/grupos">
        <div class="progress__track" id="kpi_guest_bands"></div>
      </div>
      <div class="small muted" id="kpi_guest_legend"></div>
    </div>
  </div>

  <details id="secTarefas">
    <summary>Tarefas</summary>
    <div class="details-wrap">
      <div id="tasks_host"></div>
      <div class="close-hint">Pressione <strong>Esc</strong> ou clique no lápis novamente para fechar.</div>
    </div>
  </details>

  <details id="secFornecedores">
    <summary>Fornecedores</summary>
    <div class="details-wrap">
      <div id="fornecedores_host"></div>
      <div class="close-hint">Pressione <strong>Esc</strong> ou clique no lápis novamente para fechar.</div>
    </div>
  </details>

  <details id="secConvidados">
    <summary>Convidados &amp; Convites</summary>
    <div class="details-wrap">
      <div id="convidados_host"></div>
      <div class="close-hint">Pressione <strong>Esc</strong> ou clique no lápis novamente para fechar.</div>
    </div>
  </details>

  <details id="secSync">
    <summary>Sincronização</summary>
    <div class="details-wrap">
      <div id="sync_host">
        <SyncPanel />
      </div>
      <div class="close-hint">Pressione <strong>Esc</strong> ou clique no lápis novamente para fechar.</div>
    </div>
  </details>
</section>
