<script lang="ts">
  export let id: string;
  export let label: string;
  export let icon: string;
</script>

<section class="app-placeholder">
  <div class="app-placeholder__icon" aria-hidden="true">{icon}</div>
  <h2 class="app-placeholder__title">{label}</h2>
  <div class="app-placeholder__description">
    <slot name="description">
      O módulo <strong>{id}</strong> ainda não possui uma implementação dedicada neste ambiente.
    </slot>
  </div>
</section>

<style>
  .app-placeholder {
    display: grid;
    gap: 1rem;
    place-items: center;
    text-align: center;
    padding: 2rem;
    border-radius: 1.5rem;
    background: var(--surface, #ffffff);
    color: var(--ink, #0f172a);
    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
  }
  .app-placeholder__icon {
    font-size: 2.5rem;
  }
  .app-placeholder__title {
    font-size: 1.5rem;
    font-weight: 600;
  }
  .app-placeholder__description {
    font-size: 0.95rem;
    line-height: 1.6;
    color: rgba(15, 23, 42, 0.7);
  }
</style>
