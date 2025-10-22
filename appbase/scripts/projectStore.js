// Armazenamento simples (localStorage); pode evoluir para IndexedDB
export const projectStore = {
  get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};
