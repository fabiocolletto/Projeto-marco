<svelte:options runes={false} />

<script lang="ts">
  import { userProfile } from '$lib/data/userProfile';
  import type { UserProfileState } from '$lib/data/userProfile';

  export let className = '';

  const formatValue = (value: string) => (value?.trim() ? value.trim() : '—');

  $: state = $userProfile as UserProfileState;
  $: statusLabel = state.signedIn ? 'Cadastro identificado' : 'Complete seu cadastro';
  $: statusTone = state.signedIn ? 'chip chip--success' : 'chip chip--warning';
  $: isProfileEmpty = Object.values(state.profile).every((value) => !String(value ?? '').trim());

  function handleLogin() {
    userProfile.login();
  }

  function handleEdit() {
    const detail = userProfile.current();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app-base:user-profile:edit', {
          detail,
        })
      );
    }
  }

  function handleReset() {
    userProfile.reset();
  }
</script>

<section class={`miniapp-base card ${className}`.trim()} data-state={state.signedIn ? 'signed' : 'guest'}>
  <header class="miniapp-base__header">
    <p class="miniapp-base__eyebrow">MiniApp base</p>
    <span class={`miniapp-base__status ${statusTone}`.trim()}>{statusLabel}</span>
  </header>
  <h2 class="miniapp-base__title">Identifique-se para continuar</h2>
  <p class="miniapp-base__description">
    {#if isProfileEmpty}
      Informe seus dados principais para liberar o acesso completo aos mini-apps.
    {:else}
      Revise seus dados antes de prosseguir ou atualize-os sempre que necessário.
    {/if}
  </p>
  <dl class="miniapp-base__details">
    <div>
      <dt>Nome completo</dt>
      <dd>{formatValue(state.profile.nomeCompleto)}</dd>
    </div>
    <div>
      <dt>Telefone</dt>
      <dd>{formatValue(state.profile.telefone)}</dd>
    </div>
    <div>
      <dt>E-mail</dt>
      <dd>{formatValue(state.profile.email)}</dd>
    </div>
    <div>
      <dt>CEP</dt>
      <dd>{formatValue(state.profile.cep)}</dd>
    </div>
  </dl>
  <div class="miniapp-base__actions">
    <button type="button" class="miniapp-base__button miniapp-base__button--primary" on:click={handleLogin}>
      {state.signedIn ? 'Continuar' : 'Fazer login'}
    </button>
    <button type="button" class="miniapp-base__button miniapp-base__button--ghost" on:click={handleEdit}>
      Editar dados
    </button>
    <button type="button" class="miniapp-base__reset" on:click={handleReset}>Limpar cadastro</button>
  </div>
</section>

<style>
  .miniapp-base {
    position: relative;
    display: grid;
    gap: 1.25rem;
    padding: 1.75rem;
    border-radius: 1.5rem;
    background: rgb(var(--color-surface));
    color: rgb(var(--color-ink));
    min-width: 260px;
  }

  .miniapp-base__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .miniapp-base__eyebrow {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgb(var(--color-ink-muted));
    margin: 0;
  }

  .miniapp-base__status {
    white-space: nowrap;
  }

  .miniapp-base__title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .miniapp-base__description {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
    color: rgb(var(--color-ink-muted));
  }

  .miniapp-base__details {
    display: grid;
    gap: 0.75rem;
    margin: 0;
  }

  .miniapp-base__details div {
    display: grid;
    gap: 0.25rem;
  }

  .miniapp-base__details dt {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: rgb(var(--color-ink-muted));
  }

  .miniapp-base__details dd {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .miniapp-base__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  .miniapp-base__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.65rem 1.25rem;
    border-radius: 999px;
    border: 1px solid transparent;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }

  .miniapp-base__button--primary {
    background: rgb(var(--color-brand));
    color: rgb(var(--color-brand-foreground));
    border-color: rgba(var(--color-brand), 0.4);
  }

  .miniapp-base__button--primary:hover,
  .miniapp-base__button--primary:focus-visible {
    background: rgba(var(--color-brand), 0.85);
    outline: none;
  }

  .miniapp-base__button--ghost {
    background: transparent;
    color: rgb(var(--color-brand));
    border-color: rgba(var(--color-brand), 0.35);
  }

  .miniapp-base__button--ghost:hover,
  .miniapp-base__button--ghost:focus-visible {
    background: rgba(var(--color-brand), 0.08);
    outline: none;
  }

  .miniapp-base__reset {
    background: none;
    border: none;
    padding: 0;
    color: rgb(var(--color-ink-muted));
    font-size: 0.75rem;
    cursor: pointer;
    text-decoration: underline;
  }

  .miniapp-base__reset:hover,
  .miniapp-base__reset:focus-visible {
    color: rgb(var(--color-brand));
    outline: none;
  }
</style>
