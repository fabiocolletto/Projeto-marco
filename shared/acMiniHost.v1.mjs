// acMiniHost.v1.mjs — Mini‑apps Host (overlay + painel)
// Patch: adiciona fundo sólido ao painel e backdrop opcional para leitura
// Uso: 
//  1) Importe este módulo no HTML e chame init(bus)
//  2) Garanta que o card do mini‑app tenha a classe `ac-mini` e um painel interno:
//     <div class="mini kpi ac-mini" id="kpi_tasks" data-state="collapsed" data-overlay="true">
//       ... título/botões ...
//       <div class="miniapp__panel" id="miniapp-tarefas-panel"></div>
//     </div>
//  3) O botão ✎ deve ter classe .js-edit para abrir. Um botão .js-close fecha.

export function init(bus){
  injectStyles();
  // Abre/fecha via delegação
  document.addEventListener('click', (ev)=>{
    const editBtn = ev.target.closest('.ac-mini .js-edit');
    if(editBtn){ const host = editBtn.closest('.ac-mini'); if(host){ openMini(host); ev.preventDefault(); }}
    const closeBtn = ev.target.closest('.ac-mini .js-close');
    if(closeBtn){ const host = closeBtn.closest('.ac-mini'); if(host){ closeMini(host); ev.preventDefault(); }}
    // Clicar no backdrop (quando habilitado) fecha
    const backdropHit = ev.target?.classList?.contains('ac-mini__backdrop');
    if(backdropHit){ const host = ev.target.closest('.ac-mini'); if(host) closeMini(host); }
  });
  // Esc fecha quando expandido
  window.addEventListener('keydown', (e)=>{
    if(e.key==='Escape'){
      document.querySelectorAll('.ac-mini[data-state="expanded"]').forEach(closeMini);
    }
  });

  // Se o painel não tiver header, injeta um header simples com botão fechar
  const observer = new MutationObserver((muts)=>{
    muts.forEach(m=>{
      m.addedNodes?.forEach(node=>{
        if(!(node instanceof HTMLElement)) return;
        if(node.matches('.ac-mini .miniapp__panel')) ensurePanelHeader(node);
        node.querySelectorAll?.('.ac-mini .miniapp__panel')?.forEach(ensurePanelHeader);
      });
    });
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
}

export function openMini(host){ if(!host) return; host.dataset.state='expanded'; ensureBackdrop(host); }
export function closeMini(host){ if(!host) return; host.dataset.state='collapsed'; removeBackdrop(host); }

function ensurePanelHeader(panel){
  if(!(panel instanceof HTMLElement)) return;
  if(panel.dataset.headerReady==='1') return;
  // Se já houver header dentro, não duplica
  if(panel.querySelector('.miniapp__header')){ panel.dataset.headerReady='1'; return; }
  const header = document.createElement('div');
  header.className = 'miniapp__header';
  const h = document.createElement('h3'); h.textContent = panel.getAttribute('data-title')||'Detalhes';
  const x = document.createElement('button'); x.className='js-close miniapp__close'; x.setAttribute('aria-label','Fechar'); x.textContent='×';
  header.append(h,x);
  panel.prepend(header);
  panel.dataset.headerReady='1';
}

function ensureBackdrop(host){
  if(host.dataset.overlay!=='true') return; // só cria quando habilitado no host
  if(host.querySelector('.ac-mini__backdrop')) return;
  const bd = document.createElement('div');
  bd.className = 'ac-mini__backdrop';
  host.prepend(bd); // atrás do painel (z-index cuida das camadas)
}
function removeBackdrop(host){
  const bd = host.querySelector('.ac-mini__backdrop');
  if(bd) bd.remove();
}

function injectStyles(){
  if(document.getElementById('ac-mini-host-styles')) return;
  const css = `
  /* Host básico */
  .ac-mini{ position:relative; }
  .ac-mini .label{ display:flex; align-items:center; justify-content:space-between; gap:.5rem; }

  /* Backdrop opcional (quando data-overlay="true") */
  .ac-mini .ac-mini__backdrop{ display:none; position:fixed; inset:0; background:rgba(17,24,39,.35); z-index:14; }
  .ac-mini[data-state="expanded"] .ac-mini__backdrop{ display:block; }

  /* Painel do mini‑app com fundo sólido e sombra (não transparente) */
  .ac-mini .miniapp__panel{ display:none; position:absolute; inset:0; z-index:20; background:#fff; color:inherit; border-radius:12px; box-shadow:0 12px 30px rgba(0,0,0,.18); padding:16px; overflow:auto; }
  .ac-mini[data-state="expanded"] .miniapp__panel{ display:block; }

  /* Cabeçalho do painel */
  .miniapp__header{ display:flex; align-items:center; justify-content:space-between; gap:.75rem; margin-bottom:8px; border-bottom:1px solid #e5e7eb; padding-bottom:8px; }
  .miniapp__header h3{ margin:0; font-size:1rem; color:#0b65c2; }
  .miniapp__close{ background:none; border:0; font-size:22px; line-height:1; cursor:pointer; color:#334155; }
  .miniapp__close:hover{ color:#111827; }

  /* Garante que a barra de progresso fique visível em 0% (track com fundo) */
  .ac-mini .progress__track{ background:#eef2f6; border-radius:6px; height:10px; overflow:hidden; }
  .ac-mini .progress__bar{ background:#0b65c2; height:10px; border-radius:6px; }
  `;
  const st = document.createElement('style');
  st.id = 'ac-mini-host-styles';
  st.textContent = css;
  document.head.appendChild(st);
}
