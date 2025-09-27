// tools/gestao-de-convidados/app_header.mjs
// Cabeçalho + Painel (UI leve) — usa /shared/projectStore.js (v1)

import * as store from "../../shared/projectStore.js";
// inviteUtils e listUtils seguem opcionais
// import * as inviteUtils from "../../shared/inviteUtils.js";
// import * as listUtils   from "../../shared/listUtils.js";

// ---------- helpers ----------
const $ = (root, sel) => root.querySelector(sel);
const esc = (s) => (s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
const fmtDate = (str) => (str ? new Date(str + "T00:00:00").toLocaleDateString() : "—");
const phoneDigits = (v) => { let d = (v || "").replace(/\D/g, ""); if (d.startsWith("55") && d.length > 11) d = d.slice(2); return d.slice(-11); };
const phoneDisplay = (d) => !d ? "" : (d.length===11 ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}` :
                                        d.length===10 ? `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}` :
                                        d.length>2 ? `(${d.slice(0,2)}) ${d.slice(2)}` : d);
const clone = (o) => (globalThis.structuredClone ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

// ---------- CSS (somente layout/responsividade; estética vem do site) ----------
const css = `
.ac-app *{box-sizing:border-box}
.ac-wrap{max-width:1200px;margin:0 auto;padding:12px}
.ac-top{position:sticky;top:0;z-index:20;background:transparent}
.ac-top__row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:8px 0}
.ac-event-select{display:flex;align-items:center;gap:8px}
.ac-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.ac-iconbtn{appearance:none;border:0;background:transparent;cursor:pointer}
.ac-dd{position:relative}
.ac-dd__panel{position:absolute;right:0;top:calc(100% + 6px);min-width:220px;display:none;z-index:10}
.ac-dd__panel[hidden]{display:none}
.ac-dd[aria-expanded="true"] .ac-dd__panel{display:block}
.ac-panel{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
.ac-card__inner{padding:12px}
.ac-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.ac-table{width:100%;border-collapse:collapse}
.ac-table th,.ac-table td{padding:8px 6px;text-align:left}
.ac-table--scroll thead,.ac-table--scroll tbody tr{display:table;width:100%;table-layout:fixed}
.ac-table--scroll tbody{display:block;overflow:auto}
@media (max-width:960px){ .ac-panel{grid-template-columns:1fr} .ac-kpis{grid-template-columns:repeat(2,minmax(0,1fr))} }
@media (max-width:560px){ .ac-kpis{grid-template-columns:1fr} .ac-event-select select{min-width:180px;max-width:55vw} }
`;

// ---------- HTML ----------
const html = `
  <div class="ac-top">
    <div class="ac-wrap">
      <div class="ac-top__row">
        <div class="ac-event-select">
          <label for="ev-select">Evento</label>
          <select id="ev-select" aria-label="Selecionar evento"></select>
        </div>
        <div class="ac-actions">
          <div class="ac-infine" aria-live="polite"><span id="status">Pronto</span></div>
          <div class="ac-dd" id="menu" aria-haspopup="menu" aria-expanded="false">
            <button class="ac-iconbtn" id="btn-menu" title="Menu">⋮</button>
            <div class="ac-dd__panel" id="menu-panel" role="menu" hidden>
              <button type="button" data-action="novo"      role="menuitem">➕ Novo evento</button>
              <button type="button" data-action="carregar"  role="menuitem">📂 Carregar…</button>
              <button type="button" data-action="duplicar"  role="menuitem">🧬 Duplicar evento</button>
              <button type="button" data-action="exportar"  role="menuitem">⬇️ Exportar JSON</button>
              <button type="button" data-action="deletar"   role="menuitem">🗑️ Excluir evento</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <main class="ac-wrap">
    <div class="ac-panel">
      <section class="ac-card">
        <div class="ac-card__inner">
          <h2>Painel do usuário</h2>
          <div class="ac-kpis">
            <div><strong id="kpi-ev">0</strong><div>eventos</div></div>
            <div><strong id="kpi-convites">0</strong><div>convites</div></div>
            <div><strong id="kpi-pessoas">0</strong><div>pessoas</div></div>
          </div>
          <div style="margin-top:10px">
            <table class="ac-table ac-table--scroll" id="tbl-user" aria-label="Eventos recentes">
              <thead><tr><th>Evento</th><th>Data</th><th>Convites</th><th>Atualizado</th></tr></thead>
              <tbody id="user-last"></tbody>
            </table>
            <div style="margin-top:6px;text-align:right" id="user-foot"></div>
          </div>
        </div>
      </section>

      <section class="ac-card">
        <div class="ac-card__inner">
          <h2>Evento selecionado</h2>
          <div class="ac-kpis" style="margin-top:0">
            <div><strong id="ev-convites">0</strong><div>convites</div></div>
            <div><strong id="ev-pessoas">0</strong><div>pessoas</div></div>
            <div><strong id="ev-msgs">0</strong><div>agendamentos</div></div>
          </div>
          <div id="ev-title" style="font-weight:700; margin-top:10px">—</div>
          <div class="ac-meta" style="margin-top:6px">
            <span id="ev-date">—</span><span>•</span><span id="ev-time">—</span><span>•</span><span id="ev-local">—</span>
          </div>
          <div style="margin-top:10px">
            <table class="ac-table" aria-label="Resumo rápido">
              <tbody>
                <tr><th>Anfitrião</th><td id="ev-host">—</td></tr>
                <tr><th>Contato</th><td id="ev-host-contato">—</td></tr>
                <tr><th>Endereço</th><td id="ev-end">—</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </main>

  <!-- Modal carregar -->
  <div id="modal" hidden>
    <div style="max-width:min(840px,95vw);margin:auto">
      <div class="ac-card__inner">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>Eventos salvos</strong>
          <button class="ac-iconbtn" data-action="fechar-modal" title="Fechar">×</button>
        </div>
        <div style="margin-top:8px">
          <table class="ac-table">
            <thead><tr><th>Título</th><th>Data</th><th>Convites</th><th>Atualizado</th><th></th></tr></thead>
            <tbody id="tbl-evs"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
`;

// ---------- estado local ----------
let currentRoot = null;
let listenersBound = false;

// ---------- menu ----------
function bindGlobalListeners(panelEl, btnEl, root) {
  if (listenersBound) return;
  document.addEventListener("click", (e) => {
    if (!root) return;
    const inMenu = e.target.closest?.("#menu");
    if (!inMenu) { panelEl.hidden = true; btnEl.parentElement.setAttribute("aria-expanded","false"); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { panelEl.hidden = true; btnEl.parentElement.setAttribute("aria-expanded","false"); }
  });
  listenersBound = true;
}

// ---------- pequenas utilidades ----------
function pessoasCountFromLista(lista) {
  // estrutura genérica: cada item da 'lista' representa um convite, com 'acompanhantes' opcional
  if (!Array.isArray(lista)) return 0;
  return lista.reduce((n, it) => n + 1 + (Array.isArray(it?.acompanhantes) ? it.acompanhantes.length : 0), 0);
}

// ---------- render principal ----------
export async function render(rootEl) {
  const root = document.createElement("div");
  root.className = "ac-app";

  const style = document.createElement("style");
  style.textContent = css;
  root.appendChild(style);

  const host = document.createElement("div");
  host.innerHTML = html;
  root.appendChild(host);
  rootEl.replaceChildren(root);
  currentRoot = root;

  const setStatus = (text) => { $("#status", root).textContent = text; };

  // inicializa índice
  await (store.init?.() ?? Promise.resolve());
  let index = (await (store.listProjects?.() ?? Promise.resolve([]))) || [];
  let ativo = index[0] || null;

  // preencher select com o índice (meta leve)
  const sel = $("#ev-select", root);
  function fillSelect() {
    sel.innerHTML = index.map((m, i) => {
      const nome = esc(m?.nome || "—");
      const data = "—"; // meta não tem data; mostramos na tabela detalhada
      return `<option value="${i}">${nome} • ${data}</option>`;
    }).join("");
    if (index.length) sel.selectedIndex = 0;
  }

  // painel do usuário (usa meta +, quando necessário, consulta leve)
  async function computeKPIsFromIndex() {
    // Para números precisos de convites/pessoas, buscamos os projetos (pode ser otimizado depois)
    const fulls = await Promise.all(index.map(m => store.getProject(m.id)));
    const totalConvites = fulls.reduce((n, p) => n + ((p?.lista?.length) || 0), 0);
    const totalPessoas  = fulls.reduce((n, p) => n + pessoasCountFromLista(p?.lista), 0);
    return { totalConvites, totalPessoas, fulls };
  }

  async function renderUserPanel() {
    const { totalConvites, totalPessoas, fulls } = await computeKPIsFromIndex();
    $("#kpi-ev", root).textContent        = String(index.length);
    $("#kpi-convites", root).textContent  = String(totalConvites);
    $("#kpi-pessoas", root).textContent   = String(totalPessoas);

    const tbody = $("#user-last", root);
    const rows = index.map((meta, i) => {
      const p = fulls[i];
      const titulo = esc(p?.evento?.nome || meta?.nome || "—");
      const data   = fmtDate(p?.evento?.data);
      const conv   = (p?.lista?.length || 0);
      const updt   = new Date(meta?.updatedAt || 0).toLocaleString();
      return `<tr><td>${titulo}</td><td>${data}</td><td>${conv}</td><td>${updt}</td></tr>`;
    }).join("");
    tbody.innerHTML = rows || `<tr><td colspan="4">Sem eventos.</td></tr>`;

    const tbl = $("#tbl-user", root);
    if (index.length > 3) {
      tbl.classList.add("ac-table--scroll");
      requestAnimationFrame(() => {
        const r = tbody.querySelector("tr"); const rh = r ? r.getBoundingClientRect().height : 36;
        tbody.style.maxHeight = Math.round(rh*3 + 2) + "px";
      });
    } else {
      tbl.classList.remove("ac-table--scroll");
      tbody.style.maxHeight = "";
    }
    $("#user-foot", root).textContent = `${index.length} eventos`;
  }

  async function renderEventoSelecionado() {
    if (!ativo) {
      $("#ev-title", root).textContent = "—";
      return;
    }
    const p = await store.getProject(ativo.id);
    const ev = p?.evento || {};

    $("#ev-title", root).textContent = ev?.nome || "—";
    $("#ev-date", root).textContent  = fmtDate(ev?.data);
    $("#ev-time", root).textContent  = ev?.hora || "—";
    const cidadeUF = [ev?.endereco?.cidade, ev?.endereco?.uf].filter(Boolean).join("/");
    $("#ev-local", root).textContent = [ev?.local, cidadeUF].filter(Boolean).join(", ") || "—";

    const convites = (p?.lista?.length || 0);
    $("#ev-convites", root).textContent = String(convites);
    $("#ev-pessoas", root).textContent  = String(pessoasCountFromLista(p?.lista));
    $("#ev-msgs", root).textContent     = "0"; // placeholder

    const end = [
      ev?.endereco?.logradouro, ev?.endereco?.numero, ev?.endereco?.bairro,
      ev?.endereco?.cidade && ev?.endereco?.uf ? `${ev.endereco.cidade}/${ev.endereco.uf}` : (ev?.endereco?.cidade||"")
    ].filter(Boolean).join(", ");
    $("#ev-end", root).textContent = end || "—";

    const anfit = ev?.anfitriao || {};
    $("#ev-host", root).textContent = anfit?.nome || "—";
    const tel = phoneDigits(anfit?.telefone || "");
    $("#ev-host-contato", root).textContent = [ phoneDisplay(tel), (anfit?.email || "") ].filter(Boolean).join(" • ") || "—";
  }

  // preencher e renderizar
  fillSelect();
  await renderUserPanel();
  await renderEventoSelecionado();

  // select change
  sel.addEventListener("change", async (e) => {
    const i = parseInt(e.target.value, 10);
    ativo = index[i] || ativo;
    setStatus("Carregando evento…");
    await renderEventoSelecionado();
    setStatus("Evento carregado");
  });

  // menu + ações
  const menu = $("#menu", root);
  const panel = $("#menu-panel", root);
  const btn = $("#btn-menu", root);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = menu.getAttribute("aria-expanded") === "true";
    menu.setAttribute("aria-expanded", String(!open));
    panel.hidden = open;
  });
  bindGlobalListeners(panel, btn, root);

  function openModal() {
    $("#modal", root).hidden = false;
  }
  function closeModal() {
    $("#modal", root).hidden = true;
  }

  root.addEventListener("click", async (e) => {
    if (e.target.matches('[data-action="fechar-modal"]')) { closeModal(); return; }

    const it = e.target.closest("#menu-panel [data-action]");
    if (it) {
      const act = it.getAttribute("data-action");
      panel.hidden = true; menu.setAttribute("aria-expanded","false");

      try {
        if (act === "novo") {
          const res = await store.createProject({});
          setStatus("Evento criado");
          await refreshIndex();
          const novoId = res?.meta?.id;
          const idx = index.findIndex(x => x?.id === novoId);
          if (idx >= 0) { ativo = index[idx]; sel.value = String(idx); await renderEventoSelecionado(); }
        }
        if (act === "carregar") {
          await buildModalTable(); openModal();
        }
        if (act === "duplicar") {
          if (!ativo) return alert("Selecione um evento.");
          const full = await store.getProject(ativo.id);
          const copy = clone(full); delete copy.id;
          copy.evento = copy.evento || {};
          copy.evento.nome = (copy.evento.nome || "Evento") + " (cópia)";
          const res = await store.createProject(copy);
          setStatus("Duplicado");
          await refreshIndex();
          const novoId = res?.meta?.id;
          const idx = index.findIndex(x => x?.id === novoId);
          if (idx >= 0) { ativo = index[idx]; sel.value = String(idx); await renderEventoSelecionado(); }
        }
        if (act === "exportar") {
          if (!ativo) return alert("Selecione um evento.");
          const json = await store.exportProject(ativo.id);
          const blob = new Blob([json], { type:"application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${ativo.id}.marco.json`;
          a.click(); URL.revokeObjectURL(a.href);
        }
        if (act === "deletar") {
          if (!ativo) return alert("Selecione um evento.");
          if (!confirm("Excluir este evento? Esta ação não pode ser desfeita.")) return;
          await store.deleteProject(ativo.id);
          setStatus("Excluído");
          await refreshIndex();
          ativo = index[0] || null;
          await renderEventoSelecionado();
        }
      } catch (err) {
        console.error(err);
        alert(err?.message || "Falha na ação.");
      }
    }

    const b = e.target.closest("[data-load]");
    if (b) {
      const i = parseInt(b.getAttribute("data-load"),10);
      ativo = index[i] || ativo;
      sel.value = String(i);
      await renderEventoSelecionado();
      closeModal();
      setStatus("Evento carregado");
    }
  });

  async function refreshIndex() {
    index = (await (store.listProjects?.() ?? Promise.resolve([]))) || [];
    fillSelect();
    await renderUserPanel();
    if (ativo) {
      const idx = index.findIndex(e => e?.id === ativo.id);
      if (idx >= 0) sel.value = String(idx);
    }
  }

  async function buildModalTable() {
    const tb = $("#tbl-evs", root);
    const fulls = await Promise.all(index.map(m => store.getProject(m.id)));
    const rows = index.map((meta, i) => {
      const p = fulls[i];
      const titulo = esc(p?.evento?.nome || meta?.nome || "—");
      const data   = fmtDate(p?.evento?.data);
      const conv   = (p?.lista?.length || 0);
      const updt   = new Date(meta?.updatedAt || 0).toLocaleString();
      return `<tr>
        <td>${titulo}</td>
        <td>${data}</td>
        <td>${conv}</td>
        <td>${updt}</td>
        <td><button class="ac-iconbtn" data-load="${i}" title="Selecionar">→</button></td>
      </tr>`;
    }).join("");
    tb.innerHTML = rows || `<tr><td colspan="5">Sem eventos.</td></tr>`;
  }
}

// atalho opcional
export function mount(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error("Elemento não encontrado: " + selector);
  return render(el);
}
