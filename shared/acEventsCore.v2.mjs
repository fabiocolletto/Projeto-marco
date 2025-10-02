// /shared/acEventsCore.v2.mjs
// Núcleo de utilitários para Gestão de Eventos — versão orientada a KPIs unificados
// Mantém compatibilidade com a API anterior (model/format/cep/stats.*)
// e adiciona agregadores prontos para UI dos mini‑apps (kpiFornecedores, kpiTarefas, kpiConvidados, kpiMensagens).

/* =====================
 * Model / Normalização
 * ===================== */
export function ensureShape(o = {}) {
  // Blocos principais
  o.cerimonialista ||= { nomeCompleto: "", telefone: "", redeSocial: "" };
  o.evento ||= { nome: "", data: "", hora: "", local: "", tipo: "", endereco: {}, anfitriao: {} };
  o.evento.endereco ||= {};
  o.evento.anfitriao ||= {};
  o.evento.anfitriao.endCorrespondencia ||= {};
  o.evento.anfitriao.endEntrega ||= {};

  // Tabelas
  o.fornecedores ||= [];
  o.convidados ||= [];
  o.checklist ||= [];
  o.mensagens ||= [];

  // Campos auxiliares (presentes em algumas telas)
  o.tipos ||= [];
  o.modelos ||= {};
  o.vars ||= {};
  return o;
}

/* ==============
 * Formatadores
 * ============== */
export function fmtDateTime(ts) {
  return ts ? new Date(ts).toLocaleString("pt-BR") : "";
}
export function fmtDateBR(s) {
  if (!s) return "";
  try {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return s || "";
  }
}
export function fmtDateLong(dateStr, timeStr) {
  if (!dateStr && !timeStr) return "";
  try {
    const [y, m, d] = (dateStr || "").split("-").map(Number);
    const [hh, mm] = (timeStr || "00:00").split(":").map(Number);
    const dt = new Date(y || 1970, (m || 1) - 1, d || 1, hh || 0, mm || 0);
    const dLong = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(dt);
    const hShort = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(dt);
    return `${dLong}, às ${hShort}`;
  } catch {
    return "";
  }
}
export function money(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
export function whenText(ev = {}) {
  const d = fmtDateBR(ev.data || "");
  const h = ev.hora || "";
  return [d, h].filter(Boolean).join(" • ");
}
export function oneLineEndereco(e = {}) {
  const parts = [e.logradouro, e.numero, e.bairro, (e.cidade && e.uf) ? `${e.cidade}/${e.uf}` : e.cidade].filter(Boolean);
  return parts.join(", ");
}
export function pessoa(p = {}) {
  const n = p.nome || p.nomeCompleto || "";
  const tel = p.telefone ? ` • ${p.telefone}` : "";
  const rs = p.redeSocial ? ` • ${p.redeSocial}` : "";
  return `${n}${tel}${rs}`.trim();
}

/* ========
 *  CEP
 * ======== */
export function onlyDigits(s) { return String(s || "").replace(/\D+/g, ""); }
export function maskCep(s) {
  const d = onlyDigits(s).slice(0, 8);
  return d.replace(/(\d{5})(\d{0,3})/, (_, a, b) => b ? `${a}-${b}` : a);
}
export async function fetchCep(cepLike) {
  const cep = onlyDigits(cepLike);
  if (cep.length !== 8) return null;
  const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!r.ok) return null;
  const j = await r.json();
  if (!j || j.erro) return null;
  return { logradouro: j.logradouro || "", bairro: j.bairro || "", cidade: j.localidade || "", uf: j.uf || "" };
}

/* ==============
 * Datas soltas
 * ============== */
