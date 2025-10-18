import { getMaster } from './store.js';
import type { MasterUser } from './types.js';

export const rememberPostAuthHash = (): void => {
  // Fluxo master desabilitado: nenhuma ação necessária.
};

export const consumePostAuthHash = (): string | null => {
  return null;
};

export interface GateResult {
  allowed: boolean;
  master: MasterUser | null;
}

export const ensureMasterGate = async (): Promise<GateResult> => {
  try {
    const master = await getMaster();
    return { allowed: true, master };
  } catch (error) {
    console.error('Falha ao obter dados do usuário master', error);
    return { allowed: true, master: null };
  }
};
