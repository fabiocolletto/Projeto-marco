// tools/shared/core/marcoBus.js
// Event bus simples para coordenação entre widgets (mesma aba e multi-abas).

const bc = ('BroadcastChannel' in self) ? new BroadcastChannel('marco-bus') : null;
const listeners = new Map(); // { type -> Set<fn> }

function fanout(type, detail){
  const set = listeners.get(type);
  if (set) for (const fn of set) try { fn(detail); } catch {}
}

if (bc) {
  bc.onmessage = (e) => {
    const { type, detail } = e.data || {};
    fanout(type, detail);
  };
}

export function publish(type, detail){                  // dispara o evento
  // local (mesma aba)
  dispatchEvent(new CustomEvent(type, { detail }));     // permite addEventListener nativo
  fanout(type, detail);                                 // notifica inscritos do módulo
  // entre abas
  if (bc) bc.postMessage({ type, detail });
}

export function subscribe(type, fn){                    // escuta eventos
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  // também entrega eventos nativos disparados por publish()
  addEventListener(type, (e)=> fn(e.detail));
}

export function once(type){                             // util opcional
  return new Promise(res => {
    const off = (d)=>{ unsubscribe(type, off); res(d); };
    subscribe(type, off);
  });
}

export function unsubscribe(type, fn){
  listeners.get(type)?.delete(fn);
}
