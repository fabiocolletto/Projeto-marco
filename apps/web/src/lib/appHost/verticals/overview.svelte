<script lang="ts">
  import Placeholder from './placeholder.svelte';

  export let id: string;
  export let label: string;
  export let icon: string;
</script>

<Placeholder {id} {label} {icon}>
  <svelte:fragment slot="description">
    <p>
      Bem-vindo ao hub de verticais. Escolha uma opção na navegação lateral para carregar o mini-app correspondente.
    </p>
  </svelte:fragment>
</Placeholder>
