// Marcobus — stub mínimo para pub/sub
const listeners = new Map();
export function on(evt, cb){
  listeners.set(evt, (listeners.get(evt) || []).concat(cb));
}
export function emit(evt, data){
  (listeners.get(evt) || []).forEach(cb => cb(data));
}
