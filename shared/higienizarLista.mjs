/*
  Projeto Marco – higienizarLista (v1.1)
  ES Module para padronizar convites a partir de texto livre.
  Patch = shared/higienizarLista.mjs

  =====================================
  CHANGELOG
  - 2025-09-25 (v1.1)
    • Removida a heurística que interpretava "+<n>" como quantidade de acompanhantes.
      O caractere "+" passa a ser exclusivo de números internacionais (ex.: +351...).
    • Detecção de acompanhantes agora ocorre apenas por:
      (a) palavras-chave: "acompanhante(s)", "acomp." seguidas de número; e
      (b) nomes explícitos separados por conectores ("e", vírgula, & ou /).
    • Comentários e docs atualizados.

  - 2025-09-25 (v1.0)
    • Primeira versão pública.
  =====================================

  Regras principais:
  - Cada linha = 1 convite (ordem livre de campos)
  - Delimitadores: vírgula, ponto e vírgula, hífen, barra, pipe, e o " e " entre nomes
  - Telefones: BR (com DDD), 8 ou 9 dígitos após DDD; internacionais iniciando com "+"
  - Saída agrega: nome composto (principal + acompanhantes), contagens e telefones formatados

  Exporta:
    tokenizeLinha(line)
    deriveTelefone(raw)
    deriveNomes(raw)
    deriveAcompanhantes(raw)
    higienizarLinha(line)
    higienizarLista(text)
*/

// ===================== Utilidades =====================

