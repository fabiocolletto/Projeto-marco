<script lang="ts">
  let { class: className = '', top, nav, workspace, app, children } = $props();
</script>

<div class={`app-base-layout grid min-h-screen grid-rows-[auto,1fr] bg-surface-muted text-ink ${className}`.trim()}>
  <header class="app-base-layout__top border-b border-surface-muted bg-surface px-6 py-4 shadow-sm">
    {@render top?.()}
  </header>

  <div class="app-base-layout__canvas flex min-h-0 flex-1 overflow-hidden">
    <nav class="app-base-layout__nav w-72 shrink-0 border-r border-surface-muted bg-surface px-4 py-6">
      {@render nav?.()}
    </nav>

    <main class="app-base-layout__workspace flex-1 overflow-hidden bg-surface px-6 py-6">
      {#if workspace}
        {@render workspace()}
      {:else}
        <div class="app-base-layout__app h-full overflow-auto">
          {#if app}
            {@render app()}
          {:else}
            {@render children?.()}
          {/if}
        </div>
      {/if}
    </main>
  </div>
</div>
