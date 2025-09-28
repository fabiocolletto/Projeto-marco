// tools/gestao-de-convidados/pdf/print.mjs
// Exportação em PDF via diálogo de impressão do navegador (Salvar como PDF).
// Gera um documento HTML novo com estilos mínimos e dispara window.print().
export function openPrint(sections, project){
  const w = window.open('', '_blank');
  const css = `
    body{font-family:inherit;color:inherit;padding:24px;line-height:1.4}
    h1,h2,h3{margin:.2em 0}
    table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px;text-align:left}
    small{opacity:.7}
    .muted{opacity:.7}
    .section{margin:16px 0}
  `;
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Relatório</title><style>'+css+'</style></head><body>');
  if (sections.evento){
    const ev = project.evento||{};
    const end = ev.endereco || {};
    const endereco = [end.logradouro, end.numero, end.complemento, end.bairro, end.cidade, end.uf, end.cep]
      .filter(Boolean)
      .join(', ');
    w.document.write(`<section class="section"><h2>Dados do evento</h2>
      <p><b>Título:</b> ${ev.titulo||'-'}<br/>
      <b>Data:</b> ${ev.data||'-'} &nbsp; <b>Hora:</b> ${ev.hora||'-'}<br/>
      <b>Local:</b> ${ev.local||'-'}<br/>
      <b>Endereço:</b> ${endereco || '-'}<br/>
      <b>Anfitrião:</b> ${ev.anfitriao || '-'} &nbsp; <b>Cerimonial:</b> ${ev.cerimonial || '-'}</p></section>`);
  }
  if (sections.agenda){
    const agenda = project.agenda||[];
    const modelos = project.mensagens?.modelos || [];
    w.document.write('<section class="section"><h2>Agenda de mensagens</h2><table><thead><tr><th>Data/Hora</th><th>Modelo</th><th>Público</th><th>Estimado</th><th>Enviados</th><th>Status</th></tr></thead><tbody>');
    agenda.forEach(a=>{
      const modelo = modelos.find(m => m.id === a.modeloId);
      const titulo = modelo ? modelo.titulo : a.modeloId;
      w.document.write(`<tr><td>${new Date(a.dataHoraISO).toLocaleString()}</td><td>${titulo}</td><td>${a.publico?.tipo||''}</td><td>${a.metricas?.estimado??0}</td><td>${a.metricas?.enviados??0}</td><td>${a.status}</td></tr>`);
    });
    w.document.write('</tbody></table></section>');
  }
  if (sections.rsvp){
    const lista = project.lista||[];
    w.document.write('<section class="section"><h2>Confirmações (RSVP)</h2><table><thead><tr><th>Convite</th><th>Total</th><th>Status</th><th>Confirmados</th><th>Telefone</th></tr></thead><tbody>');
    lista.forEach(g=>{
      w.document.write(`<tr><td>${g.nome}</td><td>${g.totalConvite}</td><td>${g.rsvp?.status||'pendente'}</td><td>${g.rsvp?.confirmadosN??0}</td><td>${g.telefoneFormatado||g.telefone||'-'}</td></tr>`);
    });
    w.document.write('</tbody></table></section>');
  }
  if (sections.lista){
    const lista = project.lista||[];
    w.document.write('<section class="section"><h2>Lista de convites</h2><table><thead><tr><th>Convite</th><th>Principal</th><th>Acompanhantes</th><th>Telefone</th></tr></thead><tbody>');
    lista.forEach(g=>{
      w.document.write(`<tr><td>${g.nome}</td><td>${g.principal||''}</td><td>${(g.acompanhantesNomes||[]).join(', ')}</td><td>${g.telefoneFormatado||g.telefone||'-'}</td></tr>`);
    });
    w.document.write('</tbody></table></section>');
  }
  w.document.write('<hr/><small class="muted">Gerado pelo Assistente Cerimonial — V5</small>');
  w.document.write('</body></html>');
  w.document.close();
  w.focus();
  w.print();
}
