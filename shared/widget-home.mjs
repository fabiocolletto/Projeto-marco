// shared/widget-home.mjs
// Widget – Tela inicial (dashboard leve)
// Depende do projectStore v1: init, listProjects, getProject

let _mounted = new WeakMap();

export async function render(rootEl, opts = {}) {
  if (!rootEl) throw new Error("widget-home: container inválido");
  destroy(rootEl);

  const {
    storeSrc,
    labels = {
      titleUser: "Painel do usuário",
      kpiEvents: "eventos",
      kpiInvites: "convites",
      kpiPeople: "pessoas",
      tableRecent: "Eventos recentes",
      thEvent: "Evento",
      thDate: "Data",
      thInvites: "Convites",
      thUpdated: "Atualizado",
      empty: "Sem eventos.",
      loading: "Carregando…",
      openHint: "Clique para abrir",
    },
    // callback opcional ao abrir um evento
    onOpen = null,
    // se true, o widget dispara CustomEvent('ac:open-event', {detail:{id}})
    emitOpenEvent = true,
  } = opts;

  if (!storeSrc) throw new Error("widget-home: informe { storeSrc } apontando para projectStore.js");

  const store = await import(storeSrc);

  // ---- CSS minimal (layout/responsividade) ----
  const css = `
    .ac-home *{box-sizing:border-box}
    .ac-home__wrap{max-width:1200px;margin:0 auto;padding:12px}
    .ac-home__kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .ac-home__kpi{display:flex;flex-direction:column;gap:2px}
    .ac-home__kpi strong{font-size:20px;line-height:1}
    .ac-home__table{width:100%;border-collapse:collapse}
    .ac-home__table th,.ac-home__table td{padding:8px 6px;text-align:left}
    .ac-home__scroll thead,.ac-home__scroll tbody tr{display:table;width:100%;table-layout:fixed}
    .ac-home__scroll tbody{display:block;overflow:auto}
    .ac-home__status{font-size:.9rem;margin-bottom:8px}
    .ac-home__hint{font-size:.85rem;opacity:.8}
    @media (max-width:960px){ .ac-home__kpis{grid-template-columns:repeat(2,minmax(0,1fr))} }
    @media (max-width:560px){ .ac-home__kpis{grid-template-columns:1fr} }
  `;

  // ---- HTML ----
  const el = document.createElement("section");
  el.className = "ac-home";
  el.innerHTML = `
    <style>${css}</style>
    <div class="ac-home__wrap">
      <h2>${labels.titleUser}</h2>
      <div class="ac-home__status" id="ac-h-status">${labels.loading}</div>
      <div class="ac-home__kpis">
        <div class="ac-home__kpi"><strong id="ac-h-kpi-ev">0</strong><div>${labels.kpiEvents}</div></div>
        <div class="ac-home__kpi"><strong id="ac-h-kpi-inv">0</strong><div>${labels.kpiInvites}</div></div>
        <div class="ac-home__kpi"><strong id="ac-h-kpi-pp">0</strong><div>${labels.kpiPeople}</div></div>
      </div>

      <div style="margin-top:12px">
        <table class="ac-home__table ac-home__scroll" aria-label="${labels.tableRecent}">
          <thead><tr><th>${labels.thEvent}</th><th>${labels.thDate}</th><th>${labels.thInvites}</th><th>${labels.thUpdated}</th></tr></thead>
          <tbody id="ac-h-tbody"></tbody>
        </table>
        <div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center">
          <span class="ac-home__hint">${labels.openHint}</span>
          <span id="ac-h-foot"></span>
        </div>
      </div>
    </div>
  `;

  const $ = (s) => el.querySelector(s);
  const fmtDate = (str) => (str ? new Date(str + "T00:00:00").toLocaleDateString() : "—");
  const esc = (s) => (s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));

  // ---- carga de dados ----
  const status = $("#ac-h-status");
  try { await (store.init?.() ?? Promise.resolve()); } catch {}

  let index = (await (store.listProjects?.() ?? Promise.resolve([]))) || [];

  // para KPIs e tabela, buscamos os projetos completos
  const projects = await Promise.all(index.map(m => store.getProject(m.id)));

  // KPIs
  const totalEvents  = index.length;
  const totalInvites = projects.reduce((n, p) => n + ((p?.lista?.length) || 0), 0);
  const totalPeople  = projects.reduce((n, p) => {
    if (!Array.isArray(p?.lista)) return n;
    return n + p.lista.reduce((a, it) => a + 1 + (Array.isArray(it?.acompanhantes) ? it.acompanhantes.length : 0), 0);
  }, 0);

  $("#ac-h-kpi-ev").textContent  = String(totalEvents);
  $("#ac-h-kpi-inv").textContent = String(totalInvites);
  $("#ac-h-kpi-pp").textContent  = String(totalPeople);

  // tabela
  const tbody = $("#ac-h-tbody");
  if (!index.length) {
    tbody.innerHTML = `<tr><td colspan="4">${labels.empty}</td></tr>`;
  } else {
    const rows = index.map((meta, i) => {
      const p = projects[i];
      const titulo = esc(p?.evento?.nome || meta?.nome || "—");
      const data   = fmtDate(p?.evento?.data);
      const conv   = (p?.lista?.length || 0);
      const updt   = new Date(meta?.updatedAt || 0).toLocaleString();
      return `<tr data-open="${meta.id}" style="cursor:pointer">
        <td>${titulo}</td><td>${data}</td><td>${conv}</td><td>${updt}</td>
      </tr>`;
    }).join("");
    tbody.innerHTML = rows;
  }
  $("#ac-h-foot").textContent = `${totalEvents} ${labels.kpiEvents}`;

  // clique para abrir
  tbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-open]");
    if (!tr) return;
    const id = tr.getAttribute("data-open");
    if (onOpen) try { onOpen(id); } catch {}
    if (emitOpenEvent) {
      rootEl.dispatchEvent(new CustomEvent("ac:open-event", { detail: { id }, bubbles: true }));
    }
  });

  status.textContent = ""; // pronto

  rootEl.replaceChildren(el);

  // cleanup
  _mounted.set(rootEl, () => { /* nada específico a desmontar por enquanto */ });

  return { refresh: async () => {
    // recarrega índice e rerenderiza corpo (mantém nó raiz)
    index = (await (store.listProjects?.() ?? Promise.resolve([]))) || [];
    const projectsNew = await Promise.all(index.map(m => store.getProject(m.id)));
    const totalEventsN  = index.length;
    const totalInvitesN = projectsNew.reduce((n, p) => n + ((p?.lista?.length) || 0), 0);
    const totalPeopleN  = projectsNew.reduce((n, p) => {
      if (!Array.isArray(p?.lista)) return n;
      return n + p.lista.reduce((a, it) => a + 1 + (Array.isArray(it?.acompanhantes) ? it.acompanhantes.length : 0), 0);
    }, 0);

    $("#ac-h-kpi-ev").textContent  = String(totalEventsN);
    $("#ac-h-kpi-inv").textContent = String(totalInvitesN);
    $("#ac-h-kpi-pp").textContent  = String(totalPeopleN);

    if (!index.length) {
      $("#ac-h-tbody").innerHTML = `<tr><td colspan="4">${labels.empty}</td></tr>`;
    } else {
      $("#ac-h-tbody").innerHTML = index.map((meta, i) => {
        const p = projectsNew[i];
        const titulo = esc(p?.evento?.nome || meta?.nome || "—");
        const data   = fmtDate(p?.evento?.data);
        const conv   = (p?.lista?.length || 0);
        const updt   = new Date(meta?.updatedAt || 0).toLocaleString();
        return `<tr data-open="${meta.id}" style="cursor:pointer">
          <td>${titulo}</td><td>${data}</td><td>${conv}</td><td>${updt}</td>
        </tr>`;
      }).join("");
    }
    $("#ac-h-foot").textContent = `${totalEventsN} ${labels.kpiEvents}`;
  }};
}

export function destroy(rootEl) {
  const cleanup = _mounted.get(rootEl);
  if (cleanup) { cleanup(); _mounted.delete(rootEl); }
}
