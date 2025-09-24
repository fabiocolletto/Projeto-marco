// widgets/section1Widget.js
// Etapa 1: Evento + Organização + Anfitrião, com botão Salvar.

import * as store from "../shared/projectStore.js";
import * as bus from "../shared/marcoBus.js";

function injectStyles(el){
  const css = `
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin:10px 0}
  label{display:block;margin:6px 0;font-weight:600}
  input,select{width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px}
  .row{display:grid;grid-template-columns:repeat(12,1fr);gap:10px}
  .col-12{grid-column:span 12}.col-6{grid-column:span 6}
  .btn{background:#2563eb;color:#fff;border:none;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
  .mut{color:#64748b}
  @media (max-width:640px){.col-6{grid-column:span 12}}
  `;
  const s = document.createElement('style'); s.textContent = css; el.appendChild(s);
}

export async function mountSection1(el){
  injectStyles(el);

  el.innerHTML = `
    <div class="card">
      <h3>Dados do Evento</h3>
      <div class="row">
        <div class="col-12"><label>Nome do evento <input id="evt_nome" placeholder="Casamento Ana & Marco"></label></div>
        <div class="col-6"><label>Data <input id="evt_data" type="date"></label></div>
        <div class="col-6"><label>Hora <input id="evt_hora" type="time"></label></div>
        <div class="col-6"><label>Local <input id="evt_local" placeholder="Espaço Jardins"></label></div>
        <div class="col-6"><label>Endereço <input id="evt_endereco" placeholder="Rua, nº, cidade"></label></div>
      </div>
    </div>

    <div class="card">
      <h3>Organização <span class="mut">(cerimonialista ou empresa)</span></h3>
      <div class="row">
        <div class="col-12"><label>Tipo
          <select id="org_tipo">
            <option value="cerimonialista">Cerimonialista</option>
            <option value="empresa">Empresa</option>
          </select>
        </label></div>
        <div class="col-12"><label>Nome / Razão social <input id="org_nome" placeholder="Ex.: Carla Menezes / Minha Empresa Ltda."></label></div>
        <div class="col-6"><label>Telefone <input id="org_tel" placeholder="(41) 99999-0000"></label></div>
        <div class="col-6"><label>Rede social / site <input id="org_social" placeholder="@usuario ou https://..."></label></div>
      </div>
    </div>

    <div class="card">
      <h3>Anfitrião</h3>
      <div class="row">
        <div class="col-6"><label>Nome <input id="anfit_nome" placeholder="Ex.: Ana Souza"></label></div>
        <div class="col-6"><label>Telefone <input id="anfit_tel" placeholder="(41) 98888-0000"></label></div>
        <div class="col-12"><label>Rede social <input id="anfit_social" placeholder="@ana_souza"></label></div>
      </div>
      <div style="margin-top:10px; display:flex; gap:8px; justify-content:flex-end">
        <button id="salvar" class="btn">Salvar</button>
      </div>
    </div>
  `;

  await store.init();

  const LAST = "ac:lastProjectId";
  const $ = (s)=> el.querySelector(s);

  let activeId = localStorage.getItem(LAST);
  let active = activeId ? await store.getProject(activeId) : null;

  function hydrate(p){                                  // preenche os campos
    $("#evt_nome").value     = p?.evento?.nome     || "";
    $("#evt_data").value     = p?.evento?.data     || "";
    $("#evt_hora").value     = p?.evento?.hora     || "";
    $("#evt_local").value    = p?.evento?.local    || "";
    $("#evt_endereco").value = p?.evento?.endereco || "";

    $("#org_tipo").value   = p?.organizacao?.tipo       || "cerimonialista";
    $("#org_nome").value   = p?.organizacao?.nome       || "";
    $("#org_tel").value    = p?.organizacao?.telefone   || "";
    $("#org_social").value = p?.organizacao?.redeSocial || "";

    $("#anfit_nome").value   = p?.anfitriao?.nome       || "";
    $("#anfit_tel").value    = p?.anfitriao?.telefone   || "";
    $("#anfit_social").value = p?.anfitriao?.redeSocial || "";

    $("#salvar").disabled = !p;
  }
  function readPayload(){                               // lê o formulário
    return {
      evento: {
        nome: $("#evt_nome").value.trim(),
        data: $("#evt_data").value,
        hora: $("#evt_hora").value,
        local: $("#evt_local").value.trim(),
        endereco: $("#evt_endereco").value.trim()
      },
      organizacao: {
        tipo: $("#org_tipo").value,
        nome: $("#org_nome").value.trim(),
        telefone: $("#org_tel").value.trim(),
        redeSocial: $("#org_social").value.trim()
      },
      anfitriao: {
        nome: $("#anfit_nome").value.trim(),
        telefone: $("#anfit_tel").value.trim(),
        redeSocial: $("#anfit_social").value.trim()
      }
    };
  }

  if (active) hydrate(active);

  $("#salvar").addEventListener('click', async ()=>{
    if (!activeId) { alert('Nenhum evento ativo. Use o header para abrir/criar.'); return; }
    const partial = readPayload();
    active = await store.updateProject(activeId, partial);
    hydrate(active);
    bus.publish('marco:project-saved', { id: activeId }); // avisa o header (atualiza lista)
    alert("Salvo!");
  });

  // Quando o header trocar de evento, recarrega
  bus.subscribe('marco:project-opened', async ({ id })=>{
    activeId = id || null;
    if (!activeId){
      active = null; hydrate(null);
    } else {
      active = await store.getProject(activeId);
      hydrate(active);
    }
  });
}
