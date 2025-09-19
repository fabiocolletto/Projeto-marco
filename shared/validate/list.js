// shared/validate/list.js
// Validação e saneamento da lista de convidados

/** Limpa espaços e caracteres estranhos */
export function sanitizeLine(line = '') {
  return line.replace(/\s+/g, ' ').trim();
}

/** Verifica se duas strings são provavelmente duplicadas */
export function isLikelyDuplicate(a, b) {
  return sanitizeLine(a).toLowerCase() === sanitizeLine(b).toLowerCase();
}

/** Remove duplicados mantendo ordem */
export function ensureUnique(list = []) {
  const out = [];
  list.forEach(item => {
    if (!out.some(x => isLikelyDuplicate(x, item))) {
      out.push(sanitizeLine(item));
    }
  });
  return out;
}
