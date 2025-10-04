// Funções de domínio para convidados/convites.

const DEFAULT_ID_PREFIX = 'g_';

const ensureIdFactory = (factory)=> typeof factory === 'function' ? factory : (()=> `${DEFAULT_ID_PREFIX}${Math.random().toString(36).slice(2,9)}`);

export function formatMoney(value, formatter){
  const n = Number(value) || 0;
  if(typeof formatter === 'function') return formatter(n);
  try{
    return new Intl.NumberFormat('pt-BR',{ style:'currency', currency:'BRL'}).format(n);
  }catch{
    return `R$ ${n.toFixed(2)}`;
  }
}

export function formatDateBR(value, formatter){
  if(!value) return '';
  if(typeof formatter === 'function') return formatter(value);
  return String(value).split('-').reverse().join('/');
}

export function parseDateBR(value){
  if(!value) return '';
  const s = String(value);
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if(m){
    const [_, dd, mm, yy] = m;
    const yyyy = yy.length === 2 ? `20${yy}` : yy;
    return `${yyyy.padStart(4,'0')}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  }
  const dt = new Date(s);
  if(!Number.isNaN(+dt)) return dt.toISOString().slice(0,10);
  return s;
}

export function maskTelefoneBR(value){
  const digits = String(value || '').replace(/\D+/g,'').slice(0,11);
  if(digits.length <= 10){
    return digits.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (m,a,b,c)=> [a && `(${a})`, b && ` ${b}`, c && `-${c}`].filter(Boolean).join(''));
  }
  return digits.replace(/(\d{0,2})(\d{0,5})(\d{0,4}).*/, (m,a,b,c)=> [a && `(${a})`, b && ` ${b}`, c && `-${c}`].filter(Boolean).join(''));
}

export function ensureGuests(project){
  const base = project && typeof project === 'object' ? project : {};
  base.convidados ||= [];
  return base.convidados;
}

export function createGuest(input = {}, options = {}){
  const idFactory = ensureIdFactory(options.idFactory);
  return {
    id: input.id || idFactory(),
    nome: input.nome || '',
    telefone: input.telefone || '',
    email: input.email || '',
    grupo: input.grupo || '',
    mesa: input.mesa || '',
    qtd: Number(input.qtd ?? 1) || 1,
    convite: {
      enviadoEm: input.convite?.enviadoEm || input.enviadoEm || '',
      metodo: input.convite?.metodo || input.metodo || ''
    },
    rsvp: input.rsvp || input.status || 'pendente',
    presenca: Boolean(input.presenca ?? input.presente ?? false),
    obs: input.obs || input.observacao || ''
  };
}

export function computeGuestsKpi(list = []){
  const total = Array.isArray(list) ? list.length : 0;
  const confirmados = (list || []).filter(g=> /confirmad[oa]|yes|sim|ok/i.test(String(g?.rsvp || g?.status || '')) || g?.presenca).length;
  const pendentes = Math.max(0, total - confirmados);
  const pctConfirmados = total > 0 ? Math.round((confirmados/total)*100) : 0;
  return { total, confirmados, pendentes, pctConfirmados };
}

export default {
  formatMoney,
  formatDateBR,
  parseDateBR,
  maskTelefoneBR,
  ensureGuests,
  createGuest,
  computeGuestsKpi
};
