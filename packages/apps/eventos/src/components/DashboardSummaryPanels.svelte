<script lang="ts">
  import type { PanelId } from '../stores/ui';

  export let activePanel: PanelId = 'overview';
  export let openPanel: (panel: PanelId) => void;
  export let getValue: (path: string) => string = () => '';
  export let setValue: (path: string, value: string) => void = () => {};
  export let dateTimeValue = '';
  export let setDateTime: (value: string) => void = () => {};
  export let handleCepInput: (value: string) => string = (value) => value;
  export let handleCepBlur: (prefix: string, value: string) => Promise<void> | void = () => {};

  const cepInputHandler = (path: string) => (event: Event) => {
    const target = event.currentTarget as HTMLInputElement | null;
    if (!target) return;
    const masked = handleCepInput(target.value ?? '');
    target.value = masked;
    setValue(path, masked);
  };

  const cepBlurHandler = (path: string) => async (event: Event) => {
    const target = event.currentTarget as HTMLInputElement | null;
    if (!target) return;
    await handleCepBlur(path.replace(/\.cep$/, ''), target.value ?? '');
  };
</script>

<section
  class="card space-y-6"
  id="panel-evento"
  data-panel="evento"
  hidden={activePanel !== 'evento'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Informações do evento</h2>
      <p class="text-sm text-ink-muted">Defina nome, tipo, data e endereço do encontro.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel?.('overview')}
      type="button"
    >
      Voltar
    </button>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="evento-nome">
      Nome do evento
      <input
        id="evento-nome"
        data-bind="evento.nome"
        type="text"
        class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
        value={getValue('evento.nome')}
        on:input={(event) => setValue('evento.nome', (event.currentTarget as HTMLInputElement)?.value ?? '')}
      />
    </label>
    <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="evento-tipo">
      Tipo
      <select
        id="evento-tipo"
        data-bind="evento.tipo"
        class="form-select rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
        value={getValue('evento.tipo')}
        on:change={(event) => setValue('evento.tipo', (event.currentTarget as HTMLSelectElement)?.value ?? '')}
      >
        <option value=""></option>
        <option>Casamento</option>
        <option>Aniversário</option>
        <option>Formatura</option>
        <option>Debutante</option>
        <option>Corporativo</option>
        <option>Batizado</option>
        <option>Chá de Panela</option>
        <option>Chá de Bebê</option>
        <option>Bodas</option>
        <option>Outro</option>
      </select>
    </label>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="ev-datetime">
      Quando
      <input
        id="ev-datetime"
        type="datetime-local"
        class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
        value={dateTimeValue}
        on:input={(event) => setDateTime((event.currentTarget as HTMLInputElement)?.value ?? '')}
      />
    </label>
    <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="evento-local">
      Local
      <input
        id="evento-local"
        data-bind="evento.local"
        type="text"
        class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
        value={getValue('evento.local')}
        on:input={(event) => setValue('evento.local', (event.currentTarget as HTMLInputElement)?.value ?? '')}
      />
    </label>
  </div>

  <div class="space-y-3 rounded-2xl bg-surface-muted/80 p-4">
    <h3 class="text-sm font-semibold uppercase tracking-wide text-ink-muted">Endereço do evento</h3>
    <div class="grid gap-4 md:grid-cols-2">
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="evento-endereco-cep">
        CEP
        <input
          id="evento-endereco-cep"
          data-bind="evento.endereco.cep"
          type="text"
          inputmode="numeric"
          maxlength="9"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.endereco.cep')}
          on:input={cepInputHandler('evento.endereco.cep')}
          on:blur={cepBlurHandler('evento.endereco.cep')}
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="evento-endereco-logradouro">
        Logradouro
        <input
          id="evento-endereco-logradouro"
          data-bind="evento.endereco.logradouro"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.endereco.logradouro')}
          on:input={(event) => setValue('evento.endereco.logradouro', (event.currentTarget as HTMLInputElement)?.value ?? '')}
        />
      </label>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="evento-endereco-numero">
        Número
        <input
          id="evento-endereco-numero"
          data-bind="evento.endereco.numero"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.endereco.numero')}
          on:input={(event) => setValue('evento.endereco.numero', (event.currentTarget as HTMLInputElement)?.value ?? '')}
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="evento-endereco-bairro">
        Bairro
        <input
          id="evento-endereco-bairro"
          data-bind="evento.endereco.bairro"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.endereco.bairro')}
          on:input={(event) => setValue('evento.endereco.bairro', (event.currentTarget as HTMLInputElement)?.value ?? '')}
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="evento-endereco-cidade">
        Cidade
        <input
          id="evento-endereco-cidade"
          data-bind="evento.endereco.cidade"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.endereco.cidade')}
          on:input={(event) => setValue('evento.endereco.cidade', (event.currentTarget as HTMLInputElement)?.value ?? '')}
        />
      </label>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="evento-endereco-uf">
        UF
        <input
          id="evento-endereco-uf"
          data-bind="evento.endereco.uf"
          type="text"
          maxlength="2"
          class="form-input rounded-xl border-slate-300 uppercase focus:border-brand focus:ring-brand"
          value={getValue('evento.endereco.uf')}
          on:input={(event) => setValue('evento.endereco.uf', (event.currentTarget as HTMLInputElement)?.value ?? '')}
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="evento-endereco-complemento">
        Complemento / Referência
        <input
          id="evento-endereco-complemento"
          data-bind="evento.endereco.complemento"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.endereco.complemento')}
          on:input={(event) => setValue('evento.endereco.complemento', (event.currentTarget as HTMLInputElement)?.value ?? '')}
        />
      </label>
    </div>
  </div>
