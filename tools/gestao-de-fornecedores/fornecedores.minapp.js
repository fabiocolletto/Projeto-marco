// tools/gestao-de-fornecedores/fornecedores.minapp.js
// Mini-App Fornecedores — documento único (Web Component + Shadow DOM)
// Requisitos de uso:
//   <script type="module" src=".../Tools/gestao-de-fornecedores/fornecedores.minapp.js"></script>
//   <ac-fornecedores project-id="SEU_PROJECT_ID"></ac-fornecedores>

import { getProject, updateProject, isAvailable } from "../../shared/projectStore.js";
import { publish, subscribe } from "../../shared/marcoBus.js";
import { deriveTelefone } from "../../shared/higienizarLista.mjs";

class AcFornecedores extends HTMLElement {
  constructor(){
    super();
    this.attachShadow({ mode: "open" });
    this.state = {
      projectId: null,
      projeto: null,
      itens: [],
      filtros: { status: new Set(), categoria: new Set(), busca: "" },
      editOpen: new Set(), // ids com editor expandido
    };
    this.onBus = this.onBus.bind(this);
  }

  static get observedAttributes(){ return ["project-id"]; }
  attributeChangedCallback(name, _old, val){
    if (name === "project-id") {
      this.state.projectId = val || null;
      this.bootstrap();
    }
  }

  connectedCallback(){
    if (!this.hasAttribute("project-id")) {
      // Permite definir depois (ex.: via JS)
    }
    subscribe("project:changed", this.onBus);          // caso outro widget troque o projeto atual
    subscribe("fornecedor:created", this.onBus);
    subscribe("fornecedor:updated", this.onBus);
    subscribe("fornecedor:duplicated", this.onBus);
    subscribe("fornecedor:deleted", this.onBus);
    subscribe("fornecedor:status", this.onBus);

    this.render();
    this.bootstrap();
  }
  disconnectedCallback(){
    // sem teardown específico — o bus é leve
  }

  onBus(ev){
    // Reage apenas ao mesmo projeto
    const p = this.state.projectId;
    if (!p) return;
    const { projectId } = ev || {};
    if (projectId && projectId !== p) return;
    // Atualiza da fonte única
    this.load();
  }

  async bootstrap(){
    if (!this.state.projectId) { this.render(); return; }
    if (!isAvailable()) {
      this.renderError("Seu navegador não permite armazenamento local (IndexedDB).");
      return;
    }
    await this.load();
  }

  async load(){
    const pid = this.state.projectId;
    const projeto = await getProject(pid);
    if (!projeto) { this.renderError("Projeto não encontrado."); return; }
    // Garante nó fornecedores sem quebrar schema v2
    const itens = Array.isArray(projeto.fornecedores) ? projeto.fornecedores : [];
    this.state.projeto = projeto;
    this.state.itens = itens;
    this.render();
  }

  // ---------- Utils: moeda/telefone/data ----------

