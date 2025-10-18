import type { AppConfig, RegistryEntry } from './types.js';
import { setAppConfig, setRegistryEntries } from './state.js';
import { applyRouteFromLocation, getSelectedAppId, setSelectedAppId, setRouteForSelection } from './router.js';
import { renderShell } from './renderShell.js';
import { wireCatalog } from '../registry/wireCatalog.js';

const catalogContainer = document.querySelector<HTMLElement>('#catalog-cards');
const errorBanner = document.querySelector<HTMLDivElement>('#error-banner');

const normalizeId = (value: string): string => value.trim().toLowerCase();

const parseConfig = (): AppConfig => {
  const element = document.getElementById('app-config');
  if (element?.textContent) {
    try {
      const payload = JSON.parse(element.textContent) as Partial<AppConfig>;
      return {
        publicAdmin: Boolean(payload.publicAdmin),
        baseHref: typeof payload.baseHref === 'string' ? payload.baseHref : '/',
      } satisfies AppConfig;
    } catch (error) {
      console.error('Falha ao processar configuração inicial', error);
    }
  }

  return { publicAdmin: false, baseHref: '/' } satisfies AppConfig;
};

const showError = (message: string) => {
  if (!errorBanner) return;
  errorBanner.textContent = message;
  errorBanner.dataset.visible = 'true';
};

const clearError = () => {
  if (!errorBanner) return;
  errorBanner.textContent = '';
  delete errorBanner.dataset.visible;
};

const fetchRegistry = async (): Promise<RegistryEntry[]> => {
  const response = await fetch('./miniapps/registry.json', { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Falha ao carregar registry: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as { miniapps?: RegistryEntry[] };
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

const normalizeQuery = (entries: RegistryEntry[]) => {
  const params = new URLSearchParams(window.location.search);
  const open = params.get('open');
  if (!open) return;

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

if (catalogContainer) {
  wireCatalog(catalogContainer);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && getSelectedAppId()) {
    setSelectedAppId(null);
    setRouteForSelection(null);
  }
});

const bootstrap = async () => {
  const config = parseConfig();
  setAppConfig(config);

  try {
    const registry = await fetchRegistry();
    setRegistryEntries(registry);
    normalizeQuery(registry);
    applyRouteFromLocation();
  } catch (error) {
    console.error(error);
    setRegistryEntries([]);
    clearError();
    renderShell();
    showError('Não foi possível carregar o catálogo de MiniApps. Verifique a configuração.');
  }
};

void bootstrap();
