// tools/shared/utils/ids.mjs
// Gerador centralizado de identificadores (curtos, mas únicos o bastante para miniapps).

export function uid(prefix = 'id') {
  const rand = Math.random().toString(36).slice(2, 9);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
}

export function shortId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
