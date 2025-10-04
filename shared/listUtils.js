// shared/listUtils.js
// Utilitários para tratamento de nomes em listas de convidados.

const LOWERCASE_PARTICLES = new Set([
  "da",
  "de",
  "do",
  "das",
  "dos",
  "e"
]);

function titleCaseWord(word = "", forceCapitalize = false) {
  const lower = word.toLowerCase();
  if (!forceCapitalize && LOWERCASE_PARTICLES.has(lower)) {
    return lower;
  }
  // Trata nomes hifenizados mantendo capitalização adequada em cada parte.
  return lower
    .split("-")
    .map(part => part ? part[0].toUpperCase() + part.slice(1) : "")
    .join("-");
}

/**
 * Remove sequências de 2+ dígitos dos nomes para evitar que números
 * (telefones, quantidades, etc.) passem para o campo de texto.
 * @param {string} value
 * @returns {string}
 */
export function stripNumbersFromName(value = "") {
  const cleaned = String(value)
    // Remove sequências longas de dígitos.
    .replace(/\d{2,}/g, " ")
    // Remove símbolos comuns deixados por cópias de planilhas.
    .replace(/[()\[\]{}]/g, " ")
    .replace(/[+•]/g, " ")
    // Normaliza múltiplos espaços em branco.
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

/**
 * Padroniza nomes: remove espaços extras, garante capitalização básica e
 * mantém partículas comuns em minúsculas (de, da, dos, etc.).
 * @param {string} value
 * @returns {string}
 */
export function normalizeName(value = "") {
  const base = stripNumbersFromName(value);
  if (!base) return "";

  const normalized = base
    // Mantém apenas letras, caracteres acentuados, apóstrofos, espaços e hifens.
    .replace(/[^\p{L}\p{M}'\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  const words = normalized.split(/\s+/);
  return words
    .map((word, index) => titleCaseWord(word, index === 0))
    .join(" ");
}

export default {
  normalizeName,
  stripNumbersFromName
};
