// shared/inviteUtils.js
// Converte UMA linha de texto num "convite" estruturado.
// Regras simples e previsíveis para o estudo:
//
// - Cada LINHA representa UM convite.
// - Dentro da linha, o NOME DO TITULAR vem primeiro.
// - Acompanhantes vêm após , (vírgula) ou ; (ponto e vírgula).
//   Ex.: "Fabio, Ludi" -> titular "Fabio", acompanhantes ["Ludi"]
// - Se for "Fabio Ludi" (sem vírgula), é UM NOME composto (apenas titular).
// - Telefone pode aparecer em QUALQUER lugar na linha; é detectado e removido dos nomes.
// - Sequências com 2+ dígitos são ignoradas nos nomes.
// - Saída: { id, titular, acompanhantes[], telefone|null, total }.

import { normalizeName, stripNumbersFromName } from "./listUtils.js";

const PHONE_RE = /(?:\+?\d[\d\s().-]{6,}\d)/g; // +55 (41) 99999-0000, 41 9999-0000 etc.

export function uid() {
  return (crypto?.randomUUID?.() ?? `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`);
}

// Normaliza um telefone BR de maneira leve (10/11 dígitos)
export function normalizePhone(s = '') {
  const d = String(s).replace(/\D/g, '');
  if (d.length < 10) return null;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
}

// Extrai e retorna { semTelefone, telefone|null }
function extractPhone(line = '') {
  let tel = null;
  const phones = String(line).match(PHONE_RE);
  if (phones && phones.length) {
    // pega o primeiro "melhor" candidato
    tel = normalizePhone(phones[0]);
  }
  const semTel = String(line).replace(PHONE_RE, ' ');
  return { semTelefone: semTel, telefone: tel };
}

// Divide uma linha em um convite
export function parseInviteLine(line = '') {
  const { semTelefone, telefone } = extractPhone(line);

  // separa por vírgula ou ; — isso define titulares + acompanhantes
  const parts = semTelefone
    .replace(/\r\n?/g, '\n')
    .split(/[,;]+/g)
    .map(s => stripNumbersFromName(s))  // remove sequências numéricas 2+ e ruído
    .map(s => s.trim())
    .filter(Boolean);

  if (!parts.length) return null;

  const titular = normalizeName(parts[0]);
  const acompanhantes = parts.slice(1).map(normalizeName).filter(Boolean);
  const total = 1 + acompanhantes.length;

  return {
    id: uid(),
    titular,
    acompanhantes,
    telefone: telefone ?? null,
    total
  };
}

// Converte várias linhas em convites (ignora linhas vazias)
export function parseInvites(text = '') {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n').map(s => s.trim());
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
  const esc = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const header = 'seq,titular,acompanhantes,telefone,total';
  const rows = invites.map((it, i) => {
    const acomp = it.acompanhantes?.length ? it.acompanhantes.join(' + ') : '';
    return [i+1, it.titular, acomp, it.telefone ?? '', it.total].map(esc).join(',');
  });
  return [header, ...rows].join('\n');
}
