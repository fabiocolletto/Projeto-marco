import { renderCatalog } from '../registry/renderCatalog.js';
import { getManifestCache, getRegistryEntries, getAppConfig } from './state.js';
import { getRouteMode, getSelectedAppId, setSelectedAppId, setRouteForSelection } from './router.js';
import { isMasterAuthenticated } from '../auth/session.js';
import { renderMasterSignup } from '../widgets/MasterSignup.js';
import { renderMasterLogin } from '../widgets/MasterLogin.js';
import { getMaster } from '../auth/store.js';
const APP_TITLE = 'AppBase';
let catalogContainer = null;
let errorBanner = null;
let panelTitle = null;
let panelSubtitle = null;
let panelPlaceholder = null;
let frame = null;
let closeButton = null;
let placeholderDefault = '';
const onCloseButtonClick = () => {
    setSelectedAppId(null);
    setRouteForSelection(null);
};
const attachDom = () => {
    const nextCatalog = document.querySelector('#catalog-cards');
    if (nextCatalog !== catalogContainer) {
        catalogContainer = nextCatalog;
    }
    errorBanner = document.querySelector('#error-banner');
    panelTitle = document.querySelector('#panel-title');
    panelSubtitle = document.querySelector('#panel-subtitle');
    const nextPlaceholder = document.querySelector('#panel-placeholder');
    if (nextPlaceholder !== panelPlaceholder) {
        panelPlaceholder = nextPlaceholder;
        placeholderDefault = panelPlaceholder?.innerHTML ?? '';
    }
    frame = document.querySelector('#miniapp-frame');
    const nextCloseButton = document.querySelector('#panel-close');
    if (closeButton && closeButton !== nextCloseButton) {
        closeButton.removeEventListener('click', onCloseButtonClick);
    }
    closeButton = nextCloseButton;
    closeButton?.addEventListener('click', onCloseButtonClick);
};
const showError = (message) => {
    attachDom();
    if (!errorBanner)
        return;
    errorBanner.textContent = message;
    errorBanner.dataset.visible = 'true';
};
const clearError = () => {
    attachDom();
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
const filterVisibleEntries = (entries, showPrivate) => {
    const { publicAdmin } = getAppConfig();
    return entries.filter((entry) => {
        if (entry.visible === false)
            return false;
        if (entry.adminOnly && !publicAdmin && !showPrivate)
            return false;
        return true;
    });
};
const resetFrame = () => {
    attachDom();
    if (!frame)
        return;
    frame.hidden = true;
    frame.src = 'about:blank';
};
const showPlaceholder = (message) => {
    attachDom();
    if (!panelPlaceholder)
        return;
    panelPlaceholder.hidden = false;
    if (message) {
        panelPlaceholder.textContent = message;
    }
    else {
        panelPlaceholder.innerHTML = placeholderDefault;
    }
};
const hidePlaceholder = () => {
    attachDom();
    if (!panelPlaceholder)
        return;
    panelPlaceholder.hidden = true;
};
const renderCatalogLocked = (message) => {
    attachDom();
    if (!catalogContainer)
        return;
    catalogContainer.innerHTML = '';
    const info = document.createElement('p');
    info.textContent = message;
    info.setAttribute('role', 'note');
    catalogContainer.append(info);
};
const mountAuthWidget = async (renderer) => {
    attachDom();
    resetFrame();
    closeButton?.setAttribute('hidden', '');
    setSelectedAppId(null);
    if (!panelPlaceholder)
        return;
    panelPlaceholder.hidden = false;
    panelPlaceholder.innerHTML = '';
    const host = document.createElement('div');
    panelPlaceholder.append(host);
    await renderer(host);
};
const applyPanelHeader = (title, subtitle) => {
    attachDom();
    if (panelTitle)
        panelTitle.textContent = title;
    if (panelSubtitle)
        panelSubtitle.textContent = subtitle;
};
const resolveManifest = async (entry) => {
    const cache = getManifestCache();
    const cached = cache.get(entry.id);
    if (cached)
        return cached;
    const manifestUrl = new URL(entry.path, document.baseURI);
    const response = await fetch(manifestUrl, { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(`Não foi possível carregar manifest ${entry.path}`);
    }
    const manifest = (await response.json());
    const entryHref = manifest.entry ?? './index.html';
    const iframeUrl = new URL(entryHref, manifestUrl);
    const payload = {
        manifest,
        entryUrl: iframeUrl.toString(),
    };
    cache.set(entry.id, payload);
    return payload;
};
const renderMiniAppByEntry = async (entry) => {
    attachDom();
    try {
        clearError();
        applyPanelHeader(entry.name, 'Carregando…');
        hidePlaceholder();
        closeButton?.removeAttribute('hidden');
        const payload = await resolveManifest(entry);
        if (getSelectedAppId() !== entry.id)
            return;
        applyPanelHeader(payload.manifest.name ?? entry.name, payload.manifest.version
            ? `Versão ${payload.manifest.version}`
            : 'MiniApp carregado');
        if (frame) {
            frame.hidden = false;
            if (frame.src !== payload.entryUrl) {
                frame.src = payload.entryUrl;
            }
        }
        setTitle(payload.manifest.name ?? entry.name);
    }
    catch (error) {
        console.error(error);
        showError('Falha ao carregar o MiniApp selecionado. Tente novamente.');
        resetFrame();
        showPlaceholder('Não foi possível carregar o MiniApp selecionado.');
        closeButton?.removeAttribute('hidden');
        setTitle();
    }
};
export function renderShell() {
    attachDom();
    const entries = getRegistryEntries();
    const routeMode = getRouteMode();
    const masterAuthenticated = isMasterAuthenticated();
    const visibleEntries = filterVisibleEntries(entries, masterAuthenticated);
    const selectedId = getSelectedAppId();
    if (routeMode !== 'catalog') {
        renderCatalogLocked('Disponível após autenticação master.');
        clearError();
    }
    else if (catalogContainer) {
        renderCatalog(catalogContainer, visibleEntries, selectedId);
    }
    if (routeMode === 'setupMaster') {
        void (async () => {
            applyPanelHeader('Cadastro Master', 'Crie a conta master para este dispositivo');
            setTitle('Cadastro Master');
            await mountAuthWidget((container) => {
                renderMasterSignup(container, { mode: 'create' });
            });
        })();
        return;
    }
    if (routeMode === 'loginMaster') {
        void (async () => {
            applyPanelHeader('Login Master', 'Autentique-se para liberar o catálogo completo');
            setTitle('Login Master');
            const master = await getMaster();
            await mountAuthWidget((container) => renderMasterLogin(container, { master }));
        })();
        return;
    }
    if (!selectedId) {
        clearError();
        resetFrame();
        applyPanelHeader('Catálogo', masterAuthenticated
            ? 'Escolha um MiniApp para abrir no painel central'
            : 'Autentique-se para visualizar todos os MiniApps');
        if (masterAuthenticated) {
            showPlaceholder();
        }
        else {
            renderCatalogLocked('Autentique-se para visualizar o catálogo.');
            showPlaceholder('Faça login como master para liberar o catálogo.');
        }
        setTitle();
        closeButton?.setAttribute('hidden', '');
        return;
    }
    const entry = entries.find((item) => item.id === selectedId);
    if (!entry ||
        entry.visible === false ||
        (entry.adminOnly && !getAppConfig().publicAdmin && !masterAuthenticated)) {
        setSelectedAppId(null);
        setRouteForSelection(null);
        showError('MiniApp não disponível.');
        return;
    }
    void renderMiniAppByEntry(entry);
}
//# sourceMappingURL=renderShell.js.map