/** Remove espaços extras, normaliza separadores e retorna string enxuta */
function normalizeSeparators(str) {
  return String(str)
    .replace(/[\t\r]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    // normaliza vírgulas e ponto e vírgula com espaços
    .replace(/[;,]/g, " | ")
    // normaliza hífens usados como separador (evita números de telefone)
    .replace(/\s-\s/g, " | ")
    // normaliza barras e pipes
    .replace(/[\/|]/g, " | ")
    .trim();
}

/** Remove acentos simples; útil para comparações (não altera resultado final formatado) */
function deburr(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Capitaliza nomes próprios simples (mantém partículas minúsculas exceto no início) */
function titleCaseNome(raw) {
  const particulas = new Set(["da","de","do","das","dos","e","di","du","d'","d"]);
  const tokens = String(raw)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return tokens
    .map((tok, idx) => {
      const lower = tok.toLowerCase();
      if (idx > 0 && particulas.has(lower)) return lower;
      // mantém apóstrofos e hifens internos
      return lower.replace(/(^\p{L}|(?<=\W)\p{L})/u, c => c.toUpperCase());
    })
    .join(" ");
}

/** Extrai todos os dígitos (preserva "+" inicial para internacionais) */
function onlyDigitsKeepPlus(s) {
  const t = String(s).trim();
  if (t.startsWith("+")) {
    return "+" + t.slice(1).replace(/\D+/g, "");
  }
  return t.replace(/\D+/g, "");
}

// ===================== Telefonia =====================

/** Determina se um número parece internacional (começa com + e tem 8+ dígitos) */
function isInternational(num) {
  return /^\+\d{8,15}$/.test(num);
}

/** Heurística simples para BR: retorna {ddd, local} ou null */
function parseBR(numDigits) {
  // Remove não-dígitos
  const nd = numDigits.replace(/\D+/g, "");
  // Formatos aceitáveis: 10 (fixo/antigo) ou 11 (celular com 9) dígitos, com DDD
  if (!(nd.length === 10 || nd.length === 11)) return null;
  const ddd = nd.slice(0, 2);
  const local = nd.slice(2);
  // DDD 11..99 (heurística branda; validação Anatel pode ser plugada depois)
  if (!/^(1[1-9]|[2-9]\d)$/.test(ddd)) return null;
  return { ddd, local };
}

/** Formata E.164 e nacional amigável quando BR, caso contrário mantém internacional */
function formatTelefone(numRaw) {
  const base = onlyDigitsKeepPlus(numRaw);
  if (!base) return { e164: null, nacional: null, tipo: null };

  if (isInternational(base)) {
    // Se for +55, tratar como BR
    if (base.startsWith("+55") && base.length >= 4) {
      const nd = base.slice(3); // remove +55
      const br = parseBR(nd);
      if (br) {
        const { ddd, local } = br;
        const e164 = "+55" + ddd + local;
        const nacional = formatBR(ddd, local);
        return { e164, nacional, tipo: "BR" };
      }
    }
    // Internacional genérico
    return { e164: base, nacional: base, tipo: "INTL" };
  }

  // Sem + → tentar BR
  const br = parseBR(base);
  if (br) {
    const { ddd, local } = br;
    const e164 = "+55" + ddd + local;
    const nacional = formatBR(ddd, local);
    return { e164, nacional, tipo: "BR" };
  }

  // Não reconhecido
  return { e164: null, nacional: null, tipo: null };
}

/** Formata BR (41) 99999-0000 ou (41) 3333-0000 */
function formatBR(ddd, local) {
  if (local.length === 9) {
    return `(${ddd}) ${local.slice(0,5)}-${local.slice(5)}`;
  }
  if (local.length === 8) {
    return `(${ddd}) ${local.slice(0,4)}-${local.slice(4)}`;
  }
  // fallback: blocar em grupos mais comuns
  if (local.length > 9) {
    return `(${ddd}) ${local.slice(0,5)}-${local.slice(5,9)}${local.slice(9) ? " " + local.slice(9) : ""}`;
  }
  return `(${ddd}) ${local}`;
}

// ===================== Parsing de linha (única passada) =====================

/**
 * Retorna um objeto "raw" com dados detectados a partir da linha.
 * { parts, possiveisNomes, possiveisNumeros, acompanhantesExplicitos }
 */
export function tokenizeLinha(line) {
  const original = String(line || "");
  const norm = normalizeSeparators(original);
  const parts = norm.split(/\s*\|\s*/).filter(Boolean);

  const raw = {
    original,
    parts,
    possiveisNomes: [],
    possiveisNumeros: [],
    acompanhantesExplicitos: 0,
  };

  // Regex utilitárias
  const reAcompPalavra = /\b(\d+)\s*(?:acompanhantes?|acomp\.)\b/i;
  const reSomenteDigitosOuTelefone = /^[\d\s().+\-]+$/; // permite + apenas para telefone

  for (const p of parts) {
    const seg = p.trim();
    if (!seg) continue;

    // 1) Captura marcadores de acompanhantes explícitos via palavra-chave (NÃO usa +N)
    const mB = seg.match(reAcompPalavra);
    if (mB) raw.acompanhantesExplicitos += parseInt(mB[1], 10) || 0;

    // 2) Captura números/telefones (segmentos dominados por dígitos e símbolos de fone)
    if (reSomenteDigitosOuTelefone.test(seg)) {
      const compact = onlyDigitsKeepPlus(seg);
      if (compact.length >= 8) raw.possiveisNumeros.push(compact);
      continue;
    }

    // 3) O restante tende a ser "nome" ou blocos com conectores
    const sub = seg.split(/\s*(?:,|\se\s|\s&\s|\/)\s*/i).filter(Boolean);
    for (const s of sub) {
      // ignora trechos que são somente a palavra-chave de acompanhantes
      if (reAcompPalavra.test(s)) continue;
      if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(s)) continue;
      raw.possiveisNomes.push(s.trim());
    }
  }

  return raw;
}

// ===================== Derivações a partir do RAW =====================

export function deriveTelefone(raw) {
  // Estratégia: pegar o primeiro candidato válido
  for (const num of raw.possiveisNumeros) {
    const fmt = formatTelefone(num);
    if (fmt.e164) return fmt;
  }
  return { e164: null, nacional: null, tipo: null };
}

export function deriveNomes(raw) {
  if (!raw.possiveisNomes.length) {
    return { principal: null, acompanhantesNomes: [] };
  }
  const nomesNorm = raw.possiveisNomes.map(titleCaseNome);
  const principal = nomesNorm[0];
  const acompanhantesNomes = nomesNorm.slice(1);
  return { principal, acompanhantesNomes };
}

export function deriveAcompanhantes(raw) {
  // Se houver nomes acompanhantes, prioriza a contagem pelo número de nomes
  const qtdPorNome = Math.max(0, (raw.possiveisNomes.length - 1));
  const qtd = Math.max(qtdPorNome, raw.acompanhantesExplicitos);
  return { qtd };
}

// ===================== Orquestração =====================

function composeNome({ principal, acompanhantesNomes }) {
  if (!principal) return null;
  if (!acompanhantesNomes || !acompanhantesNomes.length) return principal;
  return [principal, ...acompanhantesNomes].join(" e ");
}

export function higienizarLinha(line) {
  const raw = tokenizeLinha(line);
  const tel = deriveTelefone(raw);
  const nomes = deriveNomes(raw);
  const acomp = deriveAcompanhantes(raw);

  return {
    nome: composeNome(nomes),
    principal: nomes.principal,
    acompanhantesNomes: nomes.acompanhantesNomes,
    acompanhantes: acomp.qtd,
    totalConvite: 1 + acomp.qtd,
    telefone: tel.e164,
    telefoneFormatado: tel.nacional,
  };
}

export function higienizarLista(text) {
  const linhas = String(text || "")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const convidados = linhas.map(higienizarLinha);
  const pessoas = convidados.reduce((s, c) => s + (c.totalConvite || 0), 0);

  return {
    convidados,
    total: {
      convites: convidados.length,
      pessoas,
    },
  };
}

// ===================== Exposição global opcional (script clássico) =====================
// Descomente o bloco abaixo se precisar usar como script clássico (IIFE + window).
// (Quando importar como módulo ES, mantenha comentado).
/*
(function (w) {
  w.MarcoHigienizador = {
    tokenizeLinha,
    deriveTelefone,
    deriveNomes,
    deriveAcompanhantes,
    higienizarLinha,
    higienizarLista,
  };
})(typeof window !== 'undefined' ? window : globalThis);
*/
