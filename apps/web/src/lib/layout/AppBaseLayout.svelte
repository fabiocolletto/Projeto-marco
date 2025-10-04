<svelte:options runes={false} />

<script lang="ts">
  export let className = '';
</script>

<div class={`app-base-layout grid min-h-screen grid-rows-[auto,1fr] bg-surface-muted text-ink ${className}`.trim()}>
  <header class="app-base-layout__top border-b border-surface-muted bg-surface px-6 py-4 shadow-sm">
    <slot name="top" />
  </header>

  <div class="app-base-layout__canvas flex min-h-0 flex-1 overflow-hidden">
    <nav class="app-base-layout__nav w-72 shrink-0 border-r border-surface-muted bg-surface px-4 py-6">
      <slot name="nav" />
    </nav>

    <main class="app-base-layout__workspace flex-1 overflow-hidden bg-surface px-6 py-6">
      <slot name="workspace">
        <div class="app-base-layout__app h-full overflow-auto">
          <slot name="app">
            <slot />
          </slot>
        </div>
      </slot>
    </main>
  </div>
</div>
