import { applyRouteFromLocation, setRouteForSelection, setSelectedAppId } from './router.js';
import { clearShellError, renderShell, setRegistryEntries, setShellConfig, showShellError } from './renderShell.js';
import { wireCatalog } from '../registry/wireCatalog.js';

interface AppConfig {
  readonly publicAdmin: boolean;
  readonly baseHref: string;
}

interface RegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly adminOnly?: boolean;
  readonly visible?: boolean;
}

const catalogList = document.querySelector<HTMLElement>('#catalog-list');

function parseConfig(): AppConfig {
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
}

function normalizeId(value: string): string {
  return value.trim().toLowerCase();
}

async function fetchRegistry(): Promise<RegistryEntry[]> {
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
}

function setupEscShortcut(): void {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setSelectedAppId(null);
      setRouteForSelection(null);
    }
  });
}

async function bootstrap(): Promise<void> {
  const config = parseConfig();
  setShellConfig(config);

  if (catalogList) {
    wireCatalog(catalogList);
  }

  setupEscShortcut();
  renderShell();

  try {
    clearShellError();
    const registry = await fetchRegistry();
    setRegistryEntries(registry);
    applyRouteFromLocation();
  } catch (error) {
    console.error(error);
    showShellError('Não foi possível carregar o catálogo de MiniApps. Verifique a configuração.');
  }
}

void bootstrap();
