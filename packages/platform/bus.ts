export type BusEventMap = Record<string, unknown>;

type Listener<T> = (payload: T) => void;

export interface TypedBus<TEvents extends BusEventMap> {
  publish<TKey extends keyof TEvents>(type: TKey, payload: TEvents[TKey]): void;
  subscribe<TKey extends keyof TEvents>(type: TKey, handler: Listener<TEvents[TKey]>): () => void;
  once<TKey extends keyof TEvents>(type: TKey): Promise<TEvents[TKey]>;
}

type InternalListener = { off: () => void };

export interface BusOptions {
  channel?: string;
}

export function createBus<TEvents extends BusEventMap>(options: BusOptions = {}): TypedBus<TEvents> {
  const { channel = 'marco-bus' } = options;
  const bc = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel(channel) : null;
  const listeners = new Map<keyof TEvents, Set<Listener<any>>>();
  const nativeListeners = new Map<keyof TEvents, InternalListener>();

  const fanout = <K extends keyof TEvents>(type: K, detail: TEvents[K]) => {
    const handlers = listeners.get(type);
    if (!handlers) return;
    handlers.forEach((fn) => {
      try {
        fn(detail);
      } catch (err) {
        console.error('[bus] listener error', err);
      }
    });
  };

  if (bc) {
    bc.onmessage = (event) => {
      const { type, detail } = event.data || {};
      if (!type) return;
      fanout(type, detail);
    };
  }

  const publish = <K extends keyof TEvents>(type: K, detail: TEvents[K]) => {
    const event = new CustomEvent(String(type), { detail });
    window.dispatchEvent(event);
    fanout(type, detail);
    bc?.postMessage({ type, detail });
  };

  const subscribe = <K extends keyof TEvents>(type: K, handler: Listener<TEvents[K]>) => {
    if (!listeners.has(type)) {
      listeners.set(type, new Set());
      const nativeHandler = (event: Event) => {
        const detail = (event as CustomEvent).detail as TEvents[K];
        handler(detail);
      };
      window.addEventListener(String(type), nativeHandler as EventListener);
      nativeListeners.set(type, {
        off: () => window.removeEventListener(String(type), nativeHandler as EventListener)
      });
    }
    listeners.get(type)!.add(handler);
    return () => {
      listeners.get(type)?.delete(handler);
    };
  };

  const once = <K extends keyof TEvents>(type: K) =>
    new Promise<TEvents[K]>((resolve) => {
      const off = subscribe(type, (payload) => {
        off();
        resolve(payload);
      });
    });

  const teardown = () => {
    bc?.close();
    nativeListeners.forEach((entry) => entry.off());
    listeners.clear();
    nativeListeners.clear();
  };

  return {
    publish,
    subscribe(type, handler) {
      const unsubscribe = subscribe(type, handler);
      return () => {
        unsubscribe();
        if (!listeners.get(type)?.size) {
          nativeListeners.get(type)?.off();
          nativeListeners.delete(type);
        }
      };
    },
    once
  };
}

export type MarcoBusEvents = {
  'ac:project-updated': { id: string; updatedAt: number };
  'ac:open-event': { id: string };
};

export const bus = createBus<MarcoBusEvents>();
