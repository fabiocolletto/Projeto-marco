const HYPHEN_SPLIT_RE = /([\-\u2010-\u2015])/;
const APOSTROPHE_SPLIT_RE = /(['’])/;
const CONNECTORS = new Set([
  "da","de","do","das","dos","e","em","d","di","du","del","der","den","van","von","la","le"
]);

function toTitleCase(segment, { isFirstWord = false } = {}) {
  if (!segment) return "";
  const lower = segment.toLocaleLowerCase("pt-BR");
  if (!isFirstWord && CONNECTORS.has(lower)) {
    return lower;
  }
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

function normalizeHyphenated(word, wordIndex) {
  let seenAlpha = false;
  return word
    .split(HYPHEN_SPLIT_RE)
    .map((part) => {
      if (!part) return "";
      if (HYPHEN_SPLIT_RE.test(part)) {
        return part;
      }
      return part
        .split(APOSTROPHE_SPLIT_RE)
        .map((sub) => {
          if (!sub) return "";
          if (APOSTROPHE_SPLIT_RE.test(sub)) {
            return sub;
          }
          const value = toTitleCase(sub, {
            isFirstWord: wordIndex === 0 && !seenAlpha,
          });
          if (/[\p{L}\p{M}]/u.test(sub)) {
            seenAlpha = true;
          }
          return value;
        })
        .join("");
    })
    .join("");
}

export function stripNumbersFromName(value = "") {
  const str = String(value ?? "");
  if (!str.trim()) return "";

  const withoutPhones = str.replace(/(?:\+?\d[\d\s().-]{6,}\d)/g, " ");
  const withoutNumbers = withoutPhones.replace(/\d+/g, " ");
  const normalizedChars = withoutNumbers
    .replace(/[^\p{L}'’\s\-\u2010-\u2015]/gu, " ")
    .replace(/(^|\s)[\-\u2010-\u2015]+/gu, "$1")
    .replace(/[\-\u2010-\u2015]+(\s|$)/gu, "$1");

  return normalizedChars
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeName(value = "") {
  const cleaned = stripNumbersFromName(value);
  if (!cleaned) return "";

  return cleaned
    .split(/\s+/)
    .map((word, index) => normalizeHyphenated(word, index))
    .filter(Boolean)
    .join(" ");
}
