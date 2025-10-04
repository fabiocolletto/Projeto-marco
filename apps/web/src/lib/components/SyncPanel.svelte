<script lang="ts">
  import { onDestroy } from 'svelte';
  import { projectData } from '$lib/data/projects';
  import { createSyncClient, type SyncProvider } from '@marco/platform/syncClient';

  const client = createSyncClient({
    baseUrl: (import.meta.env.VITE_SYNC_API_URL as string | undefined) ?? '',
    apiPath: (import.meta.env.VITE_SYNC_API_PATH as string | undefined) ?? '/api',
    graphqlPath: (import.meta.env.VITE_SYNC_GRAPHQL_PATH as string | undefined) ?? '/graphql',
  });

  const status = client.status;

  let phone = '';
  let password = '';
  let provider: SyncProvider = 'google';
  let googleToken = '';
  let microsoftToken = '';
  let busy = false;
  let error: string | null = null;
  let success: string | null = null;
  let snapshots: { id: string; meta: { provider: SyncProvider; projectId: string; hash: string; updatedAt: number; size: number; deviceId: string } }[] = [];

  let currentProjectId: string | null = null;
  const unsubProjectId = projectData.currentId.subscribe((value) => {
    currentProjectId = value;
  });

  onDestroy(() => {
    unsubProjectId();
  });

  async function withBusy<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (busy) return undefined;
    busy = true;
    error = null;
    success = null;
    try {
      const result = await fn();
      return result;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      return undefined;
    } finally {
      busy = false;
    }
  }

  async function applyCredentials() {
    if (!phone || !password) {
      error = 'Informe telefone e senha para derivar a chave.';
      success = null;
      return;
    }
    await withBusy(async () => {
      await client.setCredentials({ phone, password });
      success = 'Credenciais atualizadas com sucesso.';
    });
  }

  async function updateProviderToken(target: SyncProvider) {
    const token = target === 'google' ? googleToken : microsoftToken;
    if (!token) {
      error = 'Informe o access token antes de salvar.';
      success = null;
      return;
    }
    await withBusy(async () => {
      await client.registerProvider(target, { accessToken: token });
      success = `Token do provedor ${target} salvo.`;
    });
  }

  async function handlePush() {
    if (!currentProjectId) {
      error = 'Selecione um evento para sincronizar.';
      success = null;
      return;
    }
    await withBusy(async () => {
      const payload = await projectData.exportProject(currentProjectId);
      await client.pushSnapshot({ provider, projectId: currentProjectId, payload });
      success = 'Snapshot enviado com sucesso.';
      await refreshSnapshots();
    });
  }

  async function handlePull() {
    if (!currentProjectId) {
      error = 'Selecione um evento para restaurar.';
      success = null;
      return;
    }
    await withBusy(async () => {
      const payload = await client.pullSnapshot({ provider, projectId: currentProjectId });
      if (payload) {
        if (typeof payload === 'string') {
          await projectData.importProject(payload);
        } else {
          await projectData.importProject(payload as any);
        }
        success = 'Snapshot restaurado no dispositivo.';
      }
    });
  }

  async function refreshSnapshots() {
    await withBusy(async () => {
      snapshots = await client.listSnapshots(provider);
      if (!snapshots.length) {
        success = 'Nenhum snapshot encontrado para o provedor selecionado.';
      }
    });
  }
</script>

