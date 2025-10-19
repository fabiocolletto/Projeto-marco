import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';

vi.mock('../../src/app/renderShell.js', () => ({
  renderShell: vi.fn(),
}));

describe('app router', () => {
  let dom: JSDOM | null = null;

  beforeEach(async () => {
    vi.resetModules();
    dom?.window.close();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://appbase.local/#/',
    });

    const { window } = dom;
    Object.assign(globalThis, {
      window,
      document: window.document,
      location: window.location,
      history: window.history,
      navigator: window.navigator,
    });

    (globalThis as { localStorage?: Storage }).localStorage = window.localStorage;
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    dom?.window.close();
    dom = null;
    delete (globalThis as { window?: Window }).window;
    delete (globalThis as { document?: Document }).document;
    delete (globalThis as { location?: Location }).location;
    delete (globalThis as { history?: History }).history;
    delete (globalThis as { navigator?: Navigator }).navigator;
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('normalizes selected app id when applying route from hash', async () => {
    const { applyRouteFromLocation, getSelectedAppId } = await import('../../src/app/router.js');

    window.location.hash = '#/app/Admin-Panel';

    applyRouteFromLocation();

    expect(getSelectedAppId()).toBe('admin-panel');
    expect(window.localStorage.getItem('appbase:last-selected-miniapp')).toBe('admin-panel');
  });
});
