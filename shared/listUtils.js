// shared/listUtils.js
// Utilitários para a etapa "Convidados": parsing, normalização, dedupe e CSV.
// Sem dependências externas. Mantém tudo simples para o estudo.

// Palavrinhas que ficam minúsculas no meio do nome próprio
const SMALL_WORDS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

// Padrão de telefone "solto" (aceita +DD, DDD, espaços, hífens e parênteses)
const PHONE_RE = /(?:\+?\d[\d\s().-]{6,}\d)/g; // Ex.: "+55 (41) 99999-0000", "41 9999-0000"

// -------------------- Helpers de texto --------------------

// Divide o texto em tokens por linhas, vírgulas, ponto e vírgula ou tab
export function tokenize(text = '') {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .split(/\n|,|;|\t/g)
    .map(s => s.trim())
    .filter(Boolean);
}

// Normaliza nome próprio simples: colapsa espaços e capitaliza,
// mantendo preposições comuns em minúsculo.
export function normalizeName(s = '') {
  const words = s
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ');

  return words
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

// Telefone BR leve (opcional): mantém dígitos; formata 10/11 dígitos;
// retorna null se não parecer um telefone.
export function normalizePhoneBR(s = '') {
  const d = String(s).replace(/\D/g, '');
  if (d.length < 10) return null;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
}

// Remove telefones e QUALQUER sequência numérica de 2+ dígitos do texto de nome.
// Também limpa pontuação solta e espaços duplicados.
export function stripNumbersFromName(s = '') {
  let t = String(s);
  t = t.replace(PHONE_RE, ' ');     // remove blocos que parecem telefone
  t = t.replace(/\d{2,}/g, ' ');    // remove sequências numéricas com 2+ dígitos
  t = t.replace(/[()\-._]+/g, ' '); // limpa pontuação comum que sobra
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

// Dedupe case-insensitive preservando a primeira ocorrência
export function uniqueCaseInsensitive(arr = []) {
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

// -------------------- Parser principal --------------------

// Converte um texto (textarea) numa lista de nomes normalizados, sem duplicados.
// Agora também retorna "filtered" com tokens descartados por conter números/telefones.
export function parsePlainList(text = '') {
  const tokens = tokenize(text);
  const rawCount = tokens.length;

  const items = [];
  const duplicates = [];
  const filtered = []; // tokens descartados (por virarem vazios após limpeza)
  const seen = new Set();

  for (const t of tokens) {
    // 1) limpa números/telefones ANTES de normalizar
    const cleaned = stripNumbersFromName(t);

    // 2) se sobrou quase nada, descarta (ex.: token era só número)
    // remove caracteres não "palavra" e checa tamanho mínimo 2
    if (!cleaned || cleaned.replace(/\W/g, '').length < 2) {
      filtered.push(t);
      continue;
    }

    // 3) normaliza e deduplica
    const name = normalizeName(cleaned);
    const key  = name.toLocaleLowerCase();
    if (seen.has(key)) { duplicates.push(name); continue; }
    seen.add(key);
    items.push(name);
  }

  return { items, duplicates, rawCount, filtered };
}

// -------------------- CSV simples --------------------

// Gera CSV com uma coluna "nome". Escapa aspas duplas.
export function toCSV(names = []) {
  const esc = s => `"${String(s).replace(/"/g, '""')}"`;
  return ['nome', ...names.map(esc)].join('\n');
}

// Lê CSV. Usa coluna "nome" se existir; caso contrário, a primeira coluna.
export function fromCSV(csv = '') {
  const lines = String(csv).replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim().length);
  if (!lines.length) return [];

  const parseLine = (line) => {
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
