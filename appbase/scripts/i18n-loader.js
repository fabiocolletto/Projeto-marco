export const i18n = {
  locale: 'pt-br',
  dict: {},
  t(key){
    const v = key.split('.').reduce((o,k)=> (o||{})[k], i18n.dict[i18n.locale] || {});
    if (v != null) return v;
    const fallback = key.split('.').reduce((o,k)=> (o||{})[k], i18n.dict['en-us'] || {});
    return fallback != null ? fallback : key;
  }
};

function deepMerge(target, source){
  for(const k of Object.keys(source)){
    if(source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])){
      target[k] = deepMerge(target[k] || {}, source[k]);
    } else {
      target[k] = source[k];
    }
  }
  return target;
}

export async function loadBaseI18n(locale){
  i18n.locale = locale;
  const bases = ['pt-br','en-us','es-419'];
  for (const loc of bases){
    const previous = i18n.dict[loc] || {};
    try {
      const res = await fetch(`./i18n/${loc}.json`);
      if (!res.ok) {
        console.warn('[i18n] Falha ao carregar base', loc, res.status);
        i18n.dict[loc] = previous;
        continue;
      }
      i18n.dict[loc] = await res.json();
    } catch (error) {
      console.error('[i18n] Erro ao carregar base', loc, error);
      i18n.dict[loc] = previous;
    }
  }
}

function mergeSnippet(snippet){
  if (!snippet || typeof snippet !== 'object') return;
  for (const loc of Object.keys(snippet)){
    i18n.dict[loc] = deepMerge(i18n.dict[loc] || {}, snippet[loc]);
  }
}

export async function loadMiniSnippet(snippetSource){
  if (!snippetSource) return;

  if (typeof snippetSource === 'object') {
    mergeSnippet(snippetSource);
    return;
  }

  try {
    const response = await fetch(snippetSource);
    if (!response.ok) {
      console.warn('[i18n] Snippet indisponível', snippetSource, response.status);
      return;
    }
    const sn = await response.json();
    mergeSnippet(sn);
  } catch (error) {
    console.error('[i18n] Erro ao carregar snippet', snippetSource, error);
  }
}
