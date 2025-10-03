// tools/shared/utils/invites.mjs
// Converte LINHAS em "convites" estruturados (titular, acompanhantes, telefone, total).
// Regras:
// - Cada **linha** = 1 convite.
// - Vírgula/; separam acompanhantes do titular dentro da MESMA linha.
// - Telefone pode estar em qualquer lugar na linha; é detectado e padronizado (BR 10/11 dígitos).
// - Sequências com 2+ dígitos não são consideradas parte do nome.

import { normalizeName, stripNumbersFromName } from './list.mjs';
import { normalizePhoneBR } from './br.mjs';
import { uid as makeUid } from './ids.mjs';

// Telefones soltos: aceita +55, DDD, espaços, hífens e parênteses
const PHONE_RE = /(?:\+?\d[\d\s().-]{6,}\d)/g;

// ID estável para cada convite
export const uid = () => makeUid('invite');

// Normaliza telefone BR (10/11 dígitos). Se vier +55, mantém os 11 finais.
export const normalizePhone = (s = '') => {
  const normalized = normalizePhoneBR(s);
  return normalized || null;
};

// Pega o "melhor" telefone (mais dígitos) e remove da linha
function extractPhone(line = "") {
  const matches = String(line).match(PHONE_RE) || [];
  let best = null, bestLen = 0;
  for (const m of matches) {
    const n = String(m).replace(/\D/g, "");
    if (n.length > bestLen) { bestLen = n.length; best = m; }
  }
  const telefone = best ? normalizePhone(best) : null;
  const semTelefone = best ? String(line).replace(best, " ") : String(line).replace(PHONE_RE, " ");
  return { semTelefone, telefone };
}

/** @typedef {{id:string, titular:string, acompanhantes:string[], telefone:string|null, total:number}} Invite */

// Uma linha → um convite
export function parseInviteLine(line = "") {
  const raw = String(line).trim();
  if (!raw) return null;

  const { semTelefone, telefone } = extractPhone(raw);

  // vírgula/; separam titular + acompanhantes
  const parts = semTelefone
    .split(/[,;]+/g)
    .map(stripNumbersFromName)       // remove telefones/números 2+ do campo nome
    .map(s => s.trim())
    .filter(Boolean);

  if (!parts.length) return null;

  const titular = normalizeName(parts[0]);
  const acompanhantes = parts.slice(1).map(normalizeName).filter(Boolean);
  const total = 1 + acompanhantes.length;

  return { id: uid(), titular, acompanhantes, telefone: telefone ?? null, total };
}

// Múltiplas linhas → lista de convites
export function parseInvites(text = "") {
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n").map(s => s.trim());
  const out = [];
  for (const ln of lines) {
    if (!ln) continue;
    const inv = parseInviteLine(ln);
    if (inv) out.push(inv);
  }
  return out;
}

// CSV: seq,titular,acompanhantes,telefone,total
export function invitesToCSV(invites = []) {
  const esc = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const header = "seq,titular,acompanhantes,telefone,total";
  const rows = invites.map((it, i) => {
    const acomp = it.acompanhantes?.length ? it.acompanhantes.join(" + ") : "";
    return [i + 1, it.titular, acomp, it.telefone ?? "", it.total].map(esc).join(",");
  });
  return [header, ...rows].join("\n");
}
