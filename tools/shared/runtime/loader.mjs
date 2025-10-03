// tools/shared/runtime/loader.mjs
// Loader utilitário para resolver módulos compartilhados localmente ou via CDN.
// Mantém a estratégia "shared" pública para que os apps orquestradores possam
// montar miniapps sem duplicar lógica de import dinâmico.

const DEFAULT_BRANCH = 'main';

const runtimeConfig = {
  repo: 'fabiocolletto/Projeto-marco',
  branch: null,
  cdnPatterns: [
    'https://rawcdn.githack.com/${repo}/${branch}/tools/shared/',
    'https://cdn.jsdelivr.net/gh/${repo}@${branch}/tools/shared/'
  ],
  localBases: [
    '../',                  // raiz de `tools/shared/`
    './',                   // mesma pasta (para submódulos)
    '../../shared/',        // fallback quando servido de `/tools/`
    '/tools/shared/'        // absoluto quando hospedado na raiz do repositório
  ]
};

export function configureSharedRuntime(options = {}) {
  const { branch, repo, cdnPatterns, localBases } = options;

  if (typeof branch === 'string' && branch.trim()) {
    runtimeConfig.branch = branch.trim();
  }

  if (typeof repo === 'string' && repo.trim()) {
    runtimeConfig.repo = repo.trim();
  }

  if (Array.isArray(cdnPatterns) && cdnPatterns.length) {
    runtimeConfig.cdnPatterns = [...cdnPatterns];
  }

  if (Array.isArray(localBases) && localBases.length) {
    runtimeConfig.localBases = [...localBases];
  }

  return getSharedRuntimeConfig();
}

export function getSharedRuntimeConfig() {
  return { ...runtimeConfig, branch: resolveBranch(false) };
}

function resolveBranch(setCache = true) {
  if (runtimeConfig.branch) return runtimeConfig.branch;

  let branch;

  if (typeof globalThis !== 'undefined') {
    const globalBranch = globalThis.__MARCO_BRANCH__ || globalThis.MARCO_BRANCH;
    if (typeof globalBranch === 'string' && globalBranch.trim()) {
      branch = globalBranch.trim();
    }
  }

  if (!branch && typeof document !== 'undefined') {
    const current = document.currentScript?.dataset?.marcoBranch;
    const declared = document.querySelector?.('script[data-marco-branch]')?.dataset?.marcoBranch;
    branch = (current || declared || '').trim() || undefined;
  }

  if (!branch && typeof window !== 'undefined' && typeof window.location === 'object') {
    const params = new URLSearchParams(window.location.search || '');
    branch = (params.get('branch') || params.get('marco-branch') || '').trim() || undefined;
  }

  if (!branch) branch = DEFAULT_BRANCH;

  if (setCache) runtimeConfig.branch = branch;
  return branch;
}

function resolveCdnBases() {
  const branch = resolveBranch();
  return (runtimeConfig.cdnPatterns || [])
    .map(pattern => {
      if (typeof pattern === 'function') {
        return pattern({ ...runtimeConfig, branch });
      }

      if (typeof pattern === 'string') {
        return pattern
          .replace(/\$\{\s*repo\s*\}/g, runtimeConfig.repo)
          .replace(/\$\{\s*branch\s*\}/g, branch)
          .replace(/\/+$/, '/');
      }

      return null;
    })
    .filter(Boolean);
}

function resolveLocalBases(extra = []) {
  const bases = Array.isArray(runtimeConfig.localBases) ? runtimeConfig.localBases : [];
  return [...extra, ...bases];
}

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
  const bases = [...resolveLocalBases(extraBases), ...resolveCdnBases()];
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
