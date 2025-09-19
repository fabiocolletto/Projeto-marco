// shared/format/date.js
// Utilitários de data e hora

/**
 * Formata uma data ISO (yyyy-mm-dd) em dd/mm/yyyy.
 */
export function fmtDataBr(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Formata uma hora (hh:mm) para "hh:mm".
 */
export function fmtHora(hhmm) {
  if (!hhmm) return '';
  return hhmm;
}

/**
 * Converte Date → string ISO curta (yyyy-mm-dd).
 */
export function toISODate(date) {
  if (!(date instanceof Date)) return '';
  return date.toISOString().slice(0, 10);
}

/**
 * Converte Date → string ISO com hora (yyyy-mm-ddThh:mm).
 */
export function toISODateTime(date) {
  if (!(date instanceof Date)) return '';
  return date.toISOString().slice(0, 16);
}
