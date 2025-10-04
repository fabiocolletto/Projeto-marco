<script lang="ts">
  import { createEventDispatcher, onMount, setContext } from 'svelte';
  import type { ComponentType } from 'svelte';
  import { get } from 'svelte/store';
  import AppBaseLayout from '$lib/layout/AppBaseLayout.svelte';
  import { projectData } from '$lib/data/projects';
  import { bus } from '@marco/platform/bus';
  import manifestDefault, {
    manifestList as defaultManifestList,
    type AppManifest,
    type AppManifestEntry,
    type AppId
  } from './manifest';

  const PROJECT_DATA_CONTEXT = Symbol('appHost:projectData');
  const BUS_CONTEXT = Symbol('appHost:bus');
  const AC_CONTEXT = Symbol('appHost:ac');

  export { PROJECT_DATA_CONTEXT, BUS_CONTEXT, AC_CONTEXT };

  export let manifest: AppManifest = manifestDefault;
  export let appId: AppId | null = null;

  const dispatch = createEventDispatcher<{ select: { id: AppId } }>();

  let manifestList: AppManifestEntry[] = defaultManifestList.map((entry) => manifest[entry.id] ?? entry);
  $: manifestList = defaultManifestList.map((entry) => manifest[entry.id] ?? entry);

  let activeId: AppId | null = null;
  let component: ComponentType | null = null;
  let componentProps: Record<string, unknown> = {};
  let loading = false;
  let error: Error | null = null;
  const cache = new Map<AppId, ComponentType>();
  let acModule: any = null;
  let token = 0;

  setContext(PROJECT_DATA_CONTEXT, projectData);
  setContext(BUS_CONTEXT, bus);
  setContext(AC_CONTEXT, async () => ensureAc());

  onMount(() => {
    projectData.init().catch((err) => console.error('[AppHost] Falha ao inicializar dados do projeto', err));
  });

  $: {
    const incoming = appId && manifest[appId] ? appId : null;
    if (incoming && incoming !== activeId) {
      activeId = incoming;
    }
  }

  $: if (!activeId) {
    const first = manifestList[0];
    activeId = first?.id ?? null;
  }

  $: if (activeId) {
    void loadApp(activeId);
  } else {
    component = null;
    error = null;
  }

  async function ensureAc(): Promise<any> {
    if (acModule) return acModule;
    const mod = await import('@marco/domain-eventos');
    acModule = mod?.default ?? mod;
    return acModule;
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
      props.ac = acModule;
    }

    return props;
  }

  async function loadApp(id: AppId): Promise<void> {
    const entry = manifest[id];
    if (!entry) {
      component = null;
      error = new Error(`Vertical desconhecida: ${id}`);
      return;
    }

    const currentToken = ++token;

    if (cache.has(id)) {
      component = cache.get(id) ?? null;
      componentProps = resolveProps(entry);
      return;
    }

    loading = true;
    error = null;

    try {
      if (entry.requires.includes('projectData')) {
        await projectData.init();
        if (currentToken !== token) return;
      }

      if (entry.requires.includes('ac') && !acModule) {
        await ensureAc();
        if (currentToken !== token) return;
      }

      const module = await import(/* @vite-ignore */ entry.loader);
      if (currentToken !== token) return;
      const candidate: ComponentType | undefined = module?.default ?? Object.values(module).find((value) => typeof value === 'function') as ComponentType | undefined;
      if (!candidate) {
        throw new Error(`Loader para ${id} não exporta um componente Svelte padrão.`);
      }
      cache.set(id, candidate);
      component = candidate;
      componentProps = resolveProps(entry);
    } catch (err) {
      const reason = err instanceof Error ? err : new Error(String(err));
      console.error('[AppHost] Falha ao carregar vertical', id, reason);
      error = reason;
      component = null;
    } finally {
      if (currentToken === token) {
        loading = false;
      }
    }
  }

  function handleSelect(id: AppId): void {
    if (id === activeId) return;
    activeId = id;
    dispatch('select', { id });
    void loadApp(id);
  }
</script>

<svelte:head>
  <title>Gerenciar Eventos — Hub de Verticais</title>
</svelte:head>

<AppBaseLayout
  class="app-host"
  top={() => (
    <div class="app-host__header">
      <div>
        <h1>Gestão de eventos</h1>
        <p>Selecione um mini-app para continuar.</p>
      </div>
    </div>
  )}
  nav={() => (
    <ul class="app-host__nav">
      {#each manifestList as entry (entry.id)}
        <li>
          <button
            type="button"
            class:active={entry.id === activeId}
            on:click={() => handleSelect(entry.id)}
          >
            <span class="icon" aria-hidden="true">{entry.icon}</span>
            <span class="label">{entry.label}</span>
          </button>
        </li>
      {/each}
    </ul>
  )}
  app={() => (
    <div class="app-host__canvas">
      {#if loading}
        <p class="app-host__status">Carregando {activeId ? manifest[activeId]?.label : 'mini-app'}…</p>
      {:else if error}
        <div class="app-host__error" role="alert">
          <strong>Erro ao carregar módulo.</strong>
          <pre>{error.message}</pre>
        </div>
      {:else if component}
        <svelte:component this={component} {...componentProps} />
      {:else}
        <p class="app-host__status">Selecione uma vertical para iniciar.</p>
      {/if}
    </div>
  )}
/>

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
    min-height: 360px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .app-host__status {
    font-size: 0.95rem;
    color: rgba(15, 23, 42, 0.7);
  }
  .app-host__error {
    border-radius: 1rem;
    padding: 1.25rem;
    background: rgba(248, 113, 113, 0.12);
    color: #b91c1c;
    max-width: 480px;
  }
  .app-host__error pre {
    margin: 0.5rem 0 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
