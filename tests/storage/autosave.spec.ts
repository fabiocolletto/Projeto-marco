import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutoSaver } from '../../src/storage/autosave/AutoSaver.js';

const setupEvents = () => {
  const target = new EventTarget();
  (globalThis as any).addEventListener = target.addEventListener.bind(target);
  (globalThis as any).removeEventListener = target.removeEventListener.bind(target);
  (globalThis as any).dispatchEvent = target.dispatchEvent.bind(target);
  return target;
};

describe('AutoSaver', () => {
  let eventTarget: EventTarget;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    (globalThis as any).navigator = { onLine: true };
    eventTarget = setupEvents();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (globalThis as any).navigator;
    delete (globalThis as any).addEventListener;
    delete (globalThis as any).removeEventListener;
    delete (globalThis as any).dispatchEvent;
  });

  it('debounces and coalesces operations by entityId', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const saver = createAutoSaver(saveFn);
    saver.queue({ entityId: 'profile', value: 1 });
    saver.queue({ entityId: 'profile', value: 2 });
    saver.queue({ entityId: 'profile', value: 3 });
    await vi.advanceTimersByTimeAsync(399);
    expect(saveFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenLastCalledWith([{ entityId: 'profile', value: 3 }]);
    saver.dispose();
  });

  it('pauses while offline and resumes on online event', async () => {
    (globalThis as any).navigator.onLine = false;
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const saver = createAutoSaver(saveFn);
    saver.queue({ entityId: 'profile', value: 1 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(saveFn).not.toHaveBeenCalled();
    (globalThis as any).navigator.onLine = true;
    eventTarget.dispatchEvent(new Event('online'));
    await vi.runAllTimersAsync();
    expect(saveFn).toHaveBeenCalledTimes(1);
    saver.dispose();
  });

  it('retries failed saves with exponential backoff', async () => {
    const saveFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockResolvedValue(undefined);
    const saver = createAutoSaver(saveFn);
    saver.queue({ entityId: 'profile', value: 1 });
    await vi.advanceTimersByTimeAsync(400);
    expect(saveFn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(saveFn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(saveFn).toHaveBeenCalledTimes(3);
    saver.dispose();
  });
});
