// widgets/section2GuestsWidget.js
// Etapa 2 — Convidados: textarea -> normalização/dedupe -> salvar/importar/exportar.
// Depende de: shared/projectStore.js, shared/marcoBus.js, shared/listUtils.js
// Visual: usa shared/ui.css (sem injetar CSS aqui).

import * as store from "../shared/projectStore.js";  // IndexedDB CRUD
import * as bus   from "../shared/marcoBus.js";      // publish/subscribe entre widgets
import * as list  from "../shared/listUtils.js";     // tokenize/normalize/dedupe/CSV

export async function mountSection2(el) {
  // Opcional: modo "flat" (campos com linha inferior). Remova se preferir rounded.
  el.classList.add('form--flat');

  el.innerHTML = `
    <div class="card">
      <h2>Convidados</h2>
      <p class="mut">Cole nomes separados por linha, vírgula, ponto e vírgula ou tab. Números/telefones serão ignorados nos nomes e a lista será normalizada e deduplicada.</p>
      <div class="row">
        <div class="col-12">
          <label>Lista (entrada bruta)
            <textarea id="taLista" placeholder="Ex.: Ana Souza&#10;Bruno Lima, Carlos Prado; Daniela Alves&#10;Fábio 41 99999-0000"></textarea>
          </label>
          <div id="stats" class="mut" style="margin-top:6px"></div>
        </div>
        <div class="col-12">
          <label>Prévia normalizada
            <pre id="preview" class="card" style="white-space:pre-wrap; padding:10px; margin:6px 0 0 0; box-shadow:none"></pre>
          </label>
        </div>
      </div>
    </div>

    <div class="actions-sticky">
      <input id="csvFile" type="file" accept=".csv,text/csv" style="display:none">
      <button id="btnImport"  class="btn ghost">Importar CSV</button>
      <button id="btnExport"  class="btn ghost">Exportar CSV</button>
      <span style="flex:1"></span>
      <button id="btnSalvar"  class="btn">Salvar</button>
    </div>
  `;

  await store.init();

  const LAST = "ac:lastProjectId";
  const $ = (s) => el.querySelector(s);

  let activeId = localStorage.getItem(LAST);
  let active   = activeId ? await store.getProject(activeId) : null;
  let dirty = false;

  // Resultado corrente do parser (usado no salvar/exportar)
  let currentParse = list.parsePlainList('');

  function setDisabled(disabled) {
    ["taLista","btnImport","btnExport","btnSalvar"].forEach(id => {
      const node = $("#"+id);
      if (node) node.disabled = !!disabled;
    });
  }

  function renderPreview(result) {
    const { items, duplicates, rawCount, filtered = [] } = result;
    $("#preview").textContent = items.join("\n");
    const dup = duplicates.length ? ` • duplicados removidos: ${duplicates.length}` : '';
    const fil = filtered.length   ? ` • filtrados (numéricos): ${filtered.length}` : '';
    $("#stats").textContent = `itens brutos: ${rawCount} • únicos: ${items.length}${dup}${fil}`;
  }

  function hydrate(project) {
    const names = Array.isArray(project?.lista) ? project.lista : [];
    $("#taLista").value = names.join("\n");
    currentParse = list.parsePlainList($("#taLista").value);
    renderPreview(currentParse);
    setDisabled(!activeId);
    dirty = false;
  }

  // Estado inicial
  if (active) hydrate(active); else { setDisabled(true); renderPreview(list.parsePlainList("")); }

  // --- Interações ---
  $("#taLista").addEventListener("input", () => {
    currentParse = list.parsePlainList($("#taLista").value);
    renderPreview(currentParse);
    if (!dirty) { dirty = true; bus.publish("marco:segment-dirty", { name: "lista" }); }
  });

  $("#btnSalvar").addEventListener("click", async () => {
    if (!activeId) { alert('Nenhum evento ativo. Use o header para abrir/criar.'); return; }
    const payload = { lista: currentParse.items };
    active = await store.updateProject(activeId, payload);
    hydrate(active);
    bus.publish("marco:project-saved", { id: activeId });
    alert("Lista salva!");
  });

  $("#btnExport").addEventListener("click", async () => {
    const names = currentParse.items?.length
      ? currentParse.items
      : (Array.isArray(active?.lista) ? active.lista : []);
    const csv  = list.toCSV(names);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "convidados.csv" });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  $("#btnImport").addEventListener("click", () => $("#csvFile").click());
  $("#csvFile").addEventListener("change", async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const text = await f.text();

    // Converte CSV para nomes, normaliza e mescla com o que já está no textarea
    const incoming = list.fromCSV(text).map(list.normalizeName);
    const merged   = list.uniqueCaseInsensitive([...currentParse.items, ...incoming]);

    $("#taLista").value = merged.join("\n");
    currentParse = list.parsePlainList($("#taLista").value);
    renderPreview(currentParse);

    dirty = true;
    bus.publish("marco:segment-dirty", { name: "lista" });
    e.target.value = ""; // reset input file
  });

  // --- Eventos do header / coordenador ---
  bus.subscribe("marco:project-opened", async ({ id }) => {
    activeId = id || null;
    active   = activeId ? await store.getProject(activeId) : null;
    if (active) hydrate(active); else { setDisabled(true); $("#taLista").value = ""; renderPreview(list.parsePlainList("")); dirty = false; }
  });

  // Save-all (se o header/coordenador disparar)
  bus.subscribe("marco:save-request", async () => {
    if (dirty && activeId) {
      await store.updateProject(activeId, { lista: currentParse.items });
      dirty = false;
    }
    // sinaliza término para o coordenador (se usado)
    window.dispatchEvent(new CustomEvent("marco:segment-saved", { detail: { name: "lista" } }));
    if (activeId) bus.publish("marco:project-saved", { id: activeId });
  });
}
