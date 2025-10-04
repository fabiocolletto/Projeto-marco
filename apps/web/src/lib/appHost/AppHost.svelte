<svelte:options runes={true} />

<script lang="ts">
  import { createEventDispatcher, onMount, setContext, type ComponentType } from 'svelte';
  import { get } from 'svelte/store';
  import MiniAppBase from '$lib/components/miniAppBase/MiniAppBase.svelte';
  import AppBaseLayout from '$lib/layout/AppBaseLayout.svelte';
  import { projectData } from '$lib/data/projects';
  import { bus } from '@marco/platform/bus';
  import manifestDefault, { manifestList as defaultManifestList } from './manifest';
  import type { AppManifestEntry, AppId } from './manifest';
  import { loadVertical, mergeManifest, resolveActiveId } from './logic.js';

  const PROJECT_DATA_CONTEXT = Symbol('appHost:projectData');
  const BUS_CONTEXT = Symbol('appHost:bus');
  const AC_CONTEXT = Symbol('appHost:ac');

  export { PROJECT_DATA_CONTEXT, BUS_CONTEXT, AC_CONTEXT };

  let { manifest = manifestDefault, appId = null } = $props();

  const dispatch = createEventDispatcher<{ select: { id: AppId } }>();

  const manifestState = $derived(mergeManifest(defaultManifestList, manifest ?? manifestDefault));
  const manifestList = $derived($manifestState.list);
  const manifestMap = $derived($manifestState.map);

  const activeId = $state<AppId | null>(null);
  const component = $state<ComponentType | null>(null);
  const componentProps = $state<Record<string, unknown>>({});
  const loading = $state(false);
  const error = $state<Error | null>(null);
  const cache = new Map<AppId, ComponentType>();
  const acModule = $state<unknown>(null);
  const token = $state(0);

  setContext(PROJECT_DATA_CONTEXT, projectData);
  setContext(BUS_CONTEXT, bus);
  setContext(AC_CONTEXT, async () => ensureAc());

  onMount(() => {
    projectData.init().catch((err) => console.error('[AppHost] Falha ao inicializar dados do projeto', err));
  });

  $effect(() => {
    const incoming = resolveActiveId(appId ?? null, $manifestMap, $manifestList);
    if (incoming !== $activeId) {
      $activeId = incoming;
    }
  });

  $effect(() => {
    if ($activeId) return;
    const first = $manifestList[0];
    if (first) {
      $activeId = first.id;
    }
  });

  $effect(() => {
    const id = $activeId;
    if (id) {
      void loadApp(id);
    } else {
      $component = null;
      $componentProps = {};
      $error = null;
    }
  });

  async function ensureAc(): Promise<unknown> {
    if ($acModule) return $acModule;
    const mod = await import('@marco/domain-eventos');
    $acModule = mod?.default ?? mod;
    return $acModule;
  }

  function resolveProps(entry: AppManifestEntry): Record<string, unknown> {
    const props: Record<string, unknown> = {
      id: entry.id,
      label: entry.label,
      icon: entry.icon
    };

    if (entry.requires.includes('projectData')) {
      props.projectData = projectData;
      const store = projectData.raw();
      if (store) {
        props.store = store;
        props.projectStore = store;
      }
      props.getCurrentId = () => get(projectData.currentId);
    }

    if (entry.requires.includes('bus')) {
      props.bus = bus;
    }

    if (entry.requires.includes('ac')) {
      props.ac = $acModule;
    }

    return props;
  }

  async function loadApp(id: AppId): Promise<void> {
    const entry = $manifestMap[id];
    if (!entry) {
      $component = null;
      $componentProps = {};
      $error = new Error(`Vertical desconhecida: ${id}`);
      return;
    }

    $token += 1;
    const currentToken = $token;

    if (cache.has(id)) {
      $component = cache.get(id) ?? null;
      $componentProps = resolveProps(entry);
      return;
    }

    $loading = true;
    $error = null;

    try {
      if (entry.requires.includes('projectData')) {
        await projectData.init();
        if (currentToken !== $token) return;
      }

      if (entry.requires.includes('ac') && !$acModule) {
        await ensureAc();
        if (currentToken !== $token) return;
      }

      const candidate = await loadVertical(entry, (loader) => import(/* @vite-ignore */ loader));
      if (currentToken !== $token) return;
      cache.set(id, candidate as ComponentType);
      $component = candidate as ComponentType;
      $componentProps = resolveProps(entry);
    } catch (err) {
      const reason = err instanceof Error ? err : new Error(String(err));
      console.error('[AppHost] Falha ao carregar vertical', id, reason);
      $error = reason;
      $component = null;
    } finally {
      if (currentToken === $token) {
        $loading = false;
      }
    }
  }

  function handleSelect(id: AppId): void {
    if (id === $activeId) return;
    $activeId = id;
    dispatch('select', { id });
    void loadApp(id);
  }
</script>

