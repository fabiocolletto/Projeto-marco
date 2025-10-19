import { openIdxDB } from '../storage/indexeddb/IdxDBStore.js';
import { getMaster } from '../auth/store.js';
import { isMasterAuthenticated } from '../auth/session.js';
let dbStatusEl = null;
let userStatusEl = null;
let inflightUpdate = null;
const attachElements = () => {
    if (!dbStatusEl) {
        dbStatusEl = document.querySelector('#status-db');
    }
    if (!userStatusEl) {
        userStatusEl = document.querySelector('#status-user');
    }
};
const setStatus = (element, state, label) => {
    if (!element)
        return;
    element.textContent = label;
    element.dataset.state = state;
};
const evaluateDatabaseStatus = async () => {
    try {
        const db = await openIdxDB();
        await db.close();
        return { label: 'Banco de dados: ativo', state: 'active' };
    }
    catch (error) {
        console.error('Falha ao verificar IndexedDB', error);
        return { label: 'Banco de dados: inativo', state: 'error' };
    }
};
const evaluateUserStatus = async () => {
    try {
        const master = await getMaster();
        if (!master) {
            return { label: 'Usuário: nenhum master cadastrado', state: 'locked' };
        }
        if (isMasterAuthenticated()) {
            return { label: `Usuário: ${master.username} (master)`, state: 'active' };
        }
        return { label: `Usuário: ${master.username} (bloqueado)`, state: 'warning' };
    }
    catch (error) {
        console.error('Falha ao verificar status do usuário master', error);
        return { label: 'Usuário: status indisponível', state: 'error' };
    }
};
const performUpdate = async () => {
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
export const scheduleStatusBarUpdate = () => {
    if (!inflightUpdate) {
        inflightUpdate = performUpdate().finally(() => {
            inflightUpdate = null;
        });
    }
    return inflightUpdate;
};
export const initStatusBar = () => {
    dbStatusEl = null;
    userStatusEl = null;
    void scheduleStatusBarUpdate();
};
//# sourceMappingURL=statusBar.js.map