<div class="sync-panel">
  <section class="sync-panel__status">
    <div class="sync-panel__status-line">
      <span class="sync-panel__label">Status</span>
      <strong id="sync_status">{$status.mode}</strong>
    </div>
    <p id="sync_detail">{$status.detail}</p>
    {#if $status.lastError}
      <p class="sync-panel__error">{$status.lastError}</p>
    {/if}
  </section>

  <section class="sync-panel__credentials">
    <h3>Credenciais</h3>
    <div class="sync-panel__grid">
      <label>
        Telefone (11 dígitos)
        <input type="tel" bind:value={phone} placeholder="11999999999" />
      </label>
      <label>
        Senha de sincronização
        <input type="password" bind:value={password} placeholder="••••••" />
      </label>
      <button class="sync-panel__primary" on:click|preventDefault={applyCredentials} disabled={busy}>
        Gerar chave
      </button>
    </div>
  </section>

  <section class="sync-panel__providers">
    <h3>Provedores</h3>
    <div class="sync-panel__grid">
      <label>
        Selecionar provedor
        <select bind:value={provider} disabled={busy}>
          <option value="google">Google Drive</option>
          <option value="microsoft">Microsoft OneDrive</option>
        </select>
      </label>
      <div class="sync-panel__provider-block">
        <label>
          Token Google
          <textarea bind:value={googleToken} rows="2" placeholder="Cole o access token do Google"></textarea>
        </label>
        <button class="sync-panel__secondary" on:click|preventDefault={() => updateProviderToken('google')} disabled={busy}>
          Salvar token Google
        </button>
      </div>
      <div class="sync-panel__provider-block">
        <label>
          Token Microsoft
          <textarea bind:value={microsoftToken} rows="2" placeholder="Cole o access token da Microsoft"></textarea>
        </label>
        <button class="sync-panel__secondary" on:click|preventDefault={() => updateProviderToken('microsoft')} disabled={busy}>
          Salvar token Microsoft
        </button>
      </div>
    </div>
  </section>

  <section class="sync-panel__actions">
    <h3>Ações</h3>
    <div class="sync-panel__grid">
      <button class="sync-panel__primary" on:click|preventDefault={handlePush} disabled={busy || !currentProjectId}>
        Enviar snapshot
      </button>
      <button class="sync-panel__secondary" on:click|preventDefault={handlePull} disabled={busy || !currentProjectId}>
        Restaurar snapshot
      </button>
      <button class="sync-panel__ghost" on:click|preventDefault={refreshSnapshots} disabled={busy}>
        Listar snapshots
      </button>
    </div>
  </section>

  {#if success}
    <p class="sync-panel__success">{success}</p>
  {/if}
  {#if error}
    <p class="sync-panel__error">{error}</p>
  {/if}

  {#if snapshots.length}
    <section class="sync-panel__list">
      <h3>Snapshots recentes</h3>
      <table>
        <thead>
          <tr>
            <th>Projeto</th>
            <th>Provedor</th>
            <th>Hash</th>
            <th>Atualizado</th>
            <th>Tamanho</th>
            <th>Dispositivo</th>
          </tr>
        </thead>
        <tbody>
          {#each snapshots as item}
            <tr>
              <td>{item.meta.projectId}</td>
              <td>{item.meta.provider}</td>
              <td class="mono">{item.meta.hash}</td>
              <td>{new Date(item.meta.updatedAt).toLocaleString()}</td>
              <td>{Math.round(item.meta.size / 1024)} KB</td>
              <td>{item.meta.deviceId}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}
</div>

<style>
  .sync-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sync-panel__grid {
    display: grid;
    gap: 12px;
  }

  .sync-panel__status-line {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .sync-panel__label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--grey-600, #666);
  }

  .sync-panel__status strong {
    font-size: 1.1rem;
  }

  .sync-panel__credentials label,
  .sync-panel__providers label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-weight: 500;
  }

  .sync-panel__provider-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .sync-panel__providers textarea {
    font-family: inherit;
  }

  .sync-panel__primary,
  .sync-panel__secondary,
  .sync-panel__ghost {
    padding: 8px 12px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
  }

  .sync-panel__primary {
    background: var(--brand, #0077ff);
    color: white;
  }

  .sync-panel__secondary {
    background: var(--grey-200, #f0f0f0);
    color: var(--grey-900, #222);
  }

  .sync-panel__ghost {
    background: transparent;
    border: 1px solid var(--grey-300, #d0d0d0);
  }

  .sync-panel__success {
    color: #0a8754;
    font-weight: 500;
  }

  .sync-panel__error {
    color: #d7263d;
    font-weight: 500;
  }

  .sync-panel__list table {
    width: 100%;
    border-collapse: collapse;
  }

  .sync-panel__list th,
  .sync-panel__list td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--grey-300, #d0d0d0);
    text-align: left;
  }

  .sync-panel__list .mono {
    font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    font-size: 0.75rem;
    word-break: break-all;
  }
</style>
