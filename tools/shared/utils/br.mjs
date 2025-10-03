// tools/shared/utils/br.mjs
// Funções utilitárias para formatos brasileiros (datas, moeda e telefone).

export function formatMoneyBR(value, options = {}) {
  const amount = Number(value ?? 0) || 0;
  const baseOptions = { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 };
  try {
    return new Intl.NumberFormat('pt-BR', { ...baseOptions, ...options }).format(amount);
  } catch {
    return `R$ ${amount.toFixed(2)}`;
  }
}

export function parseCurrencyBR(input) {
  if (typeof input === 'number') return input;
  const sanitized = String(input ?? '')
    .replace(/[^0-9,.-]+/g, '')
    .replace(/\.(?=.*\.)/g, '')
    .replace(',', '.');
  const parsed = parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDateBR(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Number.isNaN(+value) ? '' : value.toLocaleDateString('pt-BR');
  }
  const isoMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }
  return String(value);
}

export function parseDateBR(value) {
  if (!value) return '';
  const match = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) return String(value);
  const [, dd, mm, yy] = match;
  const year = yy.length === 2 ? `20${yy}` : yy;
  return `${year.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

export function toISODate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
    return String(value).slice(0, 10);
  }
  const parsed = parseDateBR(value);
  if (parsed && /^\d{4}-\d{2}-\d{2}/.test(parsed)) return parsed;
  const date = new Date(value);
  return Number.isNaN(+date) ? '' : date.toISOString().slice(0, 10);
}

export function normalizePhoneBR(value) {
  let digits = String(value ?? '').replace(/\D+/g, '');
  if (digits.length > 11) digits = digits.slice(-11);
  if (digits.length < 10) return '';
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function maskPhoneBR(value) {
  const digits = String(value ?? '').replace(/\D+/g, '').slice(0, 11);
  return normalizePhoneBR(digits) || digits;
}
