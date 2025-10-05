import { AppBase } from './app-base.js';
import {
  dashboardSnapshot,
  sessionState,
  backupSnapshot,
  observabilitySnapshot,
  bootConfig,
  moduleDefinitions,
} from './state.js';
import {
  initLocalization,
  initThemeControls,
  updateHeaderSession,
  updateHomeSnapshot,
  updateAccountDetails,
  buildObservabilityTable,
  renderMiniAppGrid,
  buildMarketplace,
  connectMiniAppTriggers,
  initExportActions,
  bindBackToHome,
} from './ui.js';

let catalogEntries = [];

async function loadMiniAppManifest(entry) {
  if (entry?.manifest) {
    return entry.manifest;
  }
  if (!entry?.manifestUrl) {
    throw new Error(`Mini-app "${entry?.key ?? 'desconhecido'}" sem manifestUrl definido.`);
  }
  const manifestUrl = new URL(entry.manifestUrl, import.meta.url);
  const response = await fetch(manifestUrl.href);
  if (!response.ok) {
    throw new Error(`Falha ao carregar manifesto de ${entry.key ?? 'mini-app'}. Código ${response.status}`);
  }
  return response.json();
}

async function createModuleFromManifest(entry, manifest, moduleType = 'template') {
  const key = manifest.key ?? entry.key;
  if (!key) {
    throw new Error('Mini-app sem chave definida no manifesto.');
  }

  if (moduleType === 'template') {
    const specifier = entry.moduleUrl ?? './template-module.js';
    const moduleUrl = new URL(specifier, import.meta.url).href;
    const moduleFactory = await import(moduleUrl);
    const factory =
      typeof moduleFactory.createTemplateModule === 'function'
        ? moduleFactory.createTemplateModule
        : typeof moduleFactory.default === 'function'
          ? moduleFactory.default
          : null;
    if (!factory) {
      throw new Error(`O módulo "${specifier}" não exporta createTemplateModule.`);
    }
    const config = { key, ...(manifest.meta ?? {}) };
    return factory(config);
  }

  return null;
}

function createFallbackMap(definitions) {
  return new Map(definitions.map((definition) => [definition.key, definition]));
}

async function resolveMiniApp(entry, fallbackMap) {
  const result = {
    key: entry.key ?? null,
    registered: false,
    marketplace: null,
  };

  try {
    const manifest = await loadMiniAppManifest(entry);
    const key = manifest.key ?? entry.key;
    if (!key) {
      throw new Error('Manifesto de mini-app sem chave.');
    }
    result.key = key;

    const moduleType = manifest.module?.type ?? entry.moduleType ?? 'template';
    const marketplaceMeta = manifest.meta?.marketplace ?? manifest.marketplace ?? null;
    if (marketplaceMeta) {
      result.marketplace = { key, ...marketplaceMeta };
    }

    if (moduleType === 'placeholder') {
      return result;
    }

    const definition = await createModuleFromManifest(entry, manifest, moduleType);
    if (!definition) {
      throw new Error(`Mini-app ${key} não possui definição de módulo válida.`);
    }

    AppBase.register(key, definition);
    fallbackMap.delete(key);
    result.registered = true;
    return result;
  } catch (error) {
    const fallbackKey = result.key ?? entry.key;
    if (fallbackKey && fallbackMap.has(fallbackKey)) {
      const fallbackDefinition = fallbackMap.get(fallbackKey);
      AppBase.register(fallbackKey, fallbackDefinition);
      fallbackMap.delete(fallbackKey);
      result.key = fallbackKey;
      result.registered = true;
      if (!result.marketplace && fallbackDefinition.meta?.marketplace) {
        result.marketplace = { key: fallbackKey, ...fallbackDefinition.meta.marketplace };
      }
      console.warn(`Mini-app "${fallbackKey}" carregado via fallback local.`, error);
    } else {
      console.error(`Falha ao carregar mini-app "${fallbackKey ?? 'desconhecido'}"`, error);
    }
    return result;
  }
}

function collectMarketplaceEntries(resolved, fallbackMap) {
  const entries = [];

  resolved.forEach((item) => {
    if (item.marketplace) {
      entries.push(item.marketplace);
    }
  });

  fallbackMap.forEach((definition, key) => {
    if (AppBase.resolve(key)) {
      return;
    }
    AppBase.register(key, definition);
    fallbackMap.delete(key);
    if (definition.meta?.marketplace) {
      entries.push({ key, ...definition.meta.marketplace });
    }
  });

  if (!entries.length) {
    AppBase.getModuleMetaEntries().forEach(([key, meta]) => {
      if (meta.marketplace) {
        entries.push({ key, ...meta.marketplace });
      }
    });
  }

  return entries;
}

async function bootstrap() {
  const fallbackMap = createFallbackMap(moduleDefinitions);
  const miniAppConfig = Array.isArray(bootConfig.miniApps) ? bootConfig.miniApps : [];
  const resolvedMiniApps = [];

  for (const entry of miniAppConfig) {
    const resolved = await resolveMiniApp(entry, fallbackMap);
    resolvedMiniApps.push(resolved);
  }

  catalogEntries = collectMarketplaceEntries(resolvedMiniApps, fallbackMap);

  await initLocalization('pt-BR');
  initThemeControls();

  AppBase.boot(bootConfig);

  renderMiniAppGrid();
  buildMarketplace(catalogEntries);
  updateHeaderSession(bootConfig, sessionState);
  updateHomeSnapshot(dashboardSnapshot);
  updateAccountDetails(bootConfig, sessionState, backupSnapshot);
  buildObservabilityTable(observabilitySnapshot);
  connectMiniAppTriggers();
  initExportActions();
  bindBackToHome();

  AppBase.onChange(() => {
    renderMiniAppGrid();
    buildMarketplace(catalogEntries);
  });
}

bootstrap().catch((error) => {
  console.error('Falha ao iniciar a interface Marco', error);
});
