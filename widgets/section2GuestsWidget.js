// widgets/section2GuestsWidget.js
// Etapa 2 — Convidados com duas colunas:
//  esquerda: textarea (linhas -> convites) + "Adicionar" (incremental)
//  direita: tabela de convites com seq, titular, acompanhantes, telefone, total, editar/excluir
//
// Depende de: shared/ui.css, shared/projectStore.js, shared/marcoBus.js,
//             shared/listUtils.js (normalização) e shared/inviteUtils.js (parser de linha)

import * as store from "../shared/projectStore.js";
import * as bus   from "../shared/marcoBus.js";
import { parsePlainList } from "../shared/listUtils.js"; // para estatística básica do textarea
import { parseInvites, parseInviteLine, invitesToCSV, uid } from "../shared/inviteUtils.js";

export async function mountSection2(el) {
  el.innerHTML = `
    <div class="card">
      <h2>Convidados</h2>
      <p class="mut">Cada linha representa um convite. Use vírgulas para acompanhantes.<br>
      Ex.: <code>Fabio, Ludi 41 99999-0000</code> → Titular "Fabio", acompanhante "Ludi", telefone reconhecido e padronizado.</p>

      <div class="row">
        <!-- Coluna esquerda: entrada -->
        <div class="col-6 md-col-12">
          <label>Lista (entrada bruta)
            <textarea id="taLista" rows="10" placeholder="Ex.:&#10;Fabio, Ludi 41 99999-0000&#10;Fabio Ludi 41 99999-0000&#10;Ana Souza"></textarea>
          </label>
          <div id="stats" class="mut" style="margin-top:6px"></div>
          <div class="actions mt-2">
            <button id="btnAddLines" class="btn">Adicionar linha(s) à lista</button>
            <button id="btnClearTA" class="btn ghost">Limpar campo</button>
          </div>
        </div>

        <!-- Coluna direita: lista de convites -->
        <div class="col-6 md-col-12">
          <div class="row">
            <div class="col-12">
              <div class="actions" style="justify-content:space-between">
                <div class="mut"><strong id="kpiConvites">0 convites</strong> · <span id="kpiPessoas">0 pessoas</span></div>
                <div>
                  <button id="btnExport" class="btn ghost">Exportar CSV</button>
                  <button id="btnSalvar" class="btn">Salvar</button>
                </div>
              </div>
            </div>
            <div class="col-12">
              <div class="card" style="padding:0">
                <table class="table" id="tbl">
                  <thead>
                    <tr>
                      <th style="width:56px">#</th>
                      <th>Titular</th>
                      <th>Acompanhantes</th>
                      <th style="width:160px">Telefone</th>
                      <th style="width:90px">Total</th>
                      <th style="width:120px">Ações</th>
                    </tr>
                  </thead>
                  <tbody id="tbody"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div> <!-- row -->
    </div>

    <div class="actions-sticky">
      <span class="mut">Dica: você pode adicionar aos poucos. Só precisa salvar quando terminar.</span>
    </div>
  `;

  await store.init();

  const LAST = "ac:lastProjectId";
  const $ = (s)=> el.querySelector(s);

  let activeId = localStorage.getItem(LAST);
  let active   = activeId ? await store.getProject(activeId) : null;

  // Estado local deste widget (convites estruturados)
  let convites = []; // { id, titular, acompanhantes[], telefone|null, total }
  let dirty = false;

  // ------- UI helpers -------
  function renderStatsTA() {
    const txt = $("#taLista").value;
    const parsed = parsePlainList(txt); // só para feedback bruto/únicos/filtrados
    const { rawCount, items, duplicates, filtered = [] } = parsed;
    const dup = duplicates.length ? ` • duplicados removidos: ${duplicates.length}` : '';
    const fil = filtered.length   ? ` • filtrados (numéricos): ${filtered.length}`    : '';
    $("#stats").textContent = `itens brutos: ${rawCount} • únicos (nomes normalizados): ${items.length}${dup}${fil}`;
  }

  function renderTable() {
    const tbody = $("#tbody"); tbody.innerHTML = "";
    let totalPessoas = 0;
    convites.forEach((c, idx) => {
      totalPessoas += (c.total ?? (1 + (c.acompanhantes?.length || 0)));
      const tr = document.createElement('tr'); tr.dataset.id = c.id;

      const acomp = c.acompanhantes?.length ? c.acompanhantes.join(' + ') : '';
      tr.innerHTML = `
        <td>${idx+1}</td>
        <td>${escapeHtml(c.titular)}</td>
        <td>${escapeHtml(acomp)}</td>
        <td>${escapeHtml(c.telefone || '')}</td>
        <td>${c.total ?? (1 + (c.acompanhantes?.length || 0))}</td>
        <td>
          <button class="btn ghost btnEdit">Editar</button>
          <button class="btn danger btnDel">Excluir</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    $("#kpiConvites").textContent = `${convites.length} convite(s)`;
    $("#kpiPessoas").textContent  = `${totalPessoas} pessoa(s)`;
    $("#btnSalvar").disabled = !activeId || !dirty;
  }

  function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function setDirty(v=true){
    dirty = !!v;
    $("#btnSalvar").disabled = !activeId || !dirty;
    if (dirty) bus.publish('marco:segment-dirty', { name: 'invites' });
  }

  // ------- carregar projeto ativo -------
  function hydrate(project){
    const stored = Array.isArray(project?.convites) ? project.convites : [];
    convites = stored.map(x => ({ ...x, id: x.id || uid() })); // garante id
    renderTable();
    renderStatsTA();
    setDirty(false);
  }

  if (active) hydrate(active); else hydrate(null);

  // ------- interações esquerda -------
  $("#taLista").addEventListener('input', renderStatsTA);

  $("#btnAddLines").addEventListener('click', ()=>{
    const txt = $("#taLista").value;
    const novos = parseInvites(txt);
    if (!novos.length) { alert('Nada para adicionar.'); return; }
    convites.push(...novos);
    $("#taLista").value = ""; // limpa depois de adicionar
    renderStatsTA();
    renderTable();
    setDirty(true);
  });

  $("#btnClearTA").addEventListener('click', ()=>{
    $("#taLista").value = "";
    renderStatsTA();
  });

  // ------- ações na tabela -------
  $("#tbody").addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if (!btn) return;
    const tr = e.target.closest('tr'); const id = tr?.dataset.id;
    const idx = convites.findIndex(c => c.id === id); if (idx === -1) return;

    if (btn.classList.contains('btnDel')) {
      if (!confirm('Excluir este convite?')) return;
      convites.splice(idx, 1);
      renderTable();
      setDirty(true);
    }
    if (btn.classList.contains('btnEdit')) {
      const c = convites[idx];
      // edição simples via prompt (rápido pro estudo). Depois podemos trocar por modal.
      const novoTit = prompt('Titular:', c.titular) ?? c.titular;
      const novoAco = prompt('Acompanhantes (separe por +):', (c.acompanhantes||[]).join(' + '));
      const novoTel = prompt('Telefone:', c.telefone ?? '') ?? c.telefone;

      c.titular = novoTit.trim() ? novoTit.trim() : c.titular;
      c.acompanhantes = (novoAco || '')
        .split('+')
        .map(s => s.trim())
        .filter(Boolean);
      c.telefone = (novoTel || '').trim() || null;
      c.total = 1 + (c.acompanhantes?.length || 0);

      renderTable();
      setDirty(true);
    }
  });

  // ------- salvar / exportar -------
  $("#btnSalvar").addEventListener('click', async ()=>{
    if (!activeId) { alert('Nenhum evento ativo. Use o header para abrir/criar.'); return; }
    // Persiste no novo campo "convites" (não quebra quem usava "lista")
    const payload = { convites };
    active = await store.updateProject(activeId, payload);
    hydrate(active);
    bus.publish('marco:project-saved', { id: activeId });
    alert('Convites salvos!');
  });

  $("#btnExport").addEventListener('click', ()=>{
    const csv = invitesToCSV(convites);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: 'convites.csv' });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // ------- eventos do header -------
  bus.subscribe('marco:project-opened', async ({ id })=>{
    activeId = id || null;
    active   = activeId ? await store.getProject(activeId) : null;
    hydrate(active);
  });

  // save-all (se o header disparar)
  bus.subscribe('marco:save-request', async ()=>{
    if (dirty && activeId) {
      await store.updateProject(activeId, { convites });
      setDirty(false);
    }
    window.dispatchEvent(new CustomEvent('marco:segment-saved', { detail: { name: 'invites' } }));
    if (activeId) bus.publish('marco:project-saved', { id: activeId });
  });
}