<svelte:head>
  <title>Gerenciar Eventos — Hub de Verticais</title>
</svelte:head>

<AppBaseLayout class="app-host">
  <svelte:fragment slot="top">
    <div class="app-host__header">
      <div>
        <h1>Gestão de eventos</h1>
        <p>Selecione um mini-app para continuar.</p>
      </div>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="nav">
    <ul class="app-host__nav">
      {#each $manifestList as entry (entry.id)}
        <li>
          <button
            type="button"
            class:active={entry.id === $activeId}
            onclick={() => handleSelect(entry.id)}
          >
            <span class="icon" aria-hidden="true">{entry.icon}</span>
            <span class="label">{entry.label}</span>
          </button>
        </li>
      {/each}
    </ul>
  </svelte:fragment>

  <svelte:fragment slot="app">
    <div class="app-host__canvas">
      <div class="app-host__workspace">
        <MiniAppBase class="app-host__miniapp-base" />
        {#if $loading}
          <div class="app-host__stage app-host__stage--status">
            <p class="app-host__status">Carregando {$activeId ? $manifestMap[$activeId]?.label : 'mini-app'}…</p>
          </div>
        {:else if $error}
          <div class="app-host__stage app-host__stage--status">
            <div class="app-host__error" role="alert">
              <strong>Erro ao carregar módulo.</strong>
              <pre>{$error.message}</pre>
            </div>
          </div>
        {:else if $component}
          <div class="app-host__stage app-host__stage--component">
            {@render $component?.($componentProps)}
          </div>
        {:else}
          <div class="app-host__stage app-host__stage--placeholder">
            <div class="app-host__stage-placeholder">
              <h2>Tela inicial dos mini apps</h2>
              <p>Escolha uma vertical na navegação lateral para começar.</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </svelte:fragment>
</AppBaseLayout>

<style>
  .app-host__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .app-host__header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }
  .app-host__header p {
    margin: 0.25rem 0 0;
    color: rgba(15, 23, 42, 0.72);
  }
  .app-host__nav {
    display: grid;
    gap: 0.5rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .app-host__nav button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
  }
  .app-host__nav button:hover,
  .app-host__nav button:focus-visible {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.35);
    outline: none;
  }
  .app-host__nav button.active {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.5);
  }
  .app-host__nav .icon {
    font-size: 1.25rem;
    line-height: 1;
  }
  .app-host__canvas {
    position: relative;
    min-height: 480px;
    display: flex;
    justify-content: center;
    padding: 3rem 2.5rem 2.5rem;
  }
  .app-host__workspace {
    position: relative;
    flex: 1;
    max-width: 960px;
    border-radius: 2rem;
    background: rgb(var(--color-surface));
    color: rgb(var(--color-ink));
    padding: 3.5rem 2.75rem 2.75rem;
    box-shadow: 0 25px 50px -24px rgba(15, 23, 42, 0.35);
    border: 1px solid rgba(15, 23, 42, 0.08);
    display: flex;
  }
  :global(.app-host__miniapp-base) {
    position: absolute;
    top: 2rem;
    right: 2rem;
    width: min(320px, 32%);
    z-index: 2;
  }
  .app-host__stage {
    flex: 1;
    min-height: 320px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .app-host__stage--status {
    padding: 2rem 1.5rem;
  }
  .app-host__stage--placeholder {
    padding: 2rem 1.5rem;
  }
  .app-host__stage--component {
    align-items: stretch;
    justify-content: flex-start;
    text-align: initial;
  }
  .app-host__stage--component :global(> *) {
    flex: 1;
    min-width: 0;
  }
  .app-host__stage-placeholder {
    display: grid;
    gap: 0.75rem;
  }
  .app-host__stage-placeholder h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
  .app-host__stage-placeholder p {
    margin: 0;
    font-size: 1rem;
    color: rgba(15, 23, 42, 0.65);
  }
  .app-host__status {
    font-size: 0.95rem;
    color: rgba(15, 23, 42, 0.7);
  }
  .app-host__error {
    width: min(100%, 520px);
    border-radius: 1.5rem;
    padding: 1.75rem;
    background: rgba(248, 113, 113, 0.12);
    color: #b91c1c;
    box-shadow: inset 0 0 0 1px rgba(185, 28, 28, 0.18);
    text-align: left;
  }
  .app-host__error pre {
    margin: 0.75rem 0 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
  @media (max-width: 1024px) {
    .app-host__canvas {
      padding: 1.75rem 1.25rem;
    }
    .app-host__workspace {
      padding: 2.5rem 1.75rem 1.75rem;
      border-radius: 1.5rem;
    }
    :global(.app-host__miniapp-base) {
      position: static;
      width: 100%;
      margin-bottom: 1.5rem;
    }
  }
  @media (max-width: 640px) {
    .app-host__stage {
      min-height: 260px;
    }
    .app-host__stage-placeholder h2 {
      font-size: 1.25rem;
    }
  }
</style>
