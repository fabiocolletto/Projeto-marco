import { setAppConfig, setRegistryEntries } from './state.js';
import { applyRouteFromLocation, getSelectedAppId, setSelectedAppId, setRouteForSelection, getStoredSelectedAppId } from './router.js';
import { renderShell } from './renderShell.js';
import { wireCatalog } from '../registry/wireCatalog.js';
import { ensureMasterGate } from '../auth/gate.js';
import { initStatusBar, scheduleStatusBarUpdate } from './statusBar.js';
import { normalizeRegistryEntries, normalizeRegistryId } from './registryNormalizer.js';
let catalogContainer = null;
let panelSubtitle = null;
let disposeCatalogListener = null;
let detachGlobalListeners = null;
let previousSubtitle = null;
const LOADING_SUBTITLE = 'Carregando catálogo…';
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
const showError = (message) => {
    const banner = document.querySelector('#error-banner');
    if (!banner)
        return;
    banner.textContent = message;
    banner.dataset.visible = 'true';
};
const clearError = () => {
    const banner = document.querySelector('#error-banner');
    if (!banner)
        return;
    banner.textContent = '';
    delete banner.dataset.visible;
};
const ensureCatalogWired = () => {
    const nextContainer = document.querySelector('#catalog-cards');
    if (nextContainer !== catalogContainer) {
        disposeCatalogListener?.();
        catalogContainer = nextContainer;
        disposeCatalogListener = nextContainer ? wireCatalog(nextContainer) : null;
    }
    return catalogContainer;
};
const ensurePanelSubtitle = () => {
    if (!panelSubtitle) {
        panelSubtitle = document.querySelector('#panel-subtitle');
    }
    return panelSubtitle;
};
const setCatalogLoadingState = (loading) => {
    const catalog = ensureCatalogWired();
    if (catalog) {
        if (loading) {
            catalog.dataset.loading = 'true';
            catalog.setAttribute('aria-busy', 'true');
        }
        else {
            delete catalog.dataset.loading;
            catalog.removeAttribute('aria-busy');
        }
    }
    const subtitleElement = ensurePanelSubtitle();
    if (!subtitleElement)
        return;
    if (loading) {
        if (previousSubtitle === null) {
            previousSubtitle = subtitleElement.textContent ?? '';
        }
        subtitleElement.textContent = LOADING_SUBTITLE;
    }
    else if (previousSubtitle !== null) {
        subtitleElement.textContent = previousSubtitle;
        previousSubtitle = null;
    }
};
const isEntryVisible = (entry, config) => {
    if (entry.visible === false)
        return false;
    if (entry.adminOnly && !config.publicAdmin)
        return false;
    return true;
};
const restoreLastSelection = (entries, config) => {
    if (typeof window === 'undefined')
        return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('open'))
        return;
    const hash = window.location.hash || '#/';
    if (hash && hash !== '#/' && hash !== '#')
        return;
    const storedId = getStoredSelectedAppId();
    if (!storedId)
        return;
    const candidate = entries.find((item) => item.id === storedId);
    if (!candidate || !isEntryVisible(candidate, config))
        return;
    setSelectedAppId(candidate.id);
    setRouteForSelection(candidate.id);
};
const handleEscape = (event) => {
    if (event.key === 'Escape' && getSelectedAppId()) {
        setSelectedAppId(null);
        setRouteForSelection(null);
    }
};
function attachGlobalListeners() {
    detachGlobalListeners?.();
    if (typeof window === 'undefined') {
        detachGlobalListeners = null;
        return;
    }
    const activeWindow = window;
    const handleMasterAuthChanged = () => {
        void scheduleStatusBarUpdate();
        void bootstrap();
    };
    activeWindow.addEventListener('keydown', handleEscape);
    activeWindow.addEventListener('appbase:master-auth-changed', handleMasterAuthChanged);
    detachGlobalListeners = () => {
        activeWindow.removeEventListener('keydown', handleEscape);
        activeWindow.removeEventListener('appbase:master-auth-changed', handleMasterAuthChanged);
    };
}
const fetchRegistry = async () => {
    const response = await fetch('./miniapps/registry.json', { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(`Falha ao carregar registry: ${response.status} ${response.statusText}`);
    }
    const payload = (await response.json());
    const entries = normalizeRegistryEntries(payload.miniapps);
    return entries.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
};
const normalizeQuery = (entries) => {
    const params = new URLSearchParams(window.location.search);
    const open = params.get('open');
    if (!open)
        return;
    const normalized = normalizeRegistryId(open);
    const target = entries.find((item) => item.id === normalized);
    if (target) {
        setSelectedAppId(target.id);
        setRouteForSelection(target.id);
    }
    params.delete('open');
    const nextUrl = new URL(window.location.href);
    nextUrl.search = params.toString();
    history.replaceState(null, '', nextUrl.toString());
};
export async function bootstrap() {
    ensureCatalogWired();
    initStatusBar();
    attachGlobalListeners();
    const config = parseConfig();
    setAppConfig(config);
    setCatalogLoadingState(true);
    const gate = await ensureMasterGate();
    try {
        const registry = await fetchRegistry();
        setRegistryEntries(registry);
        if (gate.allowed) {
            restoreLastSelection(registry, config);
        }
        renderShell();
        if (gate.allowed) {
            normalizeQuery(registry);
            applyRouteFromLocation();
        }
    }
    catch (error) {
        console.error(error);
        setRegistryEntries([]);
        clearError();
        renderShell();
        showError('Não foi possível carregar o catálogo de MiniApps. Verifique a configuração.');
    }
    finally {
        setCatalogLoadingState(false);
    }
}
void bootstrap();
//# sourceMappingURL=main.js.map