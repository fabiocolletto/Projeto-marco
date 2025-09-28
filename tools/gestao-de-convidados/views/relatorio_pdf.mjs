// tools/gestao-de-convidados/views/relatorio_pdf.mjs
import { openPrint } from '../pdf/print.mjs';

export async function render(root, ctx){
  const project = await ctx.store.getProject(ctx.projectId);
  root.innerHTML = `
    <section class="ac-section-block">
      <h3>Relatório (PDF)</h3>
      <div class="ac-form-row">
        <label><input type="checkbox" id="sec-evento" checked/> Dados do evento</label>
        <label><input type="checkbox" id="sec-agenda" checked/> Agenda de mensagens</label>
        <label><input type="checkbox" id="sec-rsvp" checked/> Confirmações (RSVP)</label>
        <label><input type="checkbox" id="sec-lista" checked/> Lista de convites</label>
      </div>
      <div class="ac-actions"><button id="btn-pdf" class="ac-primary">Exportar PDF</button></div>
      <p class="ac-muted">A exportação utiliza a caixa de impressão do navegador (Salvar como PDF).</p>
    </section>
  `;
  root.querySelector('#btn-pdf').addEventListener('click', async ()=>{
    const sections = {
      evento: root.querySelector('#sec-evento').checked,
      agenda: root.querySelector('#sec-agenda').checked,
      rsvp: root.querySelector('#sec-rsvp').checked,
      lista: root.querySelector('#sec-lista').checked,
    };
    const fresh = await ctx.store.getProject(ctx.projectId);
    openPrint(sections, fresh);
  });
}
export function destroy(){}
