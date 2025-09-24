// widgets/headerWidget.js
// Header persistente: selecionar/abrir evento, novo, exportar, excluir.

import * as store from "../shared/projectStore.js";
import * as bus from "../shared/marcoBus.js";

function injectStyles(el){
  const css = `
  .bar{position:sticky;top:0;background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin:8px 0;padding:10px;z-index:50;box-shadow:0 6px 14px rgba(0,0,0,.04)}
  .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  select,button{padding:10px;border:1px solid #e5e7eb;border-radius:10px}
  .btn{background:#2563eb;color:#fff;border-color:#2563eb;font-weight:700;cursor:pointer}
  .ghost{background:#fff;color:#0f172a}
  .danger{background:#ef4444;border-color:#ef4444;color:#fff}
  .mut{color:#64748b}
  `;
  const s = document.createElement('style'); s.textContent = css; el.appendChild(s);
}

export async function mountHeader(el){                  // ← exporta uma função para montar no container
  injectStyles(el);

  el.innerHTML = `
    <div class="bar">
      <div class="row">
        <strong>Assistente Cerimonial</strong>
        <span class="mut">·</span>
        <span class="mut">Eventoo ativo:</span>
        <select id="sel"></select>
        <button id="abrir"  class="ghost">Abrir</button>
        <button id="novo"   class="ghost">Novo</button>
        <button id="export" class="ghost">Exportar JSON</button>
        <button id="del"    class="danger">Excluir</button>
        <span id="kpi" class="mut"></span>
      </div>
    </div>
  `;

  await store.init();

  const LAST = "ac:lastProjectId";
  const $ = (s)=> el.querySelector(s);

  function list(){ return store.listProjects(); }       // lista meta dos projetos (mais recente primeiro)

  // escolhe ativo inicial: último usado; se inválido, o mais recente; se não existir, cria um
  async function ensureActive(){
    let id = localStorage.getItem(LAST);
    const l = list();
    if (id && !l.some(p=>p.id===id)) id = null;
    if (!id){
      if (l.length) id = l[0].id;
      else {
        const { meta } = await store.createProject({ evento:{ nome:"Novo evento" }});
        id = meta.id;
      }
      localStorage.setItem(LAST, id);
    }
    return id;
  }

  let activeId = await ensureActive();
  bus.publish('marco:project-opened', { id: activeId }); // avisa widgets logo que montar

  function renderSel(){
    const sel = $("#sel"); sel.innerHTML = "";
    for (const p of list()){
      const o = document.createElement('option');
      o.value = p.id;
      const d = new Date(p.updatedAt);
      o.textContent = `${p.nome || "Sem nome"} — ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
      if (p.id === activeId) o.selected = true;
      sel.appendChild(o);
    }
    $("#kpi").textContent = `${list().length} evento(s)`;
  }
  renderSel();

  $("#abrir").addEventListener('click', async ()=>{
    const id = $("#sel").value; if (!id) return;
    activeId = id; localStorage.setItem(LAST, id);
    bus.publish('marco:project-opened', { id });
  });

  $("#novo").addEventListener('click', async ()=>{
    const { meta } = await store.createProject({ evento:{ nome:"Novo evento" }});
    activeId = meta.id; localStorage.setItem(LAST, activeId);
    renderSel();
    bus.publish('marco:project-opened', { id: activeId });
  });

  $("#del").addEventListener('click', async ()=>{
    const id = $("#sel").value || activeId; if (!id) return;
    if (!confirm("Excluir este evento?")) return;
    await store.deleteProject(id);
    const l = list();
    if (!l.length){
      const { meta } = await store.createProject({ evento:{ nome:"Novo evento" }});
      activeId = meta.id;
    } else {
      activeId = l[0].id;
    }
    localStorage.setItem(LAST, activeId);
    renderSel();
    bus.publish('marco:project-opened', { id: activeId });
  });

  $("#export").addEventListener('click', async ()=>{
    const id = $("#sel").value || activeId; if (!id) return;
    const json = await store.exportProject(id);
    const blob = new Blob([json], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href:url, download:"evento.json" });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // quando qualquer widget salvar, atualiza o "updatedAt" e o nome na lista
  bus.subscribe('marco:project-saved', ()=> renderSel());
}
