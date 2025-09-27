// shared/widget-event-form.mjs
// Widget – Formulário de edição do evento (dados cadastrais)
// Depende do projectStore v1: init, getProject(id), updateProject(id, partial)

let _mounted = new WeakMap();

export async function render(rootEl, opts = {}) {
  if (!rootEl) throw new Error("widget-event-form: container inválido");
  destroy(rootEl);

  const {
    storeSrc,
    eventId = null,            // opcional: se não vier, espera ac:open-event
    labels = {
      title: "Editar evento",
      btnSave: "Salvar",
      btnReset: "Reverter",
      statusReady: "Pronto",
      statusDirty: "Alterações não salvas",
      statusSaving: "Salvando…",
      statusSaved: "Salvo!",
      sectionEvento: "Evento",
      sectionEndereco: "Endereço",
      sectionAnfitriao: "Anfitrião",
      sectionCerimonial: "Cerimonialista",
      fNome: "Nome do evento",
      fData: "Data (AAAA-MM-DD)",
      fHora: "Hora (HH:MM)",
      fLocal: "Local",
      fLogradouro: "Logradouro",
      fNumero: "Número",
      fBairro: "Bairro",
      fCidade: "Cidade",
      fUF: "UF",
      fAnfNome: "Nome",
      fAnfTel: "Telefone",
      fAnfEmail: "E-mail",
      fCerNome: "Nome",
      fCerTel: "Telefone",
      fCerRS: "Rede social",
      empty: "Selecione um evento para editar."
    }
  } = opts;

  if (!storeSrc) throw new Error("widget-event-form: informe { storeSrc } apontando para projectStore.js");
  const store = await import(storeSrc);

  // ------- CSS (layout/responsividade) -------
  const css = `
    .ac-ef *{box-sizing:border-box}
    .ac-ef__wrap{max-width:1200px;margin:0 auto;padding:12px}
    .ac-ef__hdr{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap}
    .ac-ef__status{font-size:.9rem}
    .ac-ef__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .ac-ef__card{padding:12px}
    .ac-ef__fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .ac-ef__fields--1{grid-template-columns:1fr}
    .ac-ef__row{display:flex;flex-direction:column;gap:4px}
    .ac-ef__row label{font-size:.9rem}
    .ac-ef__row input{width:100%;padding:8px}
    .ac-ef__actions{display:flex;gap:8px;align-items:center}
    button[disabled]{opacity:.6;cursor:not-allowed}
    @media (max-width:960px){ .ac-ef__grid{grid-template-columns:1fr} }
  `;

  // ------- HTML -------
  const el = document.createElement("section");
  el.className = "ac-ef";
  el.innerHTML = `
    <style>${css}</style>
    <div class="ac-ef__wrap">
      <div class="ac-ef__hdr">
        <h2>${labels.title}</h2>
        <div class="ac-ef__actions">
          <button id="ac-ef-save" disabled>${labels.btnSave}</button>
          <button id="ac-ef-reset" disabled>${labels.btnReset}</button>
          <span class="ac-ef__status" id="ac-ef-status">${labels.statusReady}</span>
        </div>
      </div>

      <div id="ac-ef-empty" style="opacity:.8">${labels.empty}</div>

      <div id="ac-ef-form" hidden>
        <div class="ac-ef__grid">
          <div class="ac-ef__card">
            <h3>${labels.sectionEvento}</h3>
            <div class="ac-ef__fields ac-ef__fields--1">
              <div class="ac-ef__row"><label for="ev-nome">${labels.fNome}</label><input id="ev-nome" type="text"></div>
            </div>
            <div class="ac-ef__fields">
              <div class="ac-ef__row"><label for="ev-data">${labels.fData}</label><input id="ev-data" type="date" pattern="\\d{4}-\\d{2}-\\d{2}"></div>
              <div class="ac-ef__row"><label for="ev-hora">${labels.fHora}</label><input id="ev-hora" type="time" pattern="\\d{2}:\\d{2}"></div>
            </div>
            <div class="ac-ef__fields ac-ef__fields--1">
              <div class="ac-ef__row"><label for="ev-local">${labels.fLocal}</label><input id="ev-local" type="text"></div>
            </div>
          </div>

          <div class="ac-ef__card">
            <h3>${labels.sectionEndereco}</h3>
            <div class="ac-ef__fields">
              <div class="ac-ef__row"><label for="ev-log">${labels.fLogradouro}</label><input id="ev-log" type="text"></div>
              <div class="ac-ef__row"><label for="ev-num">${labels.fNumero}</label><input id="ev-num" type="text"></div>
            </div>
            <div class="ac-ef__fields">
              <div class="ac-ef__row"><label for="ev-bai">${labels.fBairro}</label><input id="ev-bai" type="text"></div>
              <div class="ac-ef__row"><label for="ev-cid">${labels.fCidade}</label><input id="ev-cid" type="text"></div>
            </div>
            <div class="ac-ef__fields ac-ef__fields--1">
              <div class="ac-ef__row"><label for="ev-uf">${labels.fUF}</label><input id="ev-uf" type="text" maxlength="2"></div>
            </div>
          </div>

          <div class="ac-ef__card">
            <h3>${labels.sectionAnfitriao}</h3>
            <div class="ac-ef__fields">
              <div class="ac-ef__row"><label for="anf-nome">${labels.fAnfNome}</label><input id="anf-nome" type="text"></div>
              <div class="ac-ef__row"><label for="anf-tel">${labels.fAnfTel}</label><input id="anf-tel" type="tel" inputmode="tel"></div>
            </div>
            <div class="ac-ef__fields ac-ef__fields--1">
              <div class="ac-ef__row"><label for="anf-email">${labels.fAnfEmail}</label><input id="anf-email" type="email"></div>
            </div>
          </div>

          <div class="ac-ef__card">
            <h3>${labels.sectionCerimonial}</h3>
            <div class="ac-ef__fields">
              <div class="ac-ef__row"><label for="cer-nome">${labels.fCerNome}</label><input id="cer-nome" type="text"></div>
              <div class="ac-ef__row"><label for="cer-tel">${labels.fCerTel}</label><input id="cer-tel" type="tel" inputmode="tel"></div>
            </div>
            <div class="ac-ef__fields ac-ef__fields--1">
              <div class="ac-ef__row"><label for="cer-rs">${labels.fCerRS}</label><input id="cer-rs" type="text" placeholder="@usuario / link"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ------------- estado -------------
  const $ = (sel) => el.querySelector(sel);
  const status = $("#ac-ef-status");
  const btnSave = $("#ac-ef-save");
  const btnReset = $("#ac-ef-reset");
  const emptyBox = $("#ac-ef-empty");
  const formBox = $("#ac-ef-form");

  let loadedId = null;
  let current = null; // snapshot persistido
  let draft = null;   // rascunho

  const phoneDigits = (v) => { let d=(v||"").replace(/\D/g,""); if (d.startsWith("55") && d.length>11) d=d.slice(2); return d.slice(-11); };

  function setStatus(t){ status.textContent = t; }
  function setDirtyUI(isDirty){
    btnSave.disabled = !isDirty;
    btnReset.disabled = !isDirty;
    setStatus(isDirty ? labels.statusDirty : labels.statusReady);
  }
  function deepClone(o){ return globalThis.structuredClone ? structuredClone(o) : JSON.parse(JSON.stringify(o)); }

  // ------------- carregar evento -------------
  async function loadEvent(id){
    if (!id) return;
    setStatus(labels.statusReady);
    const p = await store.getProject(id);
    current = normalize(p);
    draft = deepClone(current);
    loadedId = id;
    fillForm(draft);
    emptyBox.hidden = true;
    formBox.hidden = false;
    setDirtyUI(false);
  }

  // normaliza shape aditivo (compatível com ensureShape do store)
  function normalize(p){
    p ||= {};
    p.evento ||= {};
    p.evento.endereco ||= {};
    p.evento.anfitriao ||= {};
    p.cerimonialista ||= { nomeCompleto:"", telefone:"", redeSocial:"" };
    return p;
  }

  // ------------- binding do form -------------
  const fields = {
    "ev-nome":   { get: () => draft.evento.nome, set: v => draft.evento.nome = v },
    "ev-data":   { get: () => draft.evento.data, set: v => draft.evento.data = v },
    "ev-hora":   { get: () => draft.evento.hora, set: v => draft.evento.hora = v },
    "ev-local":  { get: () => draft.evento.local, set: v => draft.evento.local = v },

    "ev-log":    { get: () => draft.evento.endereco.logradouro, set: v => draft.evento.endereco.logradouro = v },
    "ev-num":    { get: () => draft.evento.endereco.numero, set: v => draft.evento.endereco.numero = v },
    "ev-bai":    { get: () => draft.evento.endereco.bairro, set: v => draft.evento.endereco.bairro = v },
    "ev-cid":    { get: () => draft.evento.endereco.cidade, set: v => draft.evento.endereco.cidade = v },
    "ev-uf":     { get: () => draft.evento.endereco.uf, set: v => draft.evento.endereco.uf = v?.toUpperCase().slice(0,2) },

    "anf-nome":  { get: () => draft.evento.anfitriao.nome, set: v => draft.evento.anfitriao.nome = v },
    "anf-tel":   { get: () => draft.evento.anfitriao.telefone, set: v => draft.evento.anfitriao.telefone = phoneDigits(v) },
    "anf-email": { get: () => draft.evento.anfitriao.email, set: v => draft.evento.anfitriao.email = v },

    "cer-nome":  { get: () => draft.cerimonialista.nomeCompleto, set: v => draft.cerimonialista.nomeCompleto = v },
    "cer-tel":   { get: () => draft.cerimonialista.telefone, set: v => draft.cerimonialista.telefone = phoneDigits(v) },
    "cer-rs":    { get: () => draft.cerimonialista.redeSocial, set: v => draft.cerimonialista.redeSocial = v },
  };

  function fillForm(d){
    for (const id in fields) {
      const input = el.querySelector("#"+id);
      if (!input) continue;
      const val = fields[id].get() ?? "";
      input.value = val;
    }
  }

  function bindInputs(){
    el.addEventListener("input", (e) => {
      const id = e.target?.id;
      if (!fields[id]) return;
      fields[id].set(e.target.value ?? "");
      const dirty = JSON.stringify(draft) !== JSON.stringify(current);
      setDirtyUI(dirty);
    });
  }

  // ------------- ações -------------
  el.addEventListener("click", async (e) => {
    const saveBtn = e.target.closest && e.target.closest("#ac-ef-save");
    const resetBtn = e.target.closest && e.target.closest("#ac-ef-reset");

    if (saveBtn) {
      if (!loadedId) return;
      try {
        setStatus(labels.statusSaving);
        const partial = { evento: draft.evento, cerimonialista: draft.cerimonialista };
        const saved = await store.updateProject(loadedId, partial);
        current = normalize(saved);
        draft = deepClone(current);
        setDirtyUI(false);
        setStatus(labels.statusSaved);
      } catch (err) {
        console.error(err);
        setStatus("Erro ao salvar");
        alert(err?.message || "Falha ao salvar");
      }
      return;
    }

    if (resetBtn) {
      if (!current) return;
      draft = deepClone(current);
      fillForm(draft);
      setDirtyUI(false);
      return;
    }
  });

  // ------------- wiring -------------
  rootEl.replaceChildren(el);
  bindInputs();

  // carrega por eventId inicial
  if (eventId) await loadEvent(eventId);

  // ouve eventos globais para abrir um evento
  const onOpen = async (e) => {
    const id = e.detail?.id;
    if (!id) return;
    await loadEvent(id);
  };
  rootEl.addEventListener("ac:open-event", onOpen);
  const onOpenDoc = (e) => onOpen(e);
  document.addEventListener("ac:open-event", onOpenDoc);

  // cleanup
  _mounted.set(rootEl, () => {
    rootEl.removeEventListener("ac:open-event", onOpen);
    document.removeEventListener("ac:open-event", onOpenDoc);
  });

  return { loadEvent };
}

export function destroy(rootEl){
  const cleanup = _mounted.get(rootEl);
  if (cleanup) { cleanup(); _mounted.delete(rootEl); }
}
