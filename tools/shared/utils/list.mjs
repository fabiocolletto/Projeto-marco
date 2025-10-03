// tools/shared/utils/list.mjs
// Helpers para higienizar e normalizar nomes vindos de textos livres.

export function normalizeName(name = '') {
  const cleaned = String(name)
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map(part => part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : '')
    .filter(Boolean)
    .join(' ');
}

export function stripNumbersFromName(value = '') {
  return String(value).replace(/\d{2,}/g, ' ').replace(/\s+/g, ' ').trim();
}
