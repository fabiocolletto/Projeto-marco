import { setAppConfig, setRegistryEntries } from './state.js';
import { applyRouteFromLocation, getSelectedAppId, setSelectedAppId, setRouteForSelection } from './router.js';
import { renderShell } from './renderShell.js';
import { wireCatalog } from '../registry/wireCatalog.js';
import { ensureMasterGate } from '../auth/gate.js';
let catalogContainer = null;
let disposeCatalogListener = null;
let detachGlobalListeners = null;
const normalizeId = (value) => value.trim().toLowerCase();
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
const normalizeQuery = (entries) => {
    const params = new URLSearchParams(window.location.search);
    const open = params.get('open');
    if (!open)
        return;
    const normalized = normalizeId(open);
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
    attachGlobalListeners();
    const config = parseConfig();
    setAppConfig(config);
    const gate = await ensureMasterGate();
    if (!gate.allowed) {
        return;
    }
    try {
        const registry = await fetchRegistry();
        setRegistryEntries(registry);
        normalizeQuery(registry);
        applyRouteFromLocation();
    }
    catch (error) {
        console.error(error);
        setRegistryEntries([]);
        clearError();
        renderShell();
        showError('Não foi possível carregar o catálogo de MiniApps. Verifique a configuração.');
    }
}
void bootstrap();
//# sourceMappingURL=main.js.map