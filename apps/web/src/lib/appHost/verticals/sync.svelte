<script lang="ts">
  import Placeholder from './placeholder.svelte';

  export let id: string;
  export let label: string;
  export let icon: string;
</script>

<Placeholder {id} {label} {icon}>
  <svelte:fragment slot="description">
    <p>
      A central de sincronização será carregada aqui quando disponível. Enquanto isso, continue utilizando os recursos locais.
    </p>
  </svelte:fragment>
</Placeholder>
