// shared/inviteProcessor.js
// Utilitário para analisar convites em texto livre e gerar estrutura padronizada.
// Pode ser utilizado em apps Vanilla ou embutido em widgets Elementor.

const PREPOSITIONS = new Set(["de", "da", "das", "do", "dos", "e", "ou"]);
const PHONE_REGEX = /(?:\+?\d[\d\s().-]{6,}\d)/g;

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `invite-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyAnalysis() {
  return {
    totalLinhas: 0,
    processadas: 0,
    ignoradas: [],
    duplicadas: [],
    semTelefone: 0,
  };
}

function digitsOnly(value = "") {
  return String(value).replace(/\D/g, "");
}

export function normalizePhoneNumber(value = "") {
  let digits = digitsOnly(value);
  if (digits.length > 11) digits = digits.slice(-11);
  if (digits.length < 10) return null;
  return digits.length === 10
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    : `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function toTitleCase(nome) {
  if (!nome) return "";
  const palavras = nome
    .trim()
    .split(/\s+/)
    .map((palavra, indexPalavra) => {
      const partes = palavra.split(/([-'])/).filter(Boolean);
      return partes
        .map((parte) => {
          if (parte === "-" || parte === "'") return parte;
          const lower = parte.toLocaleLowerCase("pt-BR");
          const shouldKeepLower = indexPalavra > 0 && PREPOSITIONS.has(lower);
          if (shouldKeepLower) return lower;
          return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
        })
        .join("");
    });
  return palavras.join(" ");
}

function stripInviteNoise(text = "") {
  return String(text)
    .normalize("NFKC")
    .replace(PHONE_REGEX, " ")
    .replace(/\d{2,}/g, " ")
    .replace(/[()._]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalizeInviteName(value = "") {
  const cleaned = stripInviteNoise(value);
  if (!cleaned) return "";
  return toTitleCase(cleaned);
}

function extractNamesSegment(segment = "") {
  return String(segment)
    .split(/[,;|/]+|\s+(?:e|&|com|\+|e\/ou)\s+/gi)
    .map((parte) => normalizeInviteName(parte))
    .filter(Boolean);
}

export function uniqueCaseInsensitive(list = []) {
  const seen = new Set();
  const result = [];
  for (const item of list) {
    const value = String(item || "").trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function extractPhoneFromLine(line = "") {
  const matches = String(line).match(PHONE_REGEX) || [];
  let best = null;
  let bestDigits = "";
  for (const candidate of matches) {
    const candidateDigits = digitsOnly(candidate);
    if (candidateDigits.length > bestDigits.length) {
      best = candidate;
      bestDigits = candidateDigits;
    }
  }
  const telefone = best ? normalizePhoneNumber(best) : null;
  const semTelefone = best ? String(line).replace(best, " ") : String(line).replace(PHONE_REGEX, " ");
  return { semTelefone, telefone, digits: bestDigits };
}

export function parseInviteLine(linha = "") {
  const original = String(linha).trim();
  if (!original) return null;

  const { semTelefone, telefone, digits } = extractPhoneFromLine(original);
  const rawParts = semTelefone
    .split(/[,;|]+|\s+-\s+|\s+–\s+/g)
    .map((parte) => parte.trim())
    .filter(Boolean);

  const parts = rawParts.length ? rawParts : [semTelefone.trim() || original];
  const titularSegment = parts[0] || "";
  const titularTokens = extractNamesSegment(titularSegment);
  const titular = titularTokens.length ? titularTokens[0] : normalizeInviteName(titularSegment);
  const restanteTokens = parts.slice(1).flatMap((parte) => extractNamesSegment(parte));
  const acompanhantes = uniqueCaseInsensitive([...titularTokens.slice(1), ...restanteTokens]);
  const total = Math.max(1, 1 + acompanhantes.length);
  const avisos = [];

  if (!titular) {
    avisos.push("Titular não identificado");
  }
  if (!telefone) {
    if (digits && digits.length) {
      avisos.push("Telefone incompleto");
    } else {
      avisos.push("Sem telefone");
    }
  }

  return {
    id: createId(),
    linha: null,
    linhaOriginal: original,
    titular,
    acompanhantes,
    telefone,
    total,
    avisos: uniqueCaseInsensitive(avisos),
  };
}

export function analyzeInvites(text = "") {
  const linhas = String(text).replace(/\r\n?/g, "\n").split("\n");
  const convites = [];
  const ignoradas = [];
  const duplicadas = [];
  const vistos = new Map();
  let semTelefone = 0;
  let totalLinhas = 0;

  linhas.forEach((linha, index) => {
    const raw = linha.trim();
    if (!raw) return;
    totalLinhas += 1;
    const convite = parseInviteLine(raw);
    if (!convite || !convite.titular) {
      ignoradas.push({ linha: index + 1, conteudo: raw });
      return;
    }

    convite.linha = index + 1;
    if (!convite.telefone) semTelefone += 1;

    const chave = convite.titular.toLocaleLowerCase("pt-BR");
    if (vistos.has(chave)) {
      if (!convite.avisos.includes("Duplicado")) {
        convite.avisos.push("Duplicado");
      }
      duplicadas.push({ linha: index + 1, titular: convite.titular, conteudo: raw });
    } else {
      vistos.set(chave, true);
    }

    convite.avisos = uniqueCaseInsensitive(convite.avisos);
    convites.push(convite);
  });

  return {
    convites,
    analise: {
      totalLinhas,
      processadas: convites.length,
      ignoradas,
      duplicadas,
      semTelefone,
    },
  };
}

export function invitesToCSV(invites = []) {
  const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const header = "seq,titular,acompanhantes,telefone,total,avisos";
  const rows = invites.map((invite, index) => {
    const acompanhantes = invite.acompanhantes?.length ? invite.acompanhantes.join(" + ") : "";
    const avisos = invite.avisos?.length ? invite.avisos.join(" | ") : "";
    return [
      index + 1,
      invite.titular || "",
      acompanhantes,
      invite.telefone || "",
      invite.total ?? "",
      avisos,
    ]
      .map(esc)
      .join(",");
  });
  return [header, ...rows].join("\n");
}

export function invitesToJSON(invites = []) {
  return JSON.stringify(invites, null, 2);
}

export default {
  analyzeInvites,
  parseInviteLine,
  invitesToCSV,
  invitesToJSON,
  normalizeInviteName,
  normalizePhoneNumber,
  toTitleCase,
  uniqueCaseInsensitive,
  createEmptyAnalysis,
};
