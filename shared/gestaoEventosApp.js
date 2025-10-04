// Utilidades compartilhadas para o app de gestão de eventos
export const CDN_CANDIDATES = [
  "https://cdn.jsdelivr.net/gh/fabiocolletto/Projeto-marco@main",
  "https://rawcdn.githack.com/fabiocolletto/Projeto-marco/main"
];

async function tryImport(url){
  try {
    return await import(url);
  } catch (err) {
    try {
      const bust = url.includes('?') ? '&' : '?';
      return await import(url + bust + 't=' + Date.now());
    } catch {
      return null;
    }
  }
}

export async function loadSharedModule(rel, { candidates = CDN_CANDIDATES } = {}){
  if(!rel) return null;
  if(rel.startsWith('http://') || rel.startsWith('https://')){
    return tryImport(rel);
  }
  for(const base of candidates){
    const mod = await tryImport(base + rel);
    if(mod) return mod;
  }
  try {
    return await import(rel);
  } catch {
    return null;
  }
}

export async function loadAppModules({
  busPath = '/shared/marcoBus.js',
  storePath = '/shared/projectStore.js',
  inviteUtilsPath = '/shared/inviteUtils.js',
  candidates = CDN_CANDIDATES
} = {}){
  const [store, bus, inviteUtils] = await Promise.all([
    loadSharedModule(storePath, { candidates }),
    loadSharedModule(busPath, { candidates }),
    loadSharedModule(inviteUtilsPath, { candidates })
  ]);
  return { store, bus, inviteUtils };
}

export const dom = {
  $(selector, root = document){
    return (root || document).querySelector(selector);
  },
  $$(selector, root = document){
    return Array.from((root || document).querySelectorAll(selector));
  },
  setPill(el, kind, txt){
    if(!el) return;
    el.className = 'pill ' + kind;
    el.textContent = txt;
  }
};

const ESC_MAP = { '&':'&amp;','<':'&lt;','>':'&gt;' };
const ESC_ATTR_MAP = { ...ESC_MAP, '"':'&quot;','\'':'&#39;','`':'&#96;' };

export const text = {
  esc(value){
    return String(value ?? '').replace(/[&<>]/g, ch => ESC_MAP[ch]);
  },
  escAttr(value){
    return String(value ?? '').replace(/[&<>"'`]/g, ch => ESC_ATTR_MAP[ch]);
  }
};

export const format = {
  fmtDate(iso){
    if(!iso) return '';
    const [yyyy, mm, dd] = String(iso).split('-');
    return (yyyy && mm && dd) ? `${dd}/${mm}/${yyyy}` : '';
  },
  fmtDateTime(ts){
    return ts ? new Date(ts).toLocaleString() : '—';
  },
  fmtWhen(iso){
    if(!iso) return '';
    const [d, t = '00:00:00'] = String(iso).split('T');
    const [yyyy, mm, dd] = d.split('-');
    const hhmm = t.slice(0,5);
    return (yyyy && mm && dd) ? `${dd}/${mm}/${yyyy} ${hhmm}` : '';
  },
  fmtCurrency(value, currency = 'BRL', locale = 'pt-BR'){
    return (Number(value) || 0).toLocaleString(locale, { style: 'currency', currency });
  }
};

export function ensureProjectBase(project){
  const p = project && typeof project === 'object' ? project : {};
  p.cerimonialista ||= { nomeCompleto:"", telefone:"", redeSocial:"" };
  p.evento ||= { nome:"", data:"", hora:"", local:"", tipo:"", endereco:{}, anfitriao:{} };
  p.evento.endereco ||= {};
  p.evento.anfitriao ||= {};
  return p;
}

export function ensureProjectWithList(project){
  const p = ensureProjectBase(project);
  p.lista ||= [];
  return p;
}

export function ensureProjectWithChecklist(project){
  const p = ensureProjectBase(project);
  p.plano ||= {};
  p.plano.checklist ||= [];
  return p;
}

export function ensureProjectWithProviders(project){
  const p = ensureProjectBase(project);
  p.fornecedores ||= [];
  return p;
}

export function ensureProjectWithMessages(project){
  const p = ensureProjectBase(project);
  p.mensagens ||= [];
  return p;
}

function resolveEl(el){
  if(!el) return null;
  if(typeof el === 'string') return document.querySelector(el);
  return el;
}

export function applyEventSummary({ project, currentId, elements = {} }){
  const p = ensureProjectBase(project || {});
  const ev = p.evento || {};
  const end = ev.endereco || {};
  const anf = ev.anfitriao || {};
  const cer = p.cerimonialista || {};
  const { fmtDateTime } = format;
  const { setPill } = dom;

  const titleEl = resolveEl(elements.title);
  if(titleEl) titleEl.textContent = ev.nome || '—';

  const tipoDataEl = resolveEl(elements.tipoData);
  if(tipoDataEl) tipoDataEl.textContent = [ev.tipo, ev.data, ev.hora].filter(Boolean).join(' • ') || '—';

  const enderecoEl = resolveEl(elements.endereco);
  if(enderecoEl){
    const hasEndereco = end.logradouro || end.numero || end.bairro || end.cidade;
    const enderecoTxt = hasEndereco ? ': ' + [end.logradouro, end.numero, end.bairro, end.cidade].filter(Boolean).join(', ') : '';
    enderecoEl.textContent = 'Endereço' + enderecoTxt;
  }

  const anfitriaoEl = resolveEl(elements.anfitriao);
  if(anfitriaoEl) anfitriaoEl.textContent = 'Anfitrião' + (anf.nome ? ': ' + anf.nome : '');

  const cerimonialEl = resolveEl(elements.cerimonial);
  if(cerimonialEl) cerimonialEl.textContent = 'Cerimonialista' + (cer.nomeCompleto ? ': ' + cer.nomeCompleto : '');

  const pillEl = resolveEl(elements.linkPill);
  if(pillEl) setPill(pillEl, currentId ? 'ok' : 'warn', currentId ? 'Vinculado' : 'Sem evento');

  const metaIdEl = resolveEl(elements.metaId);
  if(metaIdEl) metaIdEl.textContent = currentId || '—';

  const metaUpdEl = resolveEl(elements.metaAtualizado);
  if(metaUpdEl) metaUpdEl.textContent = fmtDateTime(p.updatedAt);
}

export const busSync = {
  async requestCurrentProject(bus, hasCurrentFn, { maxTries = 8, interval = 400 } = {}){
    return new Promise(resolve => {
      let tries = 0;
      const ask = () => {
        try {
          bus?.publish?.('ac:request-current');
        } catch {}
        tries++;
        if(hasCurrentFn?.()){
          resolve(true);
          return;
        }
        if(tries < maxTries){
          setTimeout(ask, interval);
        } else {
          resolve(false);
        }
      };
      ask();
    });
  }
};
