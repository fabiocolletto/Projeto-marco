// Funções de domínio para fornecedores: normalização e KPIs reutilizáveis.

const DEFAULT_ID_PREFIX = 'f';

const ensureIdFactory = (factory)=> typeof factory === 'function' ? factory : (()=> `${DEFAULT_ID_PREFIX}${Math.random().toString(36).slice(2,10)}`);

export function normalizeStatus(status){
  const k = String(status || '').trim().toLowerCase();
  const map = {
    'planejado':'planejado','cotacao':'planejado','cotação':'planejado','proposta':'planejado',
    'contrato':'contratado','contratado':'contratado','pendente':'contratado','aberto':'contratado',
    'parcial':'parcial','pago parcial':'parcial','parcialmente pago':'parcial',
    'pago':'pago','quitado':'pago',
    'cancelado':'cancelado','cancelada':'cancelado'
  };
  return map[k] || '';
}

export function computeStatus(item){
  if(String(item?.status || '').toLowerCase() === 'cancelado') return 'cancelado';
  const valor = Number(item?.valor || 0) || 0;
  const pago  = Number(item?.pago || 0) || 0;
  if(valor > 0 && pago >= valor) return 'pago';
  if(pago > 0 && pago < valor) return 'parcial';
  return normalizeStatus(item?.status) || (valor > 0 ? 'contratado' : 'planejado');
}

export function toISODate(value){
  if(!value) return '';
  const s = String(value).trim();
  if(/\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m){ const [_, dd, mm, yyyy] = m; return `${yyyy.padStart(4,'0')}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`; }
  const dt = new Date(s);
  if(!Number.isNaN(+dt)) return dt.toISOString().slice(0,10);
  return '';
}

export function normalizeFornecedor(item = {}, options = {}){
  const idFactory = ensureIdFactory(options.idFactory);
  const base = {
    id: item.id || idFactory(),
    fornecedor: item.fornecedor ?? item.nome ?? item.title ?? '',
    contato: item.contato ?? '',
    telefone: item.telefone ?? item.phone ?? '',
    categoria: item.categoria ?? item.tipo ?? '',
    dataEntrega: toISODate(item.dataEntrega || item.entrega || item.date || ''),
    valor: Number(item.valor ?? item.total ?? 0) || 0,
    pago: Number(item.pago ?? item.valorPago ?? 0) || 0,
    notas: item.notas ?? item.obs ?? item.notes ?? ''
  };
  base.status = normalizeStatus(item.status) || computeStatus(base);
  return base;
}

export function maskTelefoneBR(value){
  let digits = String(value || '').replace(/\D/g, '').slice(0,11);
  if(digits.length <= 10){
    return digits.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (m, a, b, c)=> [a && `(${a}`, a && a.length === 2 ? ') ' : '', b || '', c ? `-${c}` : ''].filter(Boolean).join(''));
  }
  return digits.replace(/(\d{0,2})(\d{0,5})(\d{0,4}).*/, (m, a, b, c)=> [a && `(${a}`, a && a.length === 2 ? ') ' : '', b || '', c ? `-${c}` : ''].filter(Boolean).join(''));
}

export function parseBRLCurrency(str){
  const s = String(str || '').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatBRLCurrency(value, formatter){
  const n = Number(value) || 0;
  if(formatter) return formatter(n);
  try{
    return new Intl.NumberFormat('pt-BR',{ style:'currency', currency:'BRL'}).format(n);
  }catch{
    return `R$ ${n.toFixed(2)}`;
  }
}

export function formatDateBR(iso, formatter){
  if(!iso) return '';
  if(formatter) return formatter(iso);
  return String(iso).split('-').reverse().join('/');
}

export function computeFornecedoresKpi(list = []){
  const totals = (list || []).reduce((acc, item)=>{
    const norm = normalizeFornecedor(item);
    acc.total += Number(norm.valor) || 0;
    acc.pago  += Number(norm.pago) || 0;
    return acc;
  }, { total:0, pago:0 });
  const pendente = Math.max(0, totals.total - totals.pago);
  const pctPago = totals.total > 0 ? Math.round((totals.pago/totals.total)*100) : 0;
  return { total: totals.total, pago: totals.pago, pendente, pctPago };
}

export default {
  normalizeStatus,
  computeStatus,
  toISODate,
  normalizeFornecedor,
  maskTelefoneBR,
  parseBRLCurrency,
  formatBRLCurrency,
  formatDateBR,
  computeFornecedoresKpi
};
