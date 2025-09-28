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
  .ac-app .ac-header{display:flex;flex-direction:column;gap:12px;margin-bottom:16px;}
  .ac-app .ac-header__top{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  .ac-app .ac-brand{display:flex;align-items:center;gap:12px}
  .ac-app .ac-menu{position:relative}
  .ac-app .ac-menu button{font-size:.9em}
  .ac-app .ac-menu__panel{position:absolute;top:calc(100% + 4px);left:0;background:var(--ac-surface,#fff);border:1px solid rgba(0,0,0,.12);border-radius:8px;box-shadow:0 8px 18px rgba(0,0,0,.12);padding:8px;display:flex;flex-direction:column;gap:4px;min-width:180px;z-index:10}
  .ac-app .ac-menu__panel button{width:100%;justify-content:flex-start}
  .ac-app .ac-menu__panel hr{border:none;border-top:1px solid rgba(0,0,0,.08);margin:4px 0}
  .ac-app .ac-project-picker{display:flex;flex-direction:column;font-size:.85em;gap:4px}
  .ac-app .ac-project-picker select{min-width:220px}
  .ac-app .ac-tabs{display:flex;flex-wrap:wrap;gap:8px}
  .ac-app .ac-tabs a{padding:6px 12px;border-radius:999px;text-decoration:none;border:1px solid transparent;color:inherit}
  .ac-app .ac-tabs a.active{border-color:currentColor;background:rgba(0,0,0,.05)}
  .ac-app .ac-status{margin-left:auto;font-size:.9em;opacity:.75}
  .ac-app .ac-table{width:100%;border-collapse:collapse;font-size:0.95em}
  .ac-app .ac-table th,.ac-app .ac-table td{border-bottom:1px solid rgba(0,0,0,.12);padding:8px;vertical-align:middle}
  .ac-app .ac-actions{margin-top:8px;display:flex;gap:8px;flex-wrap:wrap}
  .ac-app .ac-actions-col{display:flex;gap:6px;flex-wrap:wrap}
  .ac-app button{padding:6px 12px;border-radius:6px;border:1px solid rgba(0,0,0,.18);background:var(--ac-surface,#fff);cursor:pointer;font:inherit}
  .ac-app button.ac-primary{background:rgba(80,90,255,.08);border-color:rgba(80,90,255,.35)}
  .ac-app button.ac-danger{background:rgba(255,80,80,.08);border-color:rgba(255,80,80,.35)}
  .ac-app button.ac-link{background:none;border:none;color:inherit;text-decoration:underline;padding:0}
  .ac-app .ac-spinner{padding:16px}
  .ac-app .ac-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
  .ac-app .ac-card{border:1px solid rgba(0,0,0,.1);border-radius:10px;padding:16px;background:var(--ac-surface,#fff);display:flex;flex-direction:column;gap:8px}
  .ac-app .ac-form-row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
  .ac-app .ac-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
  .ac-app .ac-section-block{margin-block:16px}
  .ac-app .ac-pre{white-space:pre-wrap}
  .ac-app .ac-table-wrap{overflow:auto;border:1px solid rgba(0,0,0,.08);border-radius:10px}
  .ac-app textarea,.ac-app input,.ac-app select{padding:6px 8px;border-radius:6px;border:1px solid rgba(0,0,0,.2);background:var(--ac-surface,#fff);font:inherit}
  .ac-app textarea{min-height:120px}
  .ac-app .ac-muted{opacity:.7;font-size:.9em}
  .ac-app .ac-badge{display:inline-block;padding:.1em .6em;border-radius:999px;border:1px solid rgba(0,0,0,.18);font-size:.85em;text-transform:capitalize}
  .ac-app .ac-badge--pendente{background:#fff7da}
  .ac-app .ac-badge--confirmado_total{background:#e6ffef}
  .ac-app .ac-badge--confirmado_parcial{background:#effcff}
  .ac-app .ac-badge--ausente{background:#ffeaea}
  .ac-app .ac-toolbar{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}
  .ac-app .ac-toolbar label{display:flex;flex-direction:column;font-size:.85em;gap:4px}
  .ac-app .ac-dashboard{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
  .ac-app .ac-dashboard__title{font-size:1.1em;font-weight:600;margin:4px 0}
  .ac-app .ac-dashboard__list{display:grid;gap:4px;font-size:.95em}
  .ac-app .ac-dashboard__list div{display:flex;justify-content:space-between;gap:12px}
  .ac-app .ac-kpis{display:flex;flex-wrap:wrap;gap:12px;font-size:.9em}
  .ac-app .ac-kpis div{display:flex;flex-direction:column;gap:2px}
  .ac-app .ac-kpis strong{font-size:1.3em}
  .ac-app .ac-alert{margin-top:12px;padding:10px;border-radius:8px;border:1px solid rgba(255,160,0,.3);background:rgba(255,200,0,.12);font-size:.9em}
  .ac-app .ac-modelos{display:grid;gap:12px}
  .ac-app .ac-modelo{border:1px solid rgba(0,0,0,.08);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px}
  .ac-app .ac-modelo header{display:flex;justify-content:space-between;align-items:center;gap:8px}
  .ac-app .ac-modelo small{text-transform:uppercase;font-size:.7em;letter-spacing:.05em;opacity:.7}
  .ac-app .ac-drawer{position:fixed;inset:0;z-index:9999}
  .ac-app .ac-drawer__overlay{position:absolute;inset:0;background:rgba(0,0,0,.45)}
  .ac-app .ac-drawer__panel{position:absolute;right:0;top:0;bottom:0;width:min(560px,100%);background:var(--ac-surface,#fff);display:flex;flex-direction:column;box-shadow:-2px 0 16px rgba(0,0,0,.25)}
  .ac-app .ac-drawer__header{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid rgba(0,0,0,.1)}
  .ac-app .ac-drawer__content{padding:16px;overflow:auto;flex:1;display:flex;flex-direction:column;gap:16px}
  .ac-app .ac-drawer__footer{padding:16px;border-top:1px solid rgba(0,0,0,.1);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .ac-app .ac-drawer__footer-left,.ac-app .ac-drawer__footer-right{display:flex;gap:8px;flex-wrap:wrap}
  .ac-app .ac-fieldset{border:1px solid rgba(0,0,0,.12);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px}
  .ac-app .ac-rsvp{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
  .ac-app .ac-rsvp__names{display:flex;flex-direction:column;gap:6px}
  .ac-app .ac-link{cursor:pointer}
  @media (max-width: 860px){
    .ac-app .ac-grid-2{grid-template-columns:1fr}
    .ac-app .ac-header__top{flex-direction:column;align-items:flex-start}
    .ac-app .ac-status{margin-left:0}
  }
  `;
}
