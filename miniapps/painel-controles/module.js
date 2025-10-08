export function createModule({ key = 'painel-controles', manifest = null, meta = {} } = {}) {
  const resolvedMeta = { ...meta };
  if (!resolvedMeta.id) {
    resolvedMeta.id = manifest?.miniappId ?? key;
  }

  return {
    meta: resolvedMeta,
    init(container) {
      if (container) {
        container.setAttribute('data-miniapp-panel', key);
      }
      return {
        destroy() {
          if (container) {
            container.removeAttribute('data-miniapp-panel');
          }
        },
      };
    },
  };
}

export default createModule;
