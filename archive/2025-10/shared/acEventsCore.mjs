// /shared/acEventsCore.mjs
// Núcleo puro de utilitários para Gestão de Eventos (sem DOM).

/* =====================
 * Model / Normalização
 * ===================== */
export function ensureShape(o = {}) {
  o.cerimonialista ||= { nomeCompleto: "", telefone: "", redeSocial: "" };
  o.evento ||= { nome: "", data: "", hora: "", local: "", tipo: "", endereco: {}, anfitriao: {} };
  o.evento.endereco ||= {};
  o.evento.anfitriao ||= {};
  o.evento.anfitriao.endCorrespondencia ||= {};
  o.evento.anfitriao.endEntrega ||= {};
  o.fornecedores ||= [];
  o.convidados ||= [];
  o.checklist ||= [];
  o.mensagens ||= [];
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
  return {
    logradouro: j.logradouro || "",
    bairro: j.bairro || "",
    cidade: j.localidade || "",
    uf: j.uf || ""
  };
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

/* ==============
 * Estatísticas
 * ============== */
export function statsFornecedores(list = []) {
  let previsto = 0, pago = 0;
  for (const f of list) {
    previsto += Number(f?.previsto) || 0;
    pago += Number(f?.pago) || 0;
  }
  const pendente = Math.max(0, previsto - pago);
  const pct = previsto > 0 ? Math.round((pago / previsto) * 100) : 0;
  return { n: list.length, previsto, pago, pendente, pct };
}

export function statsConvidados(list = []) {
  const rows = Array.isArray(list) ? list : [];
  const n = rows.length;
  const conf = rows.filter(c => /^(sim|confirmado|confirmada|ok)$/i.test(c?.status || "")).length || 0;
  const by = (key) => {
    const m = new Map();
    for (const c of rows) {
      const k = (c?.[key] || ("Sem " + key)).trim();
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
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
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const perDay = Array.from({ length: 7 }, () => 0);
  for (const msg of rows) {
    const d = parseLooseDate(msg?.quando || msg?.data || msg?.agendadoAt || msg?.scheduledAt);
    if (d) {
      const diffDays = Math.floor((d - now) / 86400000);
      if (diffDays >= 0 && diffDays < 7) perDay[diffDays]++;
    }
  }
  return { perDay };
}

/* ==============
 * Namespaces
 * ============== */
export const model = { ensureShape };
export const format = { fmtDateTime, fmtDateBR, fmtDateLong, money, whenText, oneLineEndereco, pessoa };
export const cep = { onlyDigits, maskCep, fetchCep };
export const stats = { fornecedores: statsFornecedores, convidados: statsConvidados, tasks: statsTasks, mensagens: statsMsgs };

export default { model, format, cep, stats, parseLooseDate };
