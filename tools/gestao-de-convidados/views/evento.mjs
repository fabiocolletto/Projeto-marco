// tools/gestao-de-convidados/views/evento.mjs
export async function render(root, ctx){
  const project = await ctx.store.getProject(ctx.projectId);
  const ev = project.evento || {};
  const end = ev.endereco || {};
  root.innerHTML = `
    <section class="ac-section-block">
      <h3>Dados do evento</h3>
      <form id="evento-form" class="ac-form">
        <div class="ac-form-grid">
          <label>Título
            <input id="ev-titulo" name="titulo" value="${ev.titulo||''}" placeholder="Ex.: Casamento Ana & João" required />
          </label>
          <label>Data
            <input id="ev-data" name="data" type="date" value="${ev.data||''}" />
          </label>
          <label>Hora
            <input id="ev-hora" name="hora" type="time" value="${ev.hora||''}" />
          </label>
          <label>Local
            <input id="ev-local" name="local" value="${ev.local||''}" placeholder="Ex.: Espaço Jardim" />
          </label>
          <label>Logradouro
            <input id="ev-logradouro" name="logradouro" value="${end.logradouro||''}" placeholder="Rua" />
          </label>
          <label>Número
            <input id="ev-numero" name="numero" value="${end.numero||''}" placeholder="123" />
          </label>
          <label>Complemento
            <input id="ev-complemento" name="complemento" value="${end.complemento||''}" placeholder="Salão A" />
          </label>
          <label>Bairro
            <input id="ev-bairro" name="bairro" value="${end.bairro||''}" />
          </label>
          <label>Cidade
            <input id="ev-cidade" name="cidade" value="${end.cidade||''}" />
          </label>
          <label>UF
            <input id="ev-uf" name="uf" value="${end.uf||''}" maxlength="2" />
          </label>
          <label>CEP
            <input id="ev-cep" name="cep" value="${end.cep||''}" placeholder="00000-000" />
          </label>
          <label>Anfitrião
            <input id="ev-anfitriao" name="anfitriao" value="${ev.anfitriao||''}" />
          </label>
          <label>Cerimonial
            <input id="ev-cerimonial" name="cerimonial" value="${ev.cerimonial||''}" />
          </label>
        </div>
        <div class="ac-actions">
          <button type="submit" class="ac-primary">Salvar evento</button>
        </div>
      </form>
    </section>
  `;

  const form = root.querySelector('#evento-form');
  form.addEventListener('input', () => ctx.markDirty?.());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const next = {
      titulo: (data.get('titulo') || '').toString().trim(),
      data: data.get('data') || '',
      hora: data.get('hora') || '',
      local: (data.get('local') || '').toString().trim(),
      endereco: {
        logradouro: (data.get('logradouro') || '').toString().trim(),
        numero: (data.get('numero') || '').toString().trim(),
        complemento: (data.get('complemento') || '').toString().trim(),
        bairro: (data.get('bairro') || '').toString().trim(),
        cidade: (data.get('cidade') || '').toString().trim(),
        uf: (data.get('uf') || '').toString().trim().toUpperCase(),
        cep: (data.get('cep') || '').toString().trim(),
      },
      anfitriao: (data.get('anfitriao') || '').toString().trim(),
      cerimonial: (data.get('cerimonial') || '').toString().trim(),
    };
    await ctx.store.updateProject(ctx.projectId, { evento: next });
    ctx.setStatus?.('Dados do evento salvos!', 'saved');
  });
}
export function destroy(){}
