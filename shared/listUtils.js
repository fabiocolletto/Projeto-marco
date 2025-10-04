export function normalizeName(name = "") {
  const base = String(name ?? "").trim();
  if (!base) return "";

  const words = base
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(" ");

  const normalizeWord = (word) => {
    if (!word) return "";
    const segments = word.split(/([-'])/g);
    return segments
      .map((segment, index) => {
        if (segment === "-" || segment === "'") {
          return segment;
        }
        if (!segment) return "";
        return segment.charAt(0).toUpperCase() + segment.slice(1);
      })
      .join("");
  };

  return words.map(normalizeWord).join(" ").trim();
}

export function stripNumbersFromName(name = "") {
  return String(name ?? "")
    .replace(/\d{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
