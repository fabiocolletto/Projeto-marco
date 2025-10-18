import { getSelectedAppId, setSelectedAppId, setRouteForSelection, subscribeToSelection } from './router.js';
import { renderCatalog } from '../registry/renderCatalog.js';

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

interface MiniAppManifest {
  readonly id: string;
  readonly name?: string;
  readonly version?: string;
  readonly entry?: string;
  readonly adminOnly?: boolean;
  readonly visible?: boolean;
}

type ManifestCache = Map<string, { manifest: MiniAppManifest; entryUrl: string }>;

const catalogList = document.querySelector<HTMLElement>('#catalog-list');
const errorBanner = document.querySelector<HTMLDivElement>('#error-banner');
const panelTitle = document.querySelector<HTMLHeadingElement>('#panel-title');
const panelSubtitle = document.querySelector<HTMLSpanElement>('#panel-subtitle');
const panelPlaceholder = document.querySelector<HTMLDivElement>('#panel-placeholder');
const panelCloseButton = document.querySelector<HTMLButtonElement>('#panel-close');
const frame = document.querySelector<HTMLIFrameElement>('#miniapp-frame');

const manifestCache: ManifestCache = new Map();
let config: AppConfig = { publicAdmin: false, baseHref: '/' };
let registry: RegistryEntry[] = [];
let registryLoaded = false;

let renderToken = 0;

function setTitle(miniAppName?: string): void {
  if (miniAppName) {
    document.title = `${miniAppName} · AppBase`;
  } else {
    document.title = 'AppBase';
  }
}

function showError(message: string): void {
  if (!errorBanner) return;
  errorBanner.textContent = message;
  errorBanner.dataset.visible = 'true';
}

function clearError(): void {
  if (!errorBanner) return;
  errorBanner.textContent = '';
  delete errorBanner.dataset.visible;
}

function canDisplay(entry: RegistryEntry): boolean {
  if (entry.visible === false) return false;
  if (entry.adminOnly && !config.publicAdmin) return false;
  return true;
}

function getVisibleEntries(): RegistryEntry[] {
  return registry.filter(canDisplay).sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  );
}

async function resolveManifest(entry: RegistryEntry): Promise<{ manifest: MiniAppManifest; entryUrl: string }> {
  const cached = manifestCache.get(entry.id);
  if (cached) return cached;

  const manifestUrl = new URL(entry.path, document.baseURI);
  const response = await fetch(manifestUrl, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Falha ao carregar manifest ${entry.path}`);
  }

  const manifest = (await response.json()) as MiniAppManifest;
  const entryHref = manifest.entry ?? './index.html';
  const iframeUrl = new URL(entryHref, manifestUrl);
  const payload = { manifest, entryUrl: iframeUrl.toString() } as const;
  manifestCache.set(entry.id, payload);
  return payload;
}

async function renderSelectedEntry(entry: RegistryEntry): Promise<void> {
  const token = ++renderToken;

  if (panelPlaceholder) {
    panelPlaceholder.hidden = false;
    panelPlaceholder.textContent = 'Carregando MiniApp...';
  }
  if (frame) {
    frame.hidden = true;
    frame.src = 'about:blank';
  }
  if (panelCloseButton) {
    panelCloseButton.hidden = false;
  }

  try {
    clearError();
    const { manifest, entryUrl } = await resolveManifest(entry);
    if (token !== renderToken) return;

    const title = manifest.name ?? entry.name;
    if (panelTitle) panelTitle.textContent = title;
    if (panelSubtitle) {
      panelSubtitle.textContent = manifest.version
        ? `Versão ${manifest.version}`
        : 'MiniApp carregado';
    }
    if (panelPlaceholder) {
      panelPlaceholder.hidden = true;
      panelPlaceholder.textContent = 'Escolha um MiniApp ao lado para iniciar.';
    }
    if (frame) {
      frame.hidden = false;
      frame.src = entryUrl;
    }
    setTitle(title);
  } catch (error) {
    if (token !== renderToken) return;
    console.error(error);
    showError('Falha ao carregar o MiniApp selecionado. Tente novamente.');
    renderEmptyState();
  }
}

function renderEmptyState(): void {
  if (panelTitle) panelTitle.textContent = 'Catálogo';
  if (panelSubtitle) panelSubtitle.textContent = 'Escolha um MiniApp para abrir no painel central';
  if (panelPlaceholder) {
    panelPlaceholder.hidden = false;
    panelPlaceholder.textContent = 'Escolha um MiniApp ao lado para iniciar.';
  }
  if (frame) {
    frame.hidden = true;
    frame.src = 'about:blank';
  }
  if (panelCloseButton) {
    panelCloseButton.hidden = true;
  }
  setTitle();
}

function renderCatalogColumn(selectedId: string | null): void {
  if (!catalogList) return;
  if (!registryLoaded) {
    catalogList.innerHTML = '<div class="catalog-empty">Carregando catálogo...</div>';
    return;
  }
  const entries = getVisibleEntries();
  renderCatalog(catalogList, entries, selectedId);
}

export function setShellConfig(value: AppConfig): void {
  config = value;
}

export function setRegistryEntries(entries: RegistryEntry[]): void {
  registry = entries;
  registryLoaded = true;
  renderShell();
}

export function renderShell(): void {
  const selectedId = getSelectedAppId();
  renderCatalogColumn(selectedId);

  if (!registryLoaded) {
    renderLoadingState();
    return;
  }

  if (!selectedId) {
    renderEmptyState();
    return;
  }

  const entry = registry.find((item) => item.id === selectedId);
  if (!entry || !canDisplay(entry)) {
    showError('MiniApp não encontrado ou indisponível.');
    renderEmptyState();
    return;
  }

  void renderSelectedEntry(entry);
}

subscribeToSelection(renderShell);

if (panelCloseButton) {
  panelCloseButton.addEventListener('click', () => {
    setSelectedAppId(null);
    setRouteForSelection(null);
  });
}

function renderLoadingState(): void {
  if (panelTitle) panelTitle.textContent = 'Carregando catálogo';
  if (panelSubtitle) panelSubtitle.textContent = 'Aguarde enquanto buscamos os MiniApps disponíveis';
  if (panelPlaceholder) {
    panelPlaceholder.hidden = false;
    panelPlaceholder.textContent = 'Carregando MiniApps...';
  }
  if (frame) {
    frame.hidden = true;
    frame.src = 'about:blank';
  }
  if (panelCloseButton) {
    panelCloseButton.hidden = true;
  }
  setTitle();
}

export function showShellError(message: string): void {
  showError(message);
}

export function clearShellError(): void {
  clearError();
}
