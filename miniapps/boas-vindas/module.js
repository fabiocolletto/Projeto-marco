import { createModule as createPainelModule } from '../painel-controles/module.js';

export function createModule({ key = 'boas-vindas', manifest = null, meta = {} } = {}) {
  const forwardedMeta = {
    ...meta,
    id: manifest?.miniappId ?? key,
  };
  return createPainelModule({ key, manifest, meta: forwardedMeta });
}

export default createModule;
