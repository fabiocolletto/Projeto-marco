import AppBaseLayout from '$lib/layout/AppBaseLayout.svelte';
import './app.css';

type ModuleRequest = {
  id: string;
};

export type ModuleManifest = {
  id: string;
  url: string;
  displayName?: string;
  [key: string]: unknown;
};

declare global {
  interface WindowEventMap {
    'app-base:register-manifest': CustomEvent<ModuleManifest>;
    'app-base:request-module': CustomEvent<ModuleRequest>;
    'app-base:module-pending': CustomEvent<{
      id: string;
      manifest: ModuleManifest;
    }>;
  }
}

const manifestRegistry = new Map<string, ModuleManifest>();

const ensureRoot = () => {
  const rootId = 'app-base-widget-root';
  const existing = document.getElementById(rootId);

  if (existing) {
    existing.classList.add('app-base-widget');
    return existing;
  }

  const element = document.createElement('div');
  element.id = rootId;
  element.classList.add('app-base-widget');
  document.body.appendChild(element);

  return element;
};

const appBaseWidget = typeof document !== 'undefined'
  ? new AppBaseLayout({
      target: ensureRoot()
    })
  : undefined;

const handleManifestRegistration = (event: WindowEventMap['app-base:register-manifest']) => {
  const manifest = event.detail;

  if (!manifest?.id || !manifest.url) {
    console.warn('[AppBaseWidget] Manifesto inválido recebido.', manifest);
    return;
  }

  manifestRegistry.set(manifest.id, manifest);
};

const handleModuleRequest = (event: WindowEventMap['app-base:request-module']) => {
  const { id } = event.detail ?? {};

  if (!id) {
    console.warn('[AppBaseWidget] Solicitação de módulo sem identificador.', event.detail);
    return;
  }

  const manifest = manifestRegistry.get(id);

  if (!manifest) {
    console.warn(`[AppBaseWidget] Nenhum manifesto encontrado para o módulo "${id}".`);
    return;
  }

  window.dispatchEvent(
    new CustomEvent('app-base:module-pending', {
      detail: { id, manifest }
    })
  );
};

if (typeof window !== 'undefined') {
  window.addEventListener('app-base:register-manifest', handleManifestRegistration);
  window.addEventListener('app-base:request-module', handleModuleRequest);
}

export { appBaseWidget, manifestRegistry };
