import { describe, expect, it, vi } from 'vitest';
import type { MiniAppRegistry } from '../src/core/types.js';
import { listVisibleMiniApps, resolveMiniAppName, sortMiniApps } from '../src/registry/registry.js';
import { normalizeRegistryEntries } from '../src/app/registryNormalizer.js';

const registry: MiniAppRegistry = {
  version: '1.0.0',
  updatedAt: '2024-01-10T00:00:00Z',
  miniapps: [
    {
      id: 'admin-dashboard',
      name: {
        'pt-BR': 'Painel Administrativo',
        'en-US': 'Admin Dashboard',
        'es-419': 'Panel Administrativo',
      },
      version: '0.1.0',
      entry: 'miniapps/admin/index.ts',
      icons: [],
      routes: ['/miniapps/admin'],
      capabilities: ['registry.manage'],
      visibility: 'admin',
    },
    {
      id: 'market',
      name: {
        'pt-BR': 'MiniApp Market',
        'en-US': 'MiniApp Market',
        'es-419': 'MiniApp Market',
      },
      version: '0.1.0',
      entry: 'miniapps/market/index.ts',
      icons: [],
      routes: ['/miniapps/market'],
      capabilities: [],
      visibility: 'public',
    },
  ],
};

describe('miniapp registry', () => {
  it('filters admin-only entries for regular users', () => {
    const userView = listVisibleMiniApps(registry, { role: 'user', locale: 'pt-BR' });
    expect(userView.map((app) => app.id)).toEqual(['market']);
    const adminView = listVisibleMiniApps(registry, { role: 'admin', locale: 'pt-BR' });
    expect(adminView.map((app) => app.id)).toEqual(['admin-dashboard', 'market']);
  });

  it('resolves translated names with fallback', () => {
    const manifest = registry.miniapps[0];
    expect(resolveMiniAppName(manifest, 'en-US')).toBe('Admin Dashboard');
    expect(resolveMiniAppName({
      ...manifest,
      name: {
        'pt-BR': 'Painel Administrativo',
      },
    }, 'en-US')).toBe('Painel Administrativo');
  });

  it('sorts manifests respecting locale collation', () => {
    const list = sortMiniApps(registry.miniapps, 'pt-BR');
    expect(list.map((app) => app.id)).toEqual(['market', 'admin-dashboard']);
  });

  it('ignores registry entries without a valid path', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entries = normalizeRegistryEntries([
      { id: 'valid', name: 'App Válido', path: './valid/manifest.json' },
      { id: 'sem-path', name: 'App Sem Path' },
      { id: 'path-vazio', name: 'App Path Vazio', path: '   ' },
    ]);

    expect(entries.map((item) => item.id)).toEqual(['valid']);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });
});
