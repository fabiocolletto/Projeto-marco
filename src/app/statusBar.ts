import { openIdxDB } from '../storage/indexeddb/IdxDBStore.js';
import { getMaster } from '../auth/store.js';
import { isMasterAuthenticated } from '../auth/session.js';

type StatusState = 'idle' | 'active' | 'warning' | 'locked' | 'error';

let dbStatusEl: HTMLSpanElement | null = null;
let userStatusEl: HTMLSpanElement | null = null;
let inflightUpdate: Promise<void> | null = null;

const attachElements = () => {
  if (!dbStatusEl) {
    dbStatusEl = document.querySelector<HTMLSpanElement>('#status-db');
  }
  if (!userStatusEl) {
    userStatusEl = document.querySelector<HTMLSpanElement>('#status-user');
  }
};

const setStatus = (element: HTMLElement | null, state: StatusState, label: string) => {
  if (!element) return;
  element.textContent = label;
  element.dataset.state = state;
};

const evaluateDatabaseStatus = async (): Promise<{ label: string; state: StatusState }> => {
  try {
    const db = await openIdxDB();
    await db.close();
    return { label: 'Banco de dados: ativo', state: 'active' };
  } catch (error) {
    console.error('Falha ao verificar IndexedDB', error);
    return { label: 'Banco de dados: inativo', state: 'error' };
  }
};

const evaluateUserStatus = async (): Promise<{ label: string; state: StatusState }> => {
  try {
    const master = await getMaster();
    if (!master) {
      return { label: 'Usuário: nenhum master cadastrado', state: 'locked' };
    }

    if (isMasterAuthenticated()) {
      return { label: `Usuário: ${master.username} (master)`, state: 'active' };
    }

    return { label: `Usuário: ${master.username} (bloqueado)`, state: 'warning' };
  } catch (error) {
    console.error('Falha ao verificar status do usuário master', error);
    return { label: 'Usuário: status indisponível', state: 'error' };
  }
};

const performUpdate = async (): Promise<void> => {
  attachElements();
  if (!dbStatusEl && !userStatusEl) {
    return;
  }

  const [dbStatus, userStatus] = await Promise.all([
    evaluateDatabaseStatus(),
    evaluateUserStatus(),
  ]);

  setStatus(dbStatusEl, dbStatus.state, dbStatus.label);
  setStatus(userStatusEl, userStatus.state, userStatus.label);
};

export const scheduleStatusBarUpdate = (): Promise<void> => {
  if (!inflightUpdate) {
    inflightUpdate = performUpdate().finally(() => {
      inflightUpdate = null;
    });
  }
  return inflightUpdate;
};

export const initStatusBar = (): void => {
  dbStatusEl = null;
  userStatusEl = null;
  void scheduleStatusBarUpdate();
};
