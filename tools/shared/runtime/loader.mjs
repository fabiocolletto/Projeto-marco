// tools/shared/runtime/loader.mjs
// Loader utilitário para resolver módulos compartilhados localmente ou via CDN.
// Mantém a estratégia "shared" pública para que os apps orquestradores possam
// montar miniapps sem duplicar lógica de import dinâmico.

const CDN_BASES = [
  'https://rawcdn.githack.com/fabiocolletto/Projeto-marco/main/tools/shared/',
  'https://cdn.jsdelivr.net/gh/fabiocolletto/Projeto-marco@main/tools/shared/'
];

const LOCAL_BASES = [
  '../',                  // raiz de `tools/shared/`
  './',                   // mesma pasta (para submódulos)
  '../../shared/',        // fallback quando servido de `/tools/`
  '/tools/shared/'        // absoluto quando hospedado na raiz do repositório
];

const pendingStyles = new Map();

async function tryImport(url, { verbose } = {}) {
  try {
    return await import(/* @vite-ignore */ url);
  } catch (err) {
    if (verbose) console.warn(`[runtimeLoader] falha ao importar ${url}`, err);
    return null;
  }
}

function buildAttempts(file, extraBases = []) {
  const normalized = String(file || '').replace(/^\/+/, '');
  const bases = [...extraBases, ...LOCAL_BASES, ...CDN_BASES];
  const attempts = [];

  for (const base of bases) {
    if (!base) continue;
    try {
      if (/^https?:/i.test(base)) {
        attempts.push(base.replace(/\/+$/, '/') + normalized);
      } else {
        const url = new URL(base.replace(/\/+$/, '/') + normalized, import.meta.url).href;
        attempts.push(url);
      }
    } catch (err) {
      console.warn('[runtimeLoader] base inválida ignorada:', base, err);
    }
  }

  return [...new Set(attempts)];
}

export async function loadSharedModule(file, options = {}) {
  const { extraBases = [], verbose = false } = options;
  const attempts = buildAttempts(file, extraBases);

  for (const url of attempts) {
    const mod = await tryImport(url, { verbose });
    if (mod) return mod;
  }

  throw new Error(`Não foi possível carregar o módulo compartilhado "${file}".`);
}

export async function loadSharedModules(files, options = {}) {
  return Promise.all((files || []).map(file => loadSharedModule(file, options)));
}

export { CDN_BASES };

function ensureDocument() {
  if (typeof document === 'undefined') {
    throw new Error('[runtimeLoader] Ambiente sem DOM não suporta carregamento de estilos compartilhados.');
  }
}

function createStylesheet(href, key) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.sharedStyle = key;
    link.addEventListener('load', () => resolve(link), { once: true });
    link.addEventListener('error', (err) => {
      link.remove();
      reject(err || new Error(`Falha ao carregar stylesheet ${href}`));
    }, { once: true });
    document.head.appendChild(link);
  });
}

export async function ensureSharedStyle(file, options = {}) {
  const { extraBases = [], verbose = false, key = file } = options;
  if (!file) throw new Error('[runtimeLoader] Caminho de stylesheet inválido.');
  ensureDocument();

  const existing = document.querySelector(`link[data-shared-style="${key}"]`);
  if (existing) return existing;

  if (pendingStyles.has(key)) return pendingStyles.get(key);

  const attempts = buildAttempts(file, extraBases);

  const promise = (async () => {
    for (const href of attempts) {
      try {
        const sheet = await createStylesheet(href, key);
        pendingStyles.delete(key);
        return sheet;
      } catch (err) {
        if (verbose) console.warn(`[runtimeLoader] falha ao carregar ${href}`, err);
      }
    }

    pendingStyles.delete(key);
    throw new Error(`Não foi possível carregar a folha de estilos compartilhada "${file}".`);
  })();

  pendingStyles.set(key, promise);
  return promise;
}

export async function ensureSharedStyles(files, options = {}) {
  return Promise.all((files || []).map(file => ensureSharedStyle(file, options)));
}