</section>

<section
  class="card space-y-6"
  id="panel-anfitriao"
  data-panel="anfitriao"
  hidden={activePanel !== 'anfitriao'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Dados do anfitrião</h2>
      <p class="text-sm text-ink-muted">Preencha os contatos principais e endereços para correspondências.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel?.('overview')}
      type="button"
    >
      Voltar
    </button>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="anfitriao-nome">
      Nome
      <input
        id="anfitriao-nome"
        data-bind="evento.anfitriao.nome"
        type="text"
        class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
        value={getValue('evento.anfitriao.nome')}
        on:input={(event) => setValue('evento.anfitriao.nome', (event.currentTarget as HTMLInputElement)?.value ?? '')}
      />
    </label>
    <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="anfitriao-telefone">
      Telefone
      <input
        id="anfitriao-telefone"
        data-bind="evento.anfitriao.telefone"
        type="text"
        class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
        value={getValue('evento.anfitriao.telefone')}
        on:input={(event) => setValue('evento.anfitriao.telefone', (event.currentTarget as HTMLInputElement)?.value ?? '')}
      />
    </label>
  </div>

  <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="anfitriao-rede">
    Rede social / contato
    <input
      id="anfitriao-rede"
      data-bind="evento.anfitriao.redeSocial"
      type="text"
      class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
      value={getValue('evento.anfitriao.redeSocial')}
      on:input={(event) => setValue('evento.anfitriao.redeSocial', (event.currentTarget as HTMLInputElement)?.value ?? '')}
    />
  </label>

  <div class="space-y-3 rounded-2xl bg-surface-muted/80 p-4">
    <h3 class="text-sm font-semibold uppercase tracking-wide text-ink-muted">Endereço para correspondência</h3>
    <div class="grid gap-4 md:grid-cols-2">
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="correspondencia-cep">
        CEP
        <input
          id="correspondencia-cep"
          data-bind="evento.anfitriao.endCorrespondencia.cep"
          type="text"
          inputmode="numeric"
          maxlength="9"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endCorrespondencia.cep')}
          on:input={cepInputHandler('evento.anfitriao.endCorrespondencia.cep')}
          on:blur={cepBlurHandler('evento.anfitriao.endCorrespondencia.cep')}
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="correspondencia-logradouro">
        Logradouro
        <input
          id="correspondencia-logradouro"
          data-bind="evento.anfitriao.endCorrespondencia.logradouro"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endCorrespondencia.logradouro')}
          on:input={(event) =>
            setValue('evento.anfitriao.endCorrespondencia.logradouro', (event.currentTarget as HTMLInputElement)?.value ?? '')
          }
        />
      </label>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="correspondencia-numero">
        Número
        <input
          id="correspondencia-numero"
          data-bind="evento.anfitriao.endCorrespondencia.numero"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endCorrespondencia.numero')}
          on:input={(event) =>
            setValue('evento.anfitriao.endCorrespondencia.numero', (event.currentTarget as HTMLInputElement)?.value ?? '')
          }
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="correspondencia-bairro">
        Bairro
        <input
          id="correspondencia-bairro"
          data-bind="evento.anfitriao.endCorrespondencia.bairro"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endCorrespondencia.bairro')}
          on:input={(event) =>
            setValue('evento.anfitriao.endCorrespondencia.bairro', (event.currentTarget as HTMLInputElement)?.value ?? '')
          }
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="correspondencia-cidade">
        Cidade
        <input
          id="correspondencia-cidade"
          data-bind="evento.anfitriao.endCorrespondencia.cidade"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endCorrespondencia.cidade')}
          on:input={(event) =>
            setValue('evento.anfitriao.endCorrespondencia.cidade', (event.currentTarget as HTMLInputElement)?.value ?? '')
          }
        />
      </label>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="correspondencia-uf">
        UF
        <input
          id="correspondencia-uf"
          data-bind="evento.anfitriao.endCorrespondencia.uf"
          type="text"
          maxlength="2"
          class="form-input rounded-xl border-slate-300 uppercase focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endCorrespondencia.uf')}
          on:input={(event) =>
            setValue('evento.anfitriao.endCorrespondencia.uf', (event.currentTarget as HTMLInputElement)?.value ?? '')
          }
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="correspondencia-complemento">
        Complemento
        <input
          id="correspondencia-complemento"
          data-bind="evento.anfitriao.endCorrespondencia.complemento"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endCorrespondencia.complemento')}
          on:input={(event) =>
            setValue('evento.anfitriao.endCorrespondencia.complemento', (event.currentTarget as HTMLInputElement)?.value ?? '')
          }
        />
      </label>
    </div>
  </div>

  <div class="space-y-3 rounded-2xl bg-surface-muted/80 p-4">
    <h3 class="text-sm font-semibold uppercase tracking-wide text-ink-muted">Endereço para entrega de presentes</h3>
    <div class="grid gap-4 md:grid-cols-2">
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="entrega-cep">
        CEP
        <input
          id="entrega-cep"
          data-bind="evento.anfitriao.endEntrega.cep"
          type="text"
          inputmode="numeric"
          maxlength="9"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endEntrega.cep')}
          on:input={cepInputHandler('evento.anfitriao.endEntrega.cep')}
          on:blur={cepBlurHandler('evento.anfitriao.endEntrega.cep')}
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="entrega-logradouro">
        Logradouro
        <input
          id="entrega-logradouro"
          data-bind="evento.anfitriao.endEntrega.logradouro"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endEntrega.logradouro')}
          on:input={(event) =>
            setValue('evento.anfitriao.endEntrega.logradouro', (event.currentTarget as HTMLInputElement)?.value ?? '')
          }
        />
      </label>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="entrega-numero">
        Número
        <input
          id="entrega-numero"
          data-bind="evento.anfitriao.endEntrega.numero"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endEntrega.numero')}
          on:input={(event) =>
            setValue('evento.anfitriao.endEntrega.numero', (event.currentTarget as HTMLInputElement)?.value ?? '')
          }
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="entrega-bairro">
        Bairro
        <input
          id="entrega-bairro"
          data-bind="evento.anfitriao.endEntrega.bairro"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endEntrega.bairro')}
          on:input={(event) =>
            setValue('evento.anfitriao.endEntrega.bairro', (event.currentTarget as HTMLInputElement)?.value ?? '')
          }
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="entrega-cidade">
        Cidade
        <input
          id="entrega-cidade"
          data-bind="evento.anfitriao.endEntrega.cidade"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endEntrega.cidade')}
          on:input={(event) =>
            setValue('evento.anfitriao.endEntrega.cidade', (event.currentTarget as HTMLInputElement)?.value ?? '')
          }
        />
      </label>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="entrega-uf">
        UF
        <input
          id="entrega-uf"
          data-bind="evento.anfitriao.endEntrega.uf"
          type="text"
          maxlength="2"
          class="form-input rounded-xl border-slate-300 uppercase focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endEntrega.uf')}
          on:input={(event) =>
            setValue('evento.anfitriao.endEntrega.uf', (event.currentTarget as HTMLInputElement)?.value ?? '')
          }
        />
      </label>
      <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="entrega-complemento">
        Complemento
        <input
          id="entrega-complemento"
          data-bind="evento.anfitriao.endEntrega.complemento"
          type="text"
          class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
          value={getValue('evento.anfitriao.endEntrega.complemento')}
          on:input={(event) =>
            setValue('evento.anfitriao.endEntrega.complemento', (event.currentTarget as HTMLInputElement)?.value ?? '')
          }
        />
      </label>
    </div>
  </div>
