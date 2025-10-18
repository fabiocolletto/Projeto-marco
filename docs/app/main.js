const APP_TITLE = 'AppBase';
const catalogList = document.querySelector('#catalog-list');
const errorBanner = document.querySelector('#error-banner');
const panelTitle = document.querySelector('#panel-title');
const panelSubtitle = document.querySelector('#panel-subtitle');
const panelPlaceholder = document.querySelector('#panel-placeholder');
const frame = document.querySelector('#miniapp-frame');
const parseConfig = () => {
    const element = document.getElementById('app-config');
    if (element?.textContent) {
        try {
            const payload = JSON.parse(element.textContent);
            return {
                publicAdmin: Boolean(payload.publicAdmin),
                baseHref: typeof payload.baseHref === 'string' ? payload.baseHref : '/',
            };
        }
        catch (error) {
            console.error('Falha ao processar configuração inicial', error);
        }
    }
    return { publicAdmin: false, baseHref: '/' };
};
const config = parseConfig();
const manifestCache = new Map();
const normalizeId = (value) => value.trim().toLowerCase();
const showError = (message) => {
    if (!errorBanner)
        return;
    errorBanner.textContent = message;
    errorBanner.dataset.visible = 'true';
};
const clearError = () => {
    if (!errorBanner)
        return;
    errorBanner.textContent = '';
    delete errorBanner.dataset.visible;
};
const setTitle = (miniAppName) => {
    if (miniAppName) {
        document.title = `${miniAppName} · ${APP_TITLE}`;
    }
    else {
        document.title = APP_TITLE;
    }
};
const fetchRegistry = async () => {
    const response = await fetch('./miniapps/registry.json', { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(`Falha ao carregar registry: ${response.status} ${response.statusText}`);
    }
    const payload = (await response.json());
    const entries = Array.isArray(payload.miniapps) ? payload.miniapps : [];
    return entries
        .filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
        .map((item) => ({
        ...item,
        id: normalizeId(item.id),
        name: item.name,
        path: item.path,
    }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
};
const filterVisible = (entries) => {
    return entries.filter((item) => {
        if (item.visible === false)
            return false;
        if (item.adminOnly && !config.publicAdmin)
            return false;
        return true;
    });
};
const resolveManifest = async (entry) => {
    const cached = manifestCache.get(entry.id);
    if (cached)
        return cached;
    const manifestUrl = new URL(entry.path, document.baseURI);
    const response = await fetch(manifestUrl, { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(`Não foi possível abrir manifest ${entry.path}`);
    }
    const manifest = (await response.json());
    const entryHref = manifest.entry ?? './index.html';
    const iframeUrl = new URL(entryHref, manifestUrl);
    const payload = {
        manifest,
        entryUrl: iframeUrl.toString(),
    };
    manifestCache.set(entry.id, payload);
    return payload;
};
const renderCatalog = (entries, activeId) => {
    if (!catalogList)
        return;
    catalogList.innerHTML = '';
    if (entries.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.textContent = 'Nenhum MiniApp disponível.';
        emptyState.setAttribute('aria-live', 'polite');
        catalogList.append(emptyState);
        return;
    }
    for (const entry of entries) {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.miniappId = entry.id;
        button.dataset.selected = activeId === entry.id ? 'true' : 'false';
        button.innerHTML = `
      <span>${entry.name}</span>
      ${entry.adminOnly ? '<span class="badge">Admin</span>' : ''}
    `;
        button.addEventListener('click', () => {
            if (window.location.hash !== `#/app/${entry.id}`) {
                window.location.hash = `#/app/${entry.id}`;
            }
            else {
                void openMiniApp(entry.id, entries);
            }
        });
        item.append(button);
        catalogList.append(item);
    }
};
const showCatalog = (entries) => {
    if (panelTitle)
        panelTitle.textContent = 'Catálogo';
    if (panelSubtitle)
        panelSubtitle.textContent = 'Escolha um MiniApp para abrir no painel central';
    if (panelPlaceholder)
        panelPlaceholder.hidden = false;
    if (frame) {
        frame.hidden = true;
        frame.src = 'about:blank';
    }
    setTitle();
    renderCatalog(entries, null);
};
const openMiniApp = async (miniAppId, entries) => {
    const normalized = normalizeId(miniAppId);
    const entry = entries.find((item) => item.id === normalized);
    if (!entry) {
        showError('MiniApp não encontrado no catálogo.');
        showCatalog(entries);
        return;
    }
    try {
        clearError();
        const { manifest, entryUrl } = await resolveManifest(entry);
        if (panelTitle)
            panelTitle.textContent = manifest.name ?? entry.name;
        if (panelSubtitle)
            panelSubtitle.textContent = manifest.version
                ? `Versão ${manifest.version}`
                : 'MiniApp carregado';
        if (panelPlaceholder)
            panelPlaceholder.hidden = true;
        if (frame) {
            frame.hidden = false;
            frame.src = entryUrl;
        }
        setTitle(manifest.name ?? entry.name);
        renderCatalog(entries, entry.id);
    }
    catch (error) {
        console.error(error);
        showError('Falha ao carregar o MiniApp selecionado. Tente novamente.');
        showCatalog(entries);
    }
};
const parseHash = () => {
    const { hash } = window.location;
    if (!hash)
        return null;
    const match = hash.match(/^#\/app\/([\w-]+)/i);
    if (!match || typeof match[1] !== 'string')
        return null;
    return normalizeId(match[1]);
};
const normalizeQuery = (entries) => {
    const params = new URLSearchParams(window.location.search);
    const open = params.get('open');
    if (open) {
        const normalized = normalizeId(open);
        const target = entries.find((item) => item.id === normalized);
        if (target) {
            window.location.hash = `#/app/${target.id}`;
        }
        params.delete('open');
        const nextUrl = new URL(window.location.href);
        nextUrl.search = params.toString();
        history.replaceState(null, '', nextUrl.toString());
    }
};
const bootstrap = async () => {
    try {
        const registry = filterVisible(await fetchRegistry());
        normalizeQuery(registry);
        const initial = parseHash();
        if (initial) {
            await openMiniApp(initial, registry);
        }
        else {
            showCatalog(registry);
        }
        window.addEventListener('hashchange', async () => {
            const current = parseHash();
            if (current) {
                await openMiniApp(current, registry);
            }
            else {
                showCatalog(registry);
            }
        });
    }
    catch (error) {
        console.error(error);
        showError('Não foi possível carregar o catálogo de MiniApps. Verifique a configuração.');
        showCatalog([]);
    }
};
void bootstrap();
export {};
//# sourceMappingURL=main.js.map