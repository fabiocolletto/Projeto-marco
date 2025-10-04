// Funções de domínio para mensagens programadas.

export function ensureMensagens(project){
  const base = project && typeof project === 'object' ? project : {};
  base.mensagens ||= [];
  return base.mensagens;
}

export function inferMensagemStatus(msg){
  if(!msg?.data) return 'rascunho';
  const when = new Date(`${msg.data}T${(msg.hora || '00:00')}:00`);
  if(Number.isNaN(+when)) return 'rascunho';
  return when.getTime() <= Date.now() ? 'enviado' : 'agendado';
}

const uid = ()=> (Date.now().toString(36) + Math.random().toString(36).slice(2,7));

export function createMensagem(input = {}){
  const base = {
    id: input.id || uid(),
    titulo: input.titulo || '',
    canal: input.canal || 'WhatsApp',
    data: input.data || '',
    hora: input.hora || '',
    alvo: input.alvo || 'Todos convidados',
    destinatarios: input.destinatarios || '',
    status: input.status || inferMensagemStatus(input),
    nota: input.nota || ''
  };
  return base;
}

export function sortMensagens(a, b){
  const ad = a?.data || '';
  const bd = b?.data || '';
  if(ad !== bd) return ad < bd ? -1 : 1;
  const ah = a?.hora || '';
  const bh = b?.hora || '';
  if(ah !== bh) return ah < bh ? -1 : 1;
  return (a?.titulo || '').localeCompare(b?.titulo || '');
}

export function formatMensagemData(iso, formatter){
  if(!iso) return '';
  if(typeof formatter === 'function') return formatter(iso);
  return String(iso).split('-').reverse().join('/');
}

export function computeMensagensKpi(list = []){
  const now = new Date();
  const counts = { rascunho:0, agendado:0, enviado:0, cancelado:0 };
  (list || []).forEach(msg => {
    const status = msg?.status || inferMensagemStatus(msg);
    if(counts[status] === undefined) counts[status] = 0;
    counts[status] += 1;
  });
  const total = (list || []).length;
  return { total, ...counts, atual: now.toISOString() };
}

export default {
  ensureMensagens,
  inferMensagemStatus,
  createMensagem,
  sortMensagens,
  formatMensagemData,
  computeMensagensKpi
};
