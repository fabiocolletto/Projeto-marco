<svelte:options runes={false} />

<script lang="ts">
  import '../app.css';
  import AppBaseLayout from '$lib/layout/AppBaseLayout.svelte';
  import favicon from '$lib/assets/favicon.svg';
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<AppBaseLayout>
  <svelte:fragment slot="app">
    <slot />
  </svelte:fragment>
</AppBaseLayout>
