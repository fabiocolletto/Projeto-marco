// tools/gestao-de-convidados/views/evento.mjs
export async function render(root, ctx){
  const project = await ctx.store.getProject(ctx.projectId);
  const ev = project.evento || {};
  root.innerHTML = `
    <section class="ac-section-block">
      <h3>Evento</h3>
      <div class="ac-form-grid">
        <label>Título <input id="ev-titulo" value="${ev.titulo||''}" placeholder="Ex.: Casamento Ana & João"/></label>
        <label>Data <input id="ev-data" type="date" value="${ev.data||''}"/></label>
        <label>Hora <input id="ev-hora" type="time" value="${ev.hora||''}"/></label>
        <label>Local <input id="ev-local" value="${ev.local||''}" placeholder="Ex.: Espaço Jardim"/></label>
        <label>Endereço (opcional) <input id="ev-end" value="${(ev.endereco?.logradouro||'')}" placeholder="Rua, número..."/></label>
      </div>
      <div class="ac-actions">
        <button id="ev-salvar">Salvar evento</button>
      </div>
    </section>
  `;
  root.querySelector('#ev-salvar').addEventListener('click', async ()=>{
    const next = {
      titulo: root.querySelector('#ev-titulo').value.trim(),
      data: root.querySelector('#ev-data').value,
      hora: root.querySelector('#ev-hora').value,
      local: root.querySelector('#ev-local').value.trim(),
      endereco: { logradouro: root.querySelector('#ev-end').value.trim() }
    };
    await ctx.store.updateProject(ctx.projectId, { evento: next });
    alert('Evento salvo!');
  });
}
export function destroy(){} 