  // Converte "R$ 1.234,56" -> 123456 (centavos)
  parseBRL(str){
    const s = String(str || "").replace(/\s/g, "")
      .replace(/[Rr]\$?/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");
    const v = Number.parseFloat(s);
    if (Number.isFinite(v)) return Math.round(v * 100);
    return 0;
  }
  // 123456 (centavos) -> "R$ 1.234,56"
  formatBRL(cents){
    const v = (Number(cents || 0) / 100);
    try {
      return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    } catch { return `R$ ${v.toFixed(2).replace(".", ",")}`; }
  }

  // UI: sempre BR → DD/MM/AAAA | Interno: ISO YYYY-MM-DD
  brToISO(br){
    const m = String(br || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const [ , dd, mm, yyyy ] = m;
    // validação simples de faixa
    const D = Number(dd), M = Number(mm), Y = Number(yyyy);
    if (Y < 2000 || Y > 2100 || M < 1 || M > 12 || D < 1 || D > 31) return null;
    return `${yyyy}-${mm}-${dd}`;
  }
  isoToBR(iso){
    const s = String(iso || "");
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "";
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  // Telefone: usa deriveTelefone do higienizador
  normalizeTelefone(raw){
    const compact = String(raw || "").trim().replace(/[^\d+]/g, "");
    const res = deriveTelefone({ possiveisNumeros: [compact] }) || {};
    return { e164: res.e164 || null, nacional: res.nacional || "", tipo: res.tipo || null };
  }

  uid(){ return (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); }

  // ---------- CRUD ----------

  async addFromForm(ev){
    ev?.preventDefault?.();
    const root = this.shadowRoot;
    const f = {
      nomeFornecedor: root.querySelector("#f-nome")?.value || "",
      contato: root.querySelector("#f-contato")?.value || "",
      telefone: root.querySelector("#f-telefone")?.value || "",
      categoria: root.querySelector("#f-categoria")?.value || "",
      valorContrato: root.querySelector("#f-valor")?.value || "",
      dataEntregaBR: root.querySelector("#f-data")?.value || "",
      status: root.querySelector("#f-status")?.value || "planejado",
      observacoes: root.querySelector("#f-notas")?.value || "",
    };

    // validações mínimas
    if ((f.nomeFornecedor || "").trim().length < 3) { this.toast("Informe o nome do fornecedor."); return; }
    if (!f.categoria) { this.toast("Defina a categoria."); return; }
    const iso = this.brToISO(f.dataEntregaBR);
    if (!iso) { this.toast("Use uma data válida (DD/MM/AAAA)."); return; }

    const telFmt = this.normalizeTelefone(f.telefone);
    const cents = this.parseBRL(f.valorContrato);

    const item = {
      id: this.uid(),
      nomeFornecedor: f.nomeFornecedor.trim(),
      contato: f.contato.trim(),
      telefone: telFmt,                 // { e164, nacional, tipo }
      categoria: f.categoria.trim(),
      valorContrato: cents,             // inteiro em centavos
      moeda: "BRL",
      dataEntrega: iso,                 // ISO interno
      status: f.status,
      observacoes: f.observacoes.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const pid = this.state.projectId;
    const projeto = await getProject(pid);
    projeto.fornecedores = Array.isArray(projeto.fornecedores) ? projeto.fornecedores : [];
    projeto.fornecedores.push(item);

    await updateProject(pid, { fornecedores: projeto.fornecedores });
    publish("fornecedor:created", { projectId: pid, item });
    this.clearForm();
    this.load();
    this.toast("Fornecedor adicionado.");
  }

  async updateItem(id, changes){
    const pid = this.state.projectId;
    const projeto = await getProject(pid);
    const L = Array.isArray(projeto.fornecedores) ? projeto.fornecedores : [];
    const i = L.findIndex(x => x.id === id);
    if (i < 0) return;

    const next = { ...L[i], ...changes, updatedAt: Date.now() };
    L[i] = next;
    await updateProject(pid, { fornecedores: L });
    publish("fornecedor:updated", { projectId: pid, id, changes: { ...changes } });
    this.state.itens = L;
    this.renderKPIs();
  }

  async duplicateItem(id){
    const pid = this.state.projectId;
    const projeto = await getProject(pid);
    const L = Array.isArray(projeto.fornecedores) ? projeto.fornecedores : [];
    const it = L.find(x => x.id === id);
    if (!it) return;
    const copy = {
      ...it,
      id: this.uid(),
      status: "planejado",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    L.push(copy);
    await updateProject(pid, { fornecedores: L });
    publish("fornecedor:duplicated", { projectId: pid, originalId: id, item: copy });
    this.load();
    this.toast("Duplicado.");
  }

  async deleteItem(id){
    if (!confirm("Excluir este fornecedor?")) return;
    const pid = this.state.projectId;
    const projeto = await getProject(pid);
    const L = Array.isArray(projeto.fornecedores) ? projeto.fornecedores : [];
    const out = L.filter(x => x.id !== id);
    await updateProject(pid, { fornecedores: out });
    publish("fornecedor:deleted", { projectId: pid, id });
    this.load();
    this.toast("Excluído.");
  }

  // ---------- UI ----------

  clearForm(){
    const root = this.shadowRoot;
    ["#f-nome","#f-contato","#f-telefone","#f-categoria","#f-valor","#f-data","#f-notas"].forEach(sel=>{
      const el = root.querySelector(sel);
      if (el) el.value = "";
    });
    const sel = root.querySelector("#f-status");
    if (sel) sel.value = "planejado";
  }

  toast(msg){
    const t = this.shadowRoot.querySelector(".toast");
    if (!t) return alert?.(msg) ?? console.log(msg);
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(()=> t.classList.remove("show"), 1600);
  }

  toggleEditor(id, open){
    const set = this.state.editOpen;
    if (open === true) set.add(id);
    else if (open === false) set.delete(id);
    else { if (set.has(id)) set.delete(id); else set.add(id); }
    this.renderList(); // re-render da lista
  }

  handleActionMenu(e, id){
    e.preventDefault();
    const btn = e.currentTarget;
    const menu = btn.nextElementSibling;
    const open = menu.getAttribute("data-open") === "1";
    this.shadowRoot.querySelectorAll(".row-actions[data-open='1']").forEach(m => m.setAttribute("data-open","0"));
    menu.setAttribute("data-open", open ? "0" : "1");
    // clique fora fecha
    const close = (ev)=>{
      if (!menu.contains(ev.target) && ev.target !== btn) {
        menu.setAttribute("data-open","0");
        document.removeEventListener("click", close, true);
      }
    };
    setTimeout(()=> document.addEventListener("click", close, true), 0);
  }

  changeStatus(id, status){
    this.updateItem(id, { status });
    publish("fornecedor:status", { projectId: this.state.projectId, id, status });
  }

  // campos de edição inline com autosave
  bindEditorInputs(rowEl, item){
    const saveName = (el)=> this.updateItem(item.id, { nomeFornecedor: el.value.trim() });
    const saveContato = (el)=> this.updateItem(item.id, { contato: el.value.trim() });
    const saveNota = (el)=> this.updateItem(item.id, { observacoes: el.value.trim() });
    const saveCat = (el)=> this.updateItem(item.id, { categoria: el.value.trim() });
    const saveValor = (el)=> this.updateItem(item.id, { valorContrato: this.parseBRL(el.value) });
    const saveData = (el)=> {
      const iso = this.brToISO(el.value);
      if (!iso) { this.toast("Data inválida (DD/MM/AAAA)."); el.value = this.isoToBR(item.dataEntrega); return; }
      this.updateItem(item.id, { dataEntrega: iso });
    };
    const saveTel = (el)=> {
      const t = this.normalizeTelefone(el.value);
      this.updateItem(item.id, { telefone: t });
      // reflete formatação BR no campo
      el.value = t.nacional || "";
    };

    rowEl.querySelectorAll("[data-edit]").forEach(inp=>{
      const k = inp.getAttribute("data-edit");
      if (k === "telefone") {
        inp.addEventListener("change", ()=> saveTel(inp));
        return;
      }
      if (k === "valorContrato") {
        inp.addEventListener("change", ()=> saveValor(inp));
        return;
      }
      if (k === "dataEntrega") {
        inp.addEventListener("change", ()=> saveData(inp));
        return;
      }
      if (k === "nomeFornecedor")  inp.addEventListener("change", ()=> saveName(inp));
      if (k === "contato")         inp.addEventListener("change", ()=> saveContato(inp));
      if (k === "categoria")       inp.addEventListener("change", ()=> saveCat(inp));
      if (k === "observacoes")     inp.addEventListener("change", ()=> saveNota(inp));
    });
  }

  // ---------- Render ----------

  render(){
    const pid = this.state.projectId;
    const estilos = `
      .wrap { font: 14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, sans-serif; color:#111; }
      .card { background:#fff; border:1px solid #ddd; border-radius:12px; padding:16px; margin:0 0 12px 0; position:relative; }
      .card.expanded { border-color:#ff7a00; box-shadow:0 0 0 2px rgba(255,122,0,0.15) inset; } /* borda laranja quando expandido */
      .card__title { margin:0 0 12px 0; display:flex; align-items:center; justify-content:space-between; }
      .card__title h3 { margin:0; font-size:16px; color:#0b64c3; } /* títulos com h3 como nos indicadores */
      .kpis { display:flex; flex-wrap:wrap; }
      .kpi { min-width:160px; margin-right:12px; margin-bottom:12px; padding:12px; border:1px solid #e6e6e6; border-radius:10px; background:#fafafa; }
      .kpi strong { display:block; font-size:12px; color:#333; margin-bottom:6px; }
      .kpi .v { font-size:18px; font-weight:600; }

      form.add { display:block; }
      .row { display:flex; flex-wrap:wrap; }
      .row .col { width:260px; margin:0 12px 12px 0; }
      label { display:block; font-size:12px; color:#444; margin-bottom:6px; }
      input[type="text"], input[type="tel"], input[type="date"], textarea, select {
        width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #ddd; border-radius:10px; background:#fff;
      }
      textarea { min-height:64px; }
      .actions { text-align:right; }
      .btn { display:inline-block; padding:10px 14px; border-radius:10px; border:1px solid #0b64c3; background:#0b64c3; color:#fff; cursor:pointer; }
      .btn.secondary { background:#fff; color:#0b64c3; }

      .list { border:1px solid #eee; border-radius:10px; overflow:hidden; }
      .list .head, .list .rowi { display:flex; align-items:center; }
      .list .head { background:#f5f7fb; font-weight:600; color:#333; }
      .list .head div, .list .rowi div { padding:10px; border-right:1px solid #eee; }
      .list .head div:last-child, .list .rowi div:last-child { border-right:none; }
      .c-forn{ width:220px; } .c-cont{ width:200px; } .c-tel{ width:160px; } .c-cat{ width:140px; }
      .c-val{ width:140px; text-align:right; } .c-data{ width:130px; } .c-sta{ width:140px; } .c-ops{ width:80px; text-align:center; }
      .rowi { border-top:1px solid #eee; background:#fff; }
      .rowi:nth-child(odd) { background:#fcfcfd; }

      .row-edit { padding:10px 10px 16px 10px; border-top:1px dashed #ffd1ad; background:#fff9f2; }
      .row-edit .col { width:240px; margin-right:12px; }
      .row-edit .col.wide { width:500px; }

      .status-pill { padding:4px 8px; border:1px solid #ddd; border-radius:999px; background:#fff; font-size:12px; display:inline-block; }
      .sta-pl{ border-color:#999; color:#555; } .sta-co{ border-color:#1a73e8; color:#1a73e8; }
      .sta-em{ border-color:#ff9800; color:#ff9800; } .sta-en{ border-color:#2e7d32; color:#2e7d32; }
      .sta-ca{ border-color:#b00020; color:#b00020; }

      .opbtn { width:28px; height:28px; border:1px solid #ddd; background:#fff; border-radius:8px; cursor:pointer; line-height:26px; }
      .row-actions { position:absolute; right:10px; top:36px; z-index:10; background:#fff; border:1px solid #ddd; border-radius:10px; min-width:160px; box-shadow:0 4px 16px rgba(0,0,0,0.08); display:none; }
      .row-actions[data-open="1"]{ display:block; }
      .row-actions button { display:block; width:100%; text-align:left; padding:10px 12px; border:0; background:#fff; cursor:pointer; }
      .row-actions button:hover { background:#f1f5ff; }
      .toast { position:fixed; left:50%; transform:translateX(-50%); bottom:24px; background:#111; color:#fff; padding:10px 14px; border-radius:999px; opacity:0; transition:opacity .2s ease; pointer-events:none; }
      .toast.show{ opacity:1; }

      .hint { font-size:12px; color:#666; margin-top:6px; }
      .muted { color:#777; }
      .empty { padding:12px; text-align:center; color:#666; }
      .sr { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(1px,1px,1px,1px); }
    `;

    const html = `
      <div class="wrap">
        <section class="card">
          <div class="card__title">
            <h3>Indicadores</h3>
          </div>
          <div class="kpis" id="kpis">
            <!-- preenchido no renderKPIs() -->
          </div>
        </section>

        <section class="card">
          <div class="card__title">
            <h3>Novo contrato de fornecedor</h3>
          </div>
          <form class="add" id="form-add">
            <div class="row">
              <div class="col">
                <label for="f-nome">Fornecedor*</label>
                <input id="f-nome" type="text" placeholder="Ex.: Buffet Flor de Sal" />
              </div>
              <div class="col">
                <label for="f-contato">Contato</label>
                <input id="f-contato" type="text" placeholder="Ex.: Maria Souza" />
              </div>
              <div class="col">
                <label for="f-telefone">Telefone</label>
                <input id="f-telefone" type="tel" placeholder="Ex.: (41) 99999-0000" />
                <div class="hint">Aceita BR com DDD ou internacional com “+”.</div>
              </div>
              <div class="col">
                <label for="f-categoria">Categoria*</label>
                <input id="f-categoria" type="text" list="cats" placeholder="Ex.: Buffet" />
                <datalist id="cats">
                  <option>Buffet</option><option>Decoração</option><option>Som/Luz</option>
                  <option>Fotografia</option><option>Bebidas</option><option>Doces</option>
                </datalist>
              </div>
              <div class="col">
                <label for="f-valor">Valor do contrato*</label>
                <input id="f-valor" type="text" inputmode="numeric" placeholder="R$ 0,00" />
              </div>
              <div class="col">
                <label for="f-data">Data de entrega*</label>
                <input id="f-data" type="text" placeholder="DD/MM/AAAA" />
              </div>
              <div class="col">
                <label for="f-status">Status</label>
                <select id="f-status">
                  <option value="planejado">Planejado</option>
                  <option value="contratado">Contratado</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div class="col" style="width:540px;">
                <label for="f-notas">Anotações</label>
                <textarea id="f-notas" placeholder="Observações importantes..."></textarea>
              </div>
            </div>
            <div class="actions">
              <button class="btn" id="btn-add" type="submit">Adicionar contrato</button>
            </div>
          </form>
        </section>

        <section class="card" id="list-card">
          <div class="card__title">
            <h3>Fornecedores</h3>
          </div>
          <div class="list" id="list">
            <div class="head">
              <div class="c-forn">Fornecedor</div>
              <div class="c-cont">Contato/Tel</div>
              <div class="c-cat">Categoria</div>
              <div class="c-val">Valor</div>
              <div class="c-data">Entrega</div>
              <div class="c-sta">Status</div>
              <div class="c-ops">Ações</div>
            </div>
            <!-- itens -->
          </div>
          <div id="empty" class="empty" style="display:none">Nenhum fornecedor cadastrado.</div>
        </section>
        <div class="toast" role="status" aria-live="polite"></div>
      </div>
    `;

    const root = this.shadowRoot;
    root.innerHTML = `
      <style>${estilos}</style>
      ${!pid ? `<div class="card"><div class="card__title"><h3>Fornecedores</h3></div><p class="muted">Defina o <code>project-id</code> no elemento <code>&lt;ac-fornecedores&gt;</code> para começar.</p></div>` : html}
    `;

    if (!pid) return;

    root.querySelector("#form-add")?.addEventListener("submit", (e)=> this.addFromForm(e));

    this.renderKPIs();
    this.renderList();
  }

  renderKPIs(){
    const k = this.shadowRoot.querySelector("#kpis");
    if (!k) return;
    const itens = this.state.itens || [];

    const total = itens.length;
    const soma = itens.reduce((s, it)=> s + (it.valorContrato || 0), 0);

    const hoje = new Date();
    const ymdToday = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}-${String(hoje.getDate()).padStart(2,"0")}`;

    const semanaOffsets = [0,1,2,3,4,5,6];
    const inicioSemana = new Date(hoje); inicioSemana.setDate(hoje.getDate() - hoje.getDay()); // dom
    const fimSemana = new Date(inicioSemana); fimSemana.setDate(inicioSemana.getDate()+6);

    const ymdIni = `${inicioSemana.getFullYear()}-${String(inicioSemana.getMonth()+1).padStart(2,"0")}-${String(inicioSemana.getDate()).padStart(2,"0")}`;
    const ymdFim = `${fimSemana.getFullYear()}-${String(fimSemana.getMonth()+1).padStart(2,"0")}-${String(fimSemana.getDate()).padStart(2,"0")}`;

    const entregasSemana = itens.filter(it=> it.dataEntrega >= ymdIni && it.dataEntrega <= ymdFim).length;
    const atrasados = itens.filter(it=> it.status !== "entregue" && it.dataEntrega && it.dataEntrega < ymdToday).length;

    const byStatus = (st)=> itens.filter(it=> it.status === st).length;

    k.innerHTML = `
      <div class="kpi"><strong>Total de contratos</strong><div class="v">${total}</div></div>
      <div class="kpi"><strong>Somatório</strong><div class="v">${this.formatBRL(soma)}</div></div>
      <div class="kpi"><strong>Entregas nesta semana</strong><div class="v">${entregasSemana}</div></div>
      <div class="kpi"><strong>Atrasados</strong><div class="v">${atrasados}</div></div>
      <div class="kpi"><strong>Planejados</strong><div class="v">${byStatus("planejado")}</div></div>
      <div class="kpi"><strong>Contratados</strong><div class="v">${byStatus("contratado")}</div></div>
      <div class="kpi"><strong>Em andamento</strong><div class="v">${byStatus("em_andamento")}</div></div>
      <div class="kpi"><strong>Entregues</strong><div class="v">${byStatus("entregue")}</div></div>
    `;
  }

  renderList(){
    const box = this.shadowRoot.querySelector("#list");
    const empty = this.shadowRoot.querySelector("#empty");
    if (!box) return;

    const itens = (this.state.itens || []).slice().sort((a,b)=>{
      // ordena por dataEntrega asc, depois status
      const da = a.dataEntrega || "", db = b.dataEntrega || "";
      if (da !== db) return da.localeCompare(db);
      return String(a.status||"").localeCompare(String(b.status||""));
    });

    const statusClass = (s)=> {
      if (s === "planejado") return "sta-pl";
      if (s === "contratado") return "sta-co";
      if (s === "em_andamento") return "sta-em";
      if (s === "entregue") return "sta-en";
      if (s === "cancelado") return "sta-ca";
      return "";
    };

    const rows = itens.map(it=>{
      const open = this.state.editOpen.has(it.id);
      const telBR = it.telefone?.nacional || "";
      const valBRL = this.formatBRL(it.valorContrato || 0);
      const dataBR = this.isoToBR(it.dataEntrega);

      return `
        <div class="rowi" style="position:relative;">
          <div class="c-forn">${it.nomeFornecedor || "-"}</div>
          <div class="c-cont">
            ${it.contato ? `${it.contato}<br>` : ""}
            ${telBR ? `<span class="muted">${telBR}</span>` : `<span class="muted">—</span>`}
          </div>
          <div class="c-cat">${it.categoria || "-"}</div>
          <div class="c-val">${valBRL}</div>
          <div class="c-data">${dataBR || "-"}</div>
          <div class="c-sta"><span class="status-pill ${statusClass(it.status)}">${this.labelStatus(it.status)}</span></div>
          <div class="c-ops">
            <button class="opbtn" aria-haspopup="true" title="Opções" data-act="menu">⋮</button>
            <div class="row-actions" data-open="0">
              <button data-act="edit">Editar</button>
              <button data-act="dup">Duplicar</button>
              <button data-act="del">Excluir</button>
              <hr style="border:0;border-top:1px solid #eee;margin:6px 0;">
              <button data-act="st:planejado">Marcar como Planejado</button>
              <button data-act="st:contratado">Marcar como Contratado</button>
              <button data-act="st:em_andamento">Marcar como Em andamento</button>
              <button data-act="st:entregue">Marcar como Entregue</button>
              <button data-act="st:cancelado">Marcar como Cancelado</button>
            </div>
          </div>
        </div>
        ${open ? `
          <div class="card expanded row-edit">
            <div class="row">
              <div class="col"><label class="sr">Fornecedor</label>
                <input type="text" value="${this.escape(it.nomeFornecedor||"")}" data-edit="nomeFornecedor">
              </div>
              <div class="col"><label class="sr">Contato</label>
                <input type="text" value="${this.escape(it.contato||"")}" data-edit="contato">
              </div>
              <div class="col"><label class="sr">Telefone</label>
                <input type="tel" value="${this.escape(telBR)}" data-edit="telefone">
              </div>
              <div class="col"><label class="sr">Categoria</label>
                <input type="text" value="${this.escape(it.categoria||"")}" data-edit="categoria">
              </div>
              <div class="col"><label class="sr">Valor</label>
                <input type="text" value="${this.escape(this.formatBRL(it.valorContrato||0))}" data-edit="valorContrato">
              </div>
              <div class="col"><label class="sr">Data</label>
                <input type="text" value="${this.escape(dataBR||"")}" placeholder="DD/MM/AAAA" data-edit="dataEntrega">
              </div>
              <div class="col wide"><label class="sr">Anotações</label>
                <textarea data-edit="observacoes" placeholder="Observações...">${this.escape(it.observacoes||"")}</textarea>
              </div>
            </div>
          </div>
        ` : ``}
      `;
    }).join("");

    box.querySelectorAll(".rowi + .card.expanded").forEach(el=> el.remove()); // limpa editores antigos
    box.innerHTML = `
      <div class="head">
        <div class="c-forn">Fornecedor</div>
        <div class="c-cont">Contato/Tel</div>
        <div class="c-cat">Categoria</div>
        <div class="c-val">Valor</div>
        <div class="c-data">Entrega</div>
        <div class="c-sta">Status</div>
        <div class="c-ops">Ações</div>
      </div>
      ${rows}
    `;

    empty.style.display = itens.length ? "none" : "block";

    // bind menus e editores
    const root = this.shadowRoot;
    root.querySelectorAll(".rowi").forEach((rowEl, idx)=>{
      const it = itens[idx];
      const btn = rowEl.querySelector("[data-act='menu']");
      const menu = rowEl.querySelector(".row-actions");
      btn?.addEventListener("click", (e)=> this.handleActionMenu(e, it.id));
      menu?.querySelectorAll("button").forEach(b=>{
        const act = b.getAttribute("data-act");
        if (act === "edit") b.addEventListener("click", ()=> { this.toggleEditor(it.id); menu.setAttribute("data-open","0"); });
        if (act === "dup")  b.addEventListener("click", ()=> { this.duplicateItem(it.id); menu.setAttribute("data-open","0"); });
        if (act === "del")  b.addEventListener("click", ()=> { this.deleteItem(it.id); menu.setAttribute("data-open","0"); });
        if (act?.startsWith("st:")) {
          const st = act.split(":")[1];
          b.addEventListener("click", ()=> { this.changeStatus(it.id, st); menu.setAttribute("data-open","0"); });
        }
      });

      // se editor aberto, vincula autosave
      if (this.state.editOpen.has(it.id)) {
        const editor = rowEl.nextElementSibling; // o bloco .card.expanded
        if (editor) this.bindEditorInputs(editor, it);
      }
    });
  }

  labelStatus(s){
    if (s === "planejado") return "Planejado";
    if (s === "contratado") return "Contratado";
    if (s === "em_andamento") return "Em andamento";
    if (s === "entregue") return "Entregue";
    if (s === "cancelado") return "Cancelado";
    return s || "-";
  }

  escape(s){ return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }

}

customElements.define("ac-fornecedores", AcFornecedores);
