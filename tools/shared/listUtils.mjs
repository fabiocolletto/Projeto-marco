/**
 * Remove sequências de números (2+ dígitos) e sinais típicos de telefone
 * preservando espaçamentos simples.
 * @param {string} input
 * @returns {string}
 */
export function stripNumbersFromName(input = "") {
  const cleaned = String(input ?? "")
    // remove blocos de números com 2+ dígitos
    .replace(/\d{2,}/g, " ")
    // remove símbolos comuns de telefone que podem sobrar
    .replace(/[()+\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

const LOWER_WORDS = new Set([
  "da",
  "das",
  "de",
  "del",
  "dela",
  "dellas",
  "do",
  "dos",
  "e",
  "el",
  "la",
  "le",
  "van",
  "von",
]);

/**
 * Normaliza o nome deixando apenas espaços simples e capitalizando palavras.
 * Conectores comuns (de/da/do...) permanecem em minúsculas, exceto no início.
 * @param {string} input
 * @returns {string}
 */
export function normalizeName(input = "") {
  const base = stripNumbersFromName(input).trim();
  if (!base) return "";
  return base
    .split(/\s+/g)
    .map((part, index) => {
      const lower = part.toLowerCase();
      if (index > 0 && LOWER_WORDS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
