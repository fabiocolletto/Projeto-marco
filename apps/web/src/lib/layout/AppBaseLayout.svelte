<script lang="ts">
  let { class: className = '', top, nav, workspace, app, children } = $props();
</script>

<div class={`app-base-layout grid min-h-screen grid-rows-[auto,1fr] bg-surface-muted text-ink ${className}`.trim()}>
  <header class="app-base-layout__top border-b border-surface-muted bg-surface px-4 py-4 shadow-sm sm:px-6">
    {@render top?.()}
  </header>

  <div class="app-base-layout__canvas flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
    <nav
      class="
        app-base-layout__nav
        w-full shrink-0 overflow-x-auto border-b border-surface-muted bg-surface px-4 py-5
        lg:w-72 lg:border-b-0 lg:border-r lg:overflow-y-auto
      "
    >
      {@render nav?.()}
    </nav>

    <main class="app-base-layout__workspace flex-1 min-h-0 overflow-hidden bg-surface px-4 py-6 sm:px-6">
      {#if workspace}
        {@render workspace()}
      {:else}
        <div class="app-base-layout__app h-full min-h-0 overflow-auto">
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
