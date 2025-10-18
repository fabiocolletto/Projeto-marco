import { describe, expect, it, vi } from 'vitest';
import { applyTheme, detectInitialTheme, observeSystemTheme } from '../src/theme/themeManager.js';

describe('theme manager', () => {
  it('resolves theme according to seguirSistema flag', () => {
    expect(
      detectInitialTheme({ seguirSistema: true, temaPreferido: 'light', systemTheme: 'dark' }),
    ).toBe('dark');
    expect(
      detectInitialTheme({ seguirSistema: false, temaPreferido: 'dark', systemTheme: 'light' }),
    ).toBe('dark');
  });

  it('applies theme classes and meta tag without DOM flashes', () => {
    const classList = new Set<string>();
    const meta: Record<string, string> = {};
    const fakeDocument = {
      documentElement: {
        classList: {
          add: (value: string) => classList.add(value),
          remove: (value: string) => classList.delete(value),
        },
      },
      head: {
        prepend: (element: { setAttribute: (name: string, value: string) => void }) => {
          element.setAttribute('name', 'color-scheme');
        },
      },
      querySelector: (selector: string) => {
        if (selector === 'meta[name="color-scheme"]' && meta.created) {
          return {
            setAttribute: (name: string, value: string) => {
              meta[name] = value;
            },
          };
        }
        return undefined;
      },
      createElement: () => {
        meta.created = 'true';
        return {
          setAttribute: (name: string, value: string) => {
            meta[name] = value;
          },
        };
      },
      defaultView: undefined,
    } as unknown as Document;

    applyTheme({ theme: 'dark', document: fakeDocument });
    expect(classList.has('theme-dark')).toBe(true);
    expect(meta.content).toBe('dark');
  });

  it('observes system theme changes when matchMedia is available', () => {
    const listeners: Array<(event: MediaQueryListEvent) => void> = [];
    const fakeMedia = {
      matches: true,
      addEventListener: (_: string, handler: (event: MediaQueryListEvent) => void) => {
        listeners.push(handler);
      },
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList;

    const fakeDocument = {
      documentElement: { classList: { add: vi.fn(), remove: vi.fn() } },
      head: { prepend: vi.fn() },
      querySelector: vi.fn(),
      createElement: vi.fn(),
      defaultView: {
        matchMedia: () => fakeMedia,
      },
    } as unknown as Document;

    const callback = vi.fn();
    const dispose = observeSystemTheme({ document: fakeDocument, onChange: callback });
    expect(dispose).toBeTypeOf('function');
    listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));
    expect(callback).toHaveBeenCalledWith('light');
  });
});
