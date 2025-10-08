const subscribers = new Map();
const history = new Map();
const scheduleTask =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (callback) => {
        Promise.resolve()
          .then(callback)
          .catch((error) => console.error('bus replay scheduling error', error));
      };

function getBucket(type) {
  if (!subscribers.has(type)) {
    subscribers.set(type, new Set());
  }
  return subscribers.get(type);
}

function subscribe(type, handler, options = {}) {
  if (typeof type !== 'string' || !type) {
    throw new Error('bus.subscribe requer um tipo de evento válido.');
  }
  if (typeof handler !== 'function') {
    throw new Error('bus.subscribe requer uma função de callback.');
  }
  const bucket = getBucket(type);
  bucket.add(handler);
  const replay = options.replay === true;
  if (replay && history.has(type)) {
    scheduleTask(() => {
      try {
        handler(history.get(type));
      } catch (error) {
        console.error('bus subscriber replay error', error);
      }
    });
  }
  return () => {
    unsubscribe(type, handler);
  };
}

function unsubscribe(type, handler) {
  if (!subscribers.has(type)) {
    return false;
  }
  const bucket = subscribers.get(type);
  const result = bucket.delete(handler);
  if (bucket.size === 0) {
    subscribers.delete(type);
  }
  return result;
}

function emit(type, detail) {
  if (typeof type !== 'string' || !type) {
    throw new Error('bus.emit requer um tipo de evento válido.');
  }
  const event = Object.freeze({
    type,
    detail,
    timestamp: Date.now(),
  });
  history.set(type, event);
  const bucket = subscribers.get(type);
  if (bucket) {
    bucket.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('bus subscriber error', error);
      }
    });
  }
  const wildcard = subscribers.get('*');
  if (wildcard) {
    wildcard.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('bus wildcard subscriber error', error);
      }
    });
  }
  return event;
}

function getLastEvent(type) {
  return history.get(type) ?? null;
}

export const bus = Object.freeze({
  subscribe,
  unsubscribe,
  emit,
  getLastEvent,
});

export default bus;
