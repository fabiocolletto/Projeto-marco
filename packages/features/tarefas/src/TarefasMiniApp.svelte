<script lang="ts">
  import { onMount } from 'svelte';
  import { mountTasksMiniApp } from './controller.js';

  export let ac: any;
  export let store: any;
  export let bus: any;
  export let getCurrentId: () => string | null;

  let host: HTMLDivElement;
  let destroy: (() => void) | undefined;

  onMount(() => {
    const api = mountTasksMiniApp(host, { ac, store, bus, getCurrentId });
    destroy = api?.destroy;
    return () => destroy?.();
  });
</script>

<div class="ac-tarefas" bind:this={host}></div>
