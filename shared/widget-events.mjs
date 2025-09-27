// shared/widget-events.mjs
// Widget 1 – Controle de eventos (dropdown, menu de ações, status)
// Dependência: um store com a interface { listEvents, load, createNewEvent, duplicateEvent, markCompleted, deleteEvent, exportEvent, subscribe, getState, save }
//
// Uso:
//   import { render } from "https://cdn.jsdelivr.net/gh/SEU_USUARIO/SEU_REPO@main/shared/widget-events.mjs";
//   await render(document.getElementById("ac-widget-events"), { storeSrc: "https://cdn.jsdelivr.net/gh/SEU_USUARIO/SEU_REPO@main/shared/store.js" });

let _mounted = new WeakMap();

export async function render(rootEl, opts = {}) {
  if (!rootEl) throw new Error("widget-events: container inválido");
  destroy(rootEl); // garante idempotência

  const {
    storeSrc,
    labels = {
      events: "Eventos",
      selectPlaceholder: "— selecione —",
      menu: "Menu",
      newEvent: "Novo evento",
      duplicate: "Duplicar evento",
      complete: "Marcar como concluído",
      exportJson: "Exportar JSON",
      deleteEvent: "Excluir",
      loading: "Carregando…",
      saving: "Salvando…",
      dirty: "Alterações não salvas",
      savedAt: "salvo em",
      untitled: "(sem título)"
    }
  } = opts;

  if (!storeSrc) {
    throw new Error("widget-events: informe { storeSrc } apontando para seu store.js");
  }

  // carrega store
  const store = await import(storeSrc);
  const {
    listEvents, load, createNewEvent, duplicateEvent,
    markCompleted, deleteEvent, exportEvent,
    subscribe, getState
  } = store;

  // estrutura base
  const el = document.createElement("section");
  el.className = "ac-widget-events";
  el.innerHTML = `
    <style>
      /* Responsividade minimalista. Estética fica por conta do site. */
      .ac-we-row { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
      .ac-we-menu { position: relative; }
      .ac-we-menu-panel { position: absolute; top: 100%; left: 0; display: none; z-index: 10; }
      .ac-we-menu[aria-expanded="true"] .ac-we-menu-panel { display: block; }
      .ac-we-status { margin-left: auto; font-size: .875rem; }
      @media (max-width: 640px) {
        .ac-we-status { margin-left: 0; width: 100%; }
        .ac-we-row { align-items: stretch; }
        .ac-we-row select { min-width: 100% }
      }
    </style>

    <div class="ac-we-row" role="group" aria-label="Controle de eventos">
      <label class="ac-we-label" for="ac-we-select">${labels.events}:</label>
      <select id="ac-we-select" aria-label="${labels.events}"></select>

      <div class="ac-we-menu" id="ac-we-menu" aria-haspopup="true" aria-expanded="false">
        <button type="button" id="ac-we-btn">${labels.menu} ▾</button>
        <div class="ac-we-menu-panel" id="ac-we-panel" role="menu" aria-hidden="true">
          <button type="button" class="ac-we-mi" data-action="new"      role="menuitem">➕ ${labels.newEvent}</button>
          <button type="button" class="ac-we-mi" data-action="duplicate" role="menuitem">🧬 ${labels.duplicate}</button>
          <button type="button" class="ac-we-mi" data-action="complete"  role="menuitem">✅ ${labels.complete}</button>
          <button type="button" class="ac-we-mi" data-action="export"    role="menuitem">⬇️ ${labels.exportJson}</button>
          <hr>
          <button type="button" class="ac-we-mi" data-action="delete"    role="menuitem" aria-describedby="ac-we-danger">🗑️ ${labels.deleteEvent}</button>
          <span id="ac-we-danger" class="visually-hidden">Atenção: ação irreversível</span>
        </div>
      </div>

      <div class="ac-we-status" id="ac-we-status" aria-live="polite">—</div>
    </div>
  `;

  // acessibilidade mínima extra
  // (opcional: você pode aplicar classes utilitárias globais do site aqui via JS, caso use Tailwind, etc.)

  // referencias
  const $select = el.querySelector("#ac-we-select");
  const $menu    = el.querySelector("#ac-we-menu");
  const $btn     = el.querySelector("#ac-we-btn");
  const $panel   = el.querySelector("#ac-we-panel");
  const $status  = el.querySelector("#ac-we-status");

  // helpers
  const setStatus = (t) => { $status.textContent = t; };

  function openMenu() {
    $menu.setAttribute("aria-expanded", "true");
    $panel.setAttribute("aria-hidden", "false");
  }
  function closeMenu() {
    $menu.setAttribute("aria-expanded", "false");
    $panel.setAttribute("aria-hidden", "true");
  }
  function toggleMenu() {
    const expanded = $menu.getAttribute("aria-expanded") === "true";
    expanded ? closeMenu() : openMenu();
  }

  // eventos UI
  const onDocClick = (e) => {
    if (!el.contains(e.target)) closeMenu();
  };
  document.addEventListener("click", onDocClick);

  $btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  $btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault(); openMenu();
      const first = $panel.querySelector('[role="menuitem"]'); first?.focus();
    }
  });
  $panel.addEventListener("keydown", (e) => {
    const items = [...$panel.querySelectorAll('[role="menuitem"]')];
    const idx = items.indexOf(document.activeElement);
    if (e.key === "Escape") { closeMenu(); $btn.focus(); }
    if (e.key === "ArrowDown") { e.preventDefault(); items[(idx+1)%items.length]?.focus(); }
    if (e.key === "ArrowUp")   { e.preventDefault(); items[(idx-1+items.length)%items.length]?.focus(); }
  });

  $panel.addEventListener("click", async (e) => {
    const action = e.target?.dataset?.action;
    if (!action) return;
    closeMenu();
    try {
      if (action === "new") {
        const title = prompt("Título do novo evento:", labels.newEvent) || labels.newEvent;
        const id = await store.createNewEvent(title);
        setStatus(labels.loading);
        await load(id);
        await refreshSelect(id);
      }
      if (action === "duplicate") {
        const id = $select.value;
        if (!id) return alert("Selecione um evento.");
        const newId = await store.duplicateEvent(id);
        setStatus(labels.loading);
        await load(newId);
        await refreshSelect(newId);
      }
      if (action === "complete") {
        const id = $select.value;
        if (!id) return alert("Selecione um evento.");
        await store.markCompleted(id);
        await refreshSelect(id);
      }
      if (action === "export") {
        const id = $select.value;
        if (!id) return alert("Selecione um evento.");
        await store.exportEvent(id);
      }
      if (action === "delete") {
        const id = $select.value;
        if (!id) return alert("Selecione um evento.");
        if (!confirm("Excluir este evento? Esta ação não pode ser desfeita.")) return;
        await store.deleteEvent(id);
        await refreshSelect(null);
        // zera status visual se apagou o atual
        const s = getState?.();
        if (!s?.current) setStatus("—");
      }
    } catch (err) {
      console.error(err);
      alert(err?.message || "Falha na ação.");
    }
  });

  $select.addEventListener("change", async () => {
    const id = $select.value;
    if (!id) return;
    try {
      setStatus(labels.loading);
      await load(id);
    } catch (e) {
      console.error(e);
      alert("Falha ao carregar evento.");
    }
  });

  async function refreshSelect(selectId = null) {
    const list = await listEvents();
    $select.innerHTML = "";

    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = labels.selectPlaceholder;
    $select.appendChild(opt0);

    for (const it of list) {
      const opt = document.createElement("option");
      opt.value = it.id;
      const flag = it.status === "completed" ? "✅ " : "";
      const date = it.updated_at ? new Date(it.updated_at).toLocaleString() : "";
      opt.textContent = `${flag}${it.title || labels.untitled} · ${date}`;
      $select.appendChild(opt);
    }
    if (selectId) $select.value = selectId;
  }

  // status reativo
  function renderStatus(s) {
    if (!s) { setStatus("—"); return; }
    if (s.loading) { setStatus(labels.loading); return; }
    if (s.saving)  { setStatus(labels.saving); return; }
    if (s.dirty)   { setStatus(labels.dirty); return; }
    const title = s?.current?.event?.title || labels.untitled;
    const when  = s?.current?.saved_at ? new Date(s.current.saved_at).toLocaleString() : "—";
    const done  = s?.current?.status === "completed" ? "✅ " : "";
    setStatus(`${done}${title} · ${labels.savedAt} ${when}`);
    const id = s?.current?.event?.id;
    if (id && $select.value !== id) $select.value = id;
  }

  const unsub = subscribe(renderStatus);
  renderStatus(getState?.());

  await refreshSelect();

  // anexar ao container final
  rootEl.replaceChildren(el);

  // registrar para destroy
  _mounted.set(rootEl, () => {
    document.removeEventListener("click", onDocClick);
    unsub?.();
  });

  return { refreshSelect };
}

export function destroy(rootEl) {
  const cleanup = _mounted.get(rootEl);
  if (cleanup) {
    cleanup();
    _mounted.delete(rootEl);
  }
}
