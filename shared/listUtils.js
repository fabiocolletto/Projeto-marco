// shared/listUtils.js
// Utilitários para tratamento de nomes em listas de convidados.
// Mantém compatibilidade com consumidores em ES Modules via import relativo.

const LOWERCASE_WORDS = new Set(["da", "de", "do", "das", "dos", "e"]);

function capitalizeSegment(segment = "", force = false) {
  if (!segment) return "";
  const lower = segment.toLocaleLowerCase("pt-BR");
  if (!force && LOWERCASE_WORDS.has(lower)) {
    return lower;
  }
  return lower.replace(/^[\p{L}]/u, (c) => c.toLocaleUpperCase("pt-BR"));
}

function titleCase(word = "", isFirst = false) {
  if (!word) return "";
  const segments = word.split(/([-'])/u);
  return segments
    .map((segment, idx) => {
      if (segment === "-" || segment === "'") {
        return segment;
      }
      const prev = segments[idx - 1];
      const force = (isFirst && idx === 0) || prev === "-" || prev === "'";
      return capitalizeSegment(segment, force);
    })
    .join("");
}

export function stripNumbersFromName(value = "") {
  return String(value ?? "")
    .replace(/\d{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeName(value = "") {
  const cleaned = stripNumbersFromName(value);
  if (!cleaned) return "";

  const parts = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((part, index) => titleCase(part, index === 0));

  return parts.join(" ");
}

export default {
  normalizeName,
  stripNumbersFromName,
};
