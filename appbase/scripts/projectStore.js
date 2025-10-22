function isStorageAvailable(){
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch (error) {
    console.warn('[store] localStorage indisponível', error);
    return false;
  }
}

function read(key){
  if (!isStorageAvailable()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('[store] Falha ao ler', key, error);
    return null;
  }
}

function write(key, value){
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn('[store] Falha ao salvar', key, error);
  }
}

export const projectStore = {
  get(key, fallback){
    const raw = read(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('[store] Conteúdo inválido', key, error);
      return fallback;
    }
  },
  set(key, value){
    write(key, JSON.stringify(value));
  }
};
