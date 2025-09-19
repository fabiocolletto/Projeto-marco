// shared/format/text.js
// Utilitários de manipulação de texto

/** Normaliza espaços múltiplos para um só */
export function normalizeWhitespace(str = '') {
  return str.replace(/\s+/g, ' ').trim();
}

/** Coloca a primeira letra em maiúscula */
export function capitalize(str = '') {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Slug simples: só letras, números e hífen */
export function slug(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '-')     // troca não-alfanumérico por hífen
    .replace(/^-+|-+$/g, '');
}
