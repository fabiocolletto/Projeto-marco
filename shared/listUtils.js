// shared/listUtils.js
// Utilitários base para a etapa Convidados.
// - normalização de nomes
// - limpeza de números/telefones (2+ dígitos) fora dos nomes
// - tokenização, dedupe, estatísticas
// - CSV simples (uma coluna "nome")
// Sem dependências externas. Comentários curtos ao lado.

// Palavrinhas mantidas minúsculas no meio do nome próprio
const SMALL_WORDS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

// Telefone "solto" (aceita +DD, DDD, espaços, hífens e parênteses)
const PHONE_RE = /(?:\+?\d[\d\s().-]{6,}\d)/g;

// -------------------- Helpers gerais --------------------

export function tokenize(text = '') {                         // quebra por \n , ; \t
  return String(text)
    .replace(/\r\n?/g, '\n')
    .split(/\n|,|;|\t/g)
    .map(s => s.trim())
    .filter(Boolean);
}

export function normalizeName(s = '') {                       // Nome Próprio simples
  const words = String(s)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ');
  return words
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function digits(s = '') { return String(s).replace(/\D/g, ''); }

export function normalizePhone(s = '') {                      // BR leve (10/11 dígitos)
  let d = digits(s);
  if (d.length > 11) d = d.slice(-11);                        // ignora +55 etc (mantém 11 finais)
  if (d.length < 10) return null;
  return d.length === 10
    ? `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
    : `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

// Remove telefones e QUALQUER sequência numérica de 2+ dígitos do texto destinado a nome.
// Também limpa pontuação solta e espaços duplicados.
export function stripNumbersFromName(s = '') {
  let t = String(s);
  t = t.replace(PHONE_RE, ' ');        // remove blocos que parecem telefone
  t = t.replace(/\d{2,}/g, ' ');       // remove sequências numéricas com 2+ dígitos
  t = t.replace(/[()\-._]+/g, ' ');    // limpa pontuação comum
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

export function uniqueCaseInsensitive(arr = []) {             // dedupe preservando 1ª ocorrência
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    const k = String(s).toLocaleLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

// -------------------- Parser "nomes soltos" (para textarea/estatística) --------------------

export function parsePlainList(text = '') {
  const tokens = tokenize(text);
  const rawCount = tokens.length;

  const items = [];
  const duplicates = [];
  const filtered = [];                    // tokens descartados por virarem vazios após limpeza
  const seen = new Set();

  for (const t of tokens) {
    const cleaned = stripNumbersFromName(t);                 // limpa números/telefones antes
    if (!cleaned || cleaned.replace(/\W/g, '').length < 2) { // sobrou quase nada? descarta
      filtered.push(t);
      continue;
    }
    const name = normalizeName(cleaned);
    const key  = name.toLocaleLowerCase();
    if (seen.has(key)) { duplicates.push(name); continue; }
    seen.add(key);
    items.push(name);
  }

  return { items, duplicates, rawCount, filtered };
}

// -------------------- CSV simples (uma coluna "nome") --------------------

export function toCSV(names = []) {
  const esc = s => `"${String(s).replace(/"/g, '""')}"`;
  return ['nome', ...names.map(esc)].join('\n');
}

export function fromCSV(csv = '') {
  const lines = String(csv).replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim().length);
  if (!lines.length) return [];

  const parseLine = (line) => {                                // CSV minimalista com aspas
    const out = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i+1] === '"') { cur += '"'; i++; } else { inQ = false; }
        } else cur += ch;
      } else {
        if (ch === ',') { out.push(cur); cur = ''; }
        else if (ch === '"') inQ = true;
        else cur += ch;
      }
    }
    out.push(cur);
    return out.map(v => v.trim());
  };

  const header = parseLine(lines[0]).map(h => h.toLowerCase());
  const idx = header.includes('nome') ? header.indexOf('nome') : 0;

  const names = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const cell = cols[idx] || '';
    if (cell) names.push(cell);
  }
  return names;
}
