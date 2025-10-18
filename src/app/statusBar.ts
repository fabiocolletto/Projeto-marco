import { openIdxDB } from '../storage/indexeddb/IdxDBStore.js';

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

const evaluateUserStatus = async (): Promise<{ label: string; state: StatusState }> => ({
  label: 'Usuário: acesso livre',
  state: 'active',
});

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
