// shared/listUtils.js
// Utilitários para tratamento de nomes em listas de convidados.
// Mantém compatibilidade com consumidores em ES Modules via import relativo.

const LOWERCASE_WORDS = new Set(["da", "de", "do", "das", "dos", "e"]);
const WORD_JOINERS = new Set(["-", "'"]);

function toLowerSafe(segment = "") {
  return segment.toLocaleLowerCase("pt-BR");
}

function capitalizeSegment(segment = "", force = false) {
  if (!segment) return "";
  const lower = toLowerSafe(segment);
  if (!force && LOWERCASE_WORDS.has(lower)) {
    return lower;
  }
  return lower.replace(/^[\p{L}]/u, (char) => char.toLocaleUpperCase("pt-BR"));
}

function titleCaseWord(word = "", isFirstWord = false) {
  if (!word) return "";
  const segments = word.split(/([-'])/u);
  return segments
    .map((segment, index) => {
      if (WORD_JOINERS.has(segment)) {
        return segment;
      }
      const previous = segments[index - 1];
      const force = (isFirstWord && index === 0) || WORD_JOINERS.has(previous);
      return capitalizeSegment(segment, force);
    })
    .join("");
}

/**
 * Remove sequências numéricas com pelo menos dois dígitos de um nome.
 * Substitui os números por espaços e normaliza múltiplos espaços consecutivos.
 * @param {string} value
 * @returns {string}
 */
export function stripNumbersFromName(value = "") {
  return String(value ?? "")
    .replace(/\d{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normaliza um nome próprio para "Title Case" preservando conectores comuns.
 * - Mantém preposições em minúsculas quando não iniciam o nome.
 * - Força maiúsculas após hífen ou apóstrofo (ex: "D'Ávila").
 * @param {string} value
 * @returns {string}
 */
export function normalizeName(value = "") {
  const cleaned = stripNumbersFromName(value);
  if (!cleaned) return "";

  const words = cleaned.split(/\s+/u).filter(Boolean);
  return words
    .map((word, index) => titleCaseWord(word, index === 0))
    .join(" ");
}

export default {
  normalizeName,
  stripNumbersFromName,
};
