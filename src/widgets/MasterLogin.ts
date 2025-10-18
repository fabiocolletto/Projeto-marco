import { getDeviceId } from '../auth/device.js';
import { consumePostAuthHash } from '../auth/gate.js';
import { setMasterAuthenticated } from '../auth/session.js';
import { getMaster, saveMaster } from '../auth/store.js';
import { sha256 } from '../auth/crypto.js';
import type { MasterUser } from '../auth/types.js';
import { ensureMasterAuthStyles, masterAuthClasses } from './MasterSignup.js';

export interface MasterLoginOptions {
  master?: MasterUser | null;
  onAuthenticated?: (user: MasterUser) => void;
}

const dispatchAuthChanged = () => {
  window.dispatchEvent(new window.CustomEvent('appbase:master-auth-changed'));
};

const deriveHash = async (deviceId: string, password: string): Promise<string> => {
  return sha256(`${deviceId}:${password}`);
};

export async function renderMasterLogin(
  container: HTMLElement,
  options: MasterLoginOptions = {},
): Promise<void> {
  ensureMasterAuthStyles();
  container.innerHTML = '';

  const card = document.createElement('section');
  card.className = masterAuthClasses.container;

  const heading = document.createElement('h3');
  heading.textContent = 'Login Master';
  card.append(heading);

  const helper = document.createElement('p');
  helper.className = masterAuthClasses.helper;
  helper.textContent = 'Informe as credenciais master para liberar o catálogo completo.';
  card.append(helper);

  const form = document.createElement('form');
  form.autocomplete = 'off';

  const usernameField = document.createElement('div');
  usernameField.className = masterAuthClasses.field;
  const usernameLabel = document.createElement('label');
  usernameLabel.textContent = 'Usuário';
  usernameLabel.htmlFor = 'master-login-username';
  const usernameInput = document.createElement('input');
  usernameInput.id = 'master-login-username';
  usernameInput.name = 'username';
  usernameInput.required = true;
  usernameInput.value = options.master?.username ?? '';
  usernameField.append(usernameLabel, usernameInput);

  const passwordField = document.createElement('div');
  passwordField.className = masterAuthClasses.field;
  const passwordLabel = document.createElement('label');
  passwordLabel.textContent = 'Senha';
  passwordLabel.htmlFor = 'master-login-password';
  const passwordInput = document.createElement('input');
  passwordInput.id = 'master-login-password';
  passwordInput.name = 'password';
  passwordInput.type = 'password';
  passwordInput.required = true;
  passwordField.append(passwordLabel, passwordInput);

  const status = document.createElement('p');
  status.className = masterAuthClasses.error;
  status.hidden = true;

  const actions = document.createElement('div');
  actions.className = masterAuthClasses.actions;
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Entrar';
  actions.append(submit);

  const setStatus = (message: string | null) => {
    if (message) {
      status.textContent = message;
      status.hidden = false;
    } else {
      status.textContent = '';
      status.hidden = true;
    }
  };

  form.append(usernameField, passwordField, status, actions);
  card.append(form);
  container.append(card);

  const resolveMaster = async (): Promise<MasterUser | null> => {
    if (options.master) return options.master;
    return await getMaster();
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(null);
    submit.disabled = true;

    try {
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      const master = await resolveMaster();

      if (!master) {
        throw new Error('Nenhum usuário master cadastrado.');
      }
      if (username !== master.username) {
        throw new Error('Credenciais inválidas.');
      }

      const deviceId = getDeviceId();
      const hash = await deriveHash(master.deviceId, password);

      if (hash !== master.passHash) {
        throw new Error('Credenciais inválidas.');
      }

      let updatedMaster = master;
      if (master.deviceId !== deviceId) {
        const now = new Date().toISOString();
        const nextHash = await deriveHash(deviceId, password);
        updatedMaster = {
          ...master,
          deviceId,
          passHash: nextHash,
          updatedAt: now,
        };
        await saveMaster(updatedMaster);
      }

      setMasterAuthenticated();
      dispatchAuthChanged();

      const target = consumePostAuthHash();
      const nextHash = target ?? '#/';
      if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
      } else {
        window.dispatchEvent(new window.Event('hashchange'));
      }

      options.onAuthenticated?.(updatedMaster);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Não foi possível autenticar.');
    } finally {
      submit.disabled = false;
      passwordInput.value = '';
    }
  });
}
