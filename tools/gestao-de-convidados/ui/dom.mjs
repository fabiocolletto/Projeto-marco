// tools/gestao-de-convidados/ui/dom.mjs
export const qs = (sel, el=document) => el.querySelector(sel);
export const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));
export const el = (tag, attrs={}) => Object.assign(document.createElement(tag), attrs);
export function on(root, evt, sel, fn){
  root.addEventListener(evt, (e)=>{
    const target = e.target.closest(sel);
    if(target) fn(e);
  });
}
export function spinner(){ return '<div class="ac-spinner" role="status">Carregando…</div>'; }
export function mount(container, html){ container.innerHTML = html; }
export function showToast(msg, type='info'){
  console[type==='error'?'error':'log']('[AC]', msg);
}
// CSS base minimalista e namespaced, herdando tipografia do site
export function cssBase(){
  return `
  .ac-app .ac-header{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:12px;}
  .ac-app .ac-tabs a{padding:6px 10px;border-radius:6px;text-decoration:none;border:1px solid transparent;}
  .ac-app .ac-tabs a.active{border-color:currentColor;}
  .ac-app .ac-status{margin-left:auto;font-size:.9em;opacity:.7}
  .ac-app .ac-table{width:100%;border-collapse:collapse;font-size:0.95em}
  .ac-app .ac-table th,.ac-app .ac-table td{border-bottom:1px solid rgba(0,0,0,.1);padding:8px;vertical-align:middle}
  .ac-app .ac-actions{margin-top:8px;display:flex;gap:8px;flex-wrap:wrap}
  .ac-app .ac-actions-col{display:flex;gap:6px;flex-wrap:wrap}
  .ac-app button{padding:6px 10px;border-radius:6px;border:1px solid rgba(0,0,0,.2);background:#fff;cursor:pointer}
  .ac-app button.ac-primary{background:#f5f5ff;border-color:#bdbdff}
  .ac-app button.ac-danger{background:#fff5f5;border-color:#ffbdbd}
  .ac-app .ac-spinner{padding:16px}
  .ac-app .ac-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .ac-app .ac-card{border:1px solid rgba(0,0,0,.1);border-radius:8px;padding:12px}
  .ac-app .ac-form-row{display:flex;gap:8px;align-items:center}
  .ac-app .ac-form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  .ac-app .ac-section-block{margin-block:12px}
  .ac-app .ac-pre{white-space:pre-wrap}
  .ac-app .ac-table-wrap{overflow:auto}
  .ac-app textarea,.ac-app input,.ac-app select{padding:6px 8px;border-radius:6px;border:1px solid rgba(0,0,0,.2);width:100%}
  .ac-app .ac-muted{opacity:.7;font-size:.9em}
  .ac-app .ac-badge{display:inline-block;padding:.1em .5em;border-radius:999px;border:1px solid rgba(0,0,0,.2);font-size:.85em}
  .ac-app .ac-badge--pendente{background:#fffbe6}
  .ac-app .ac-badge--confirmado_total{background:#eaffea}
  .ac-app .ac-badge--confirmado_parcial{background:#f0fff8}
  .ac-app .ac-badge--ausente{background:#ffeeee}
  /* Drawer */
  .ac-app .ac-drawer{position:fixed;inset:0;z-index:9999}
  .ac-app .ac-drawer__overlay{position:absolute;inset:0;background:rgba(0,0,0,.4)}
  .ac-app .ac-drawer__panel{position:absolute;right:0;top:0;bottom:0;width:min(520px,100%);background:#fff;display:flex;flex-direction:column;box-shadow:-2px 0 12px rgba(0,0,0,.2)}
  .ac-app .ac-drawer__header{display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid rgba(0,0,0,.1)}
  .ac-app .ac-drawer__content{padding:12px;overflow:auto;flex:1}
  .ac-app .ac-drawer__footer{padding:12px;border-top:1px solid rgba(0,0,0,.1);display:flex;gap:8px;justify-content:flex-end}
  .ac-app .ac-fieldset{border:1px solid rgba(0,0,0,.1);border-radius:8px;padding:8px;margin-top:8px}
  .ac-app .ac-rsvp{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  @media (max-width: 860px){ .ac-app .ac-grid-2{grid-template-columns:1fr} .ac-app .ac-form-grid{grid-template-columns:1fr} .ac-app .ac-rsvp{grid-template-columns:1fr} }
  `;
}