</section>

<section
  class="card space-y-6"
  id="panel-cerimonial"
  data-panel="cerimonial"
  hidden={activePanel !== 'cerimonial'}
>
  <div class="flex items-start justify-between">
    <div>
      <h2 class="text-xl font-semibold text-ink">Cerimonialista</h2>
      <p class="text-sm text-ink-muted">Guarde os contatos da equipe responsável pelo cerimonial.</p>
    </div>
    <button
      class="rounded-lg border border-transparent bg-surface-muted px-3 py-1 text-xs font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
      on:click={() => openPanel?.('overview')}
      type="button"
    >
      Voltar
    </button>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="cerimonial-nome">
      Nome
      <input
        id="cerimonial-nome"
        data-bind="cerimonialista.nomeCompleto"
        type="text"
        class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
        value={getValue('cerimonialista.nomeCompleto')}
        on:input={(event) => setValue('cerimonialista.nomeCompleto', (event.currentTarget as HTMLInputElement)?.value ?? '')}
      />
    </label>
    <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="cerimonial-telefone">
      Telefone
      <input
        id="cerimonial-telefone"
        data-bind="cerimonialista.telefone"
        type="text"
        class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
        value={getValue('cerimonialista.telefone')}
        on:input={(event) => setValue('cerimonialista.telefone', (event.currentTarget as HTMLInputElement)?.value ?? '')}
      />
    </label>
  </div>

  <label class="flex flex-col gap-1 text-sm font-medium text-ink" for="cerimonial-rede">
    Rede social / contato
    <input
      id="cerimonial-rede"
      data-bind="cerimonialista.redeSocial"
      type="text"
      class="form-input rounded-xl border-slate-300 focus:border-brand focus:ring-brand"
      value={getValue('cerimonialista.redeSocial')}
      on:input={(event) => setValue('cerimonialista.redeSocial', (event.currentTarget as HTMLInputElement)?.value ?? '')}
    />
  </label>
</section>