export function parseLooseDate(v) {
  if (!v) return null;
  if (typeof v === "number") return new Date(v);
  const s = String(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (m) {
    const [Y, M, D] = m[1].split("-").map(Number);
    const hh = m[2] ? Number(m[2]) : 0;
    const mm = m[3] ? Number(m[3]) : 0;
    return new Date(Y, M - 1, D, hh, mm);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

/* =====================
 * Helpers numéricos
 * ===================== */
function toNum(v) { return Number(v) || 0; }
function pct(part, total) { return total > 0 ? Math.round((toNum(part) / toNum(total)) * 100) : 0; }

/* ==============
 * Estatísticas (compat + novos KPIs)
 * ============== */
export function statsFornecedores(list = []) {
  let previsto = 0, pago = 0;
  for (const f of list) { previsto += toNum(f?.previsto); pago += toNum(f?.pago); }
  const pendente = Math.max(0, previsto - pago);
  const p = pct(pago, previsto);
  return { n: list.length, previsto, pago, pendente, pct: p };
}

export function statsConvidados(list = []) {
  const rows = Array.isArray(list) ? list : [];
  const n = rows.length;
  const conf = rows.filter(c => /^(sim|confirmado|confirmada|ok)$/i.test(c?.status || "")).length || 0;
  const by = (key) => {
    const m = new Map();
    for (const c of rows) { const k = (c?.[key] || ("Sem " + key)).trim(); m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  };
  return { n, conf, mesas: by("mesa"), grupos: by("grupo") };
}

export function statsTasks(list = []) {
  const rows = Array.isArray(list) ? list : [];
  const n = rows.length;
  const done = rows.filter(t => !!t?.done || /^(feito|concluido|concluída|concluida|ok)$/i.test(t?.status || "")).length || 0;
  return { n, done };
}

export function statsMsgs(list = []) {
  const rows = Array.isArray(list) ? list : [];
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const perDay = Array.from({ length: 7 }, () => 0);
  for (const msg of rows) {
    const d = parseLooseDate(msg?.quando || msg?.data || msg?.agendadoAt || msg?.scheduledAt);
    if (!d) continue;
    const diffDays = Math.floor((d - now) / 86400000);
    if (diffDays >= 0 && diffDays < 7) perDay[diffDays]++;
  }
  return { perDay };
}

/* ------------------
 * KPIs unificados
 * ------------------ */
export function kpiFornecedores(list = []) {
  const s = statsFornecedores(list);
  return {
    fornecedores: s.n,
    total: s.previsto,     // total comprometido
    pago: s.pago,
    pendente: s.pendente,
    pctPago: s.pct
  };
}

export function kpiTarefas(checklist = []) {
  const s = statsTasks(checklist);
  const pend = Math.max(0, s.n - s.done);
  return {
    total: s.n,
    concluidas: s.done,
    pendentes: pend,
    pctConcluidas: pct(s.done, s.n)
  };
}

export function kpiConvidados(convidados = []) {
  const s = statsConvidados(convidados);
  const pend = Math.max(0, s.n - s.conf);
  return {
    total: s.n,
    confirmados: s.conf,
    pendentes: pend,
    pctConfirmados: pct(s.conf, s.n),
    mesas: s.mesas,   // [[nome, qtd], ...]
    grupos: s.grupos
  };
}

export function kpiMensagens(mensagens = []) {
  const s = statsMsgs(mensagens);
  const perDay = Array.isArray(s.perDay) ? s.perDay.slice(0, 7) : [0,0,0,0,0,0,0];
  const total = perDay.reduce((a,b)=>a+b,0);
  const pico = perDay.reduce((m,v)=>v>m?v:m,0);
  return { perDay, total, pico };
}

/* ==============
 * Namespaces e export default
 * ============== */
export const model  = { ensureShape };
export const format = { fmtDateTime, fmtDateBR, fmtDateLong, money, whenText, oneLineEndereco, pessoa };
export const cep    = { onlyDigits, maskCep, fetchCep };

// Mantém API antiga + inclui agregadores novos
export const stats  = {
  fornecedores: statsFornecedores,
  convidados:   statsConvidados,
  tasks:        statsTasks,
  mensagens:    statsMsgs,
  // novos
  kpiFornecedores,
  kpiTarefas: kpiTarefas,
  kpiConvidados,
  kpiMensagens
};

export default { model, format, cep, stats, parseLooseDate,
  // também exporta os KPIs no default por conveniência
  kpiFornecedores, kpiTarefas, kpiConvidados, kpiMensagens
};
