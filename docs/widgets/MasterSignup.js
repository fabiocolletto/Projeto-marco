import { getDeviceId } from '../auth/device.js';
import { consumePostAuthHash } from '../auth/gate.js';
import { setMasterAuthenticated } from '../auth/session.js';
import { saveMaster } from '../auth/store.js';
import { sha256 } from '../auth/crypto.js';
import { scheduleStatusBarUpdate } from '../app/statusBar.js';
export const masterAuthClasses = {
    container: 'master-auth-card',
    field: 'master-auth-field',
    actions: 'master-auth-actions',
    helper: 'master-auth-helper',
    error: 'master-auth-error',
    badge: 'master-auth-badge',
};
export const ensureMasterAuthStyles = () => {
    if (document.getElementById('master-auth-styles'))
        return;
    const style = document.createElement('style');
    style.id = 'master-auth-styles';
    style.textContent = `
    .${masterAuthClasses.container} {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(148, 163, 184, 0.2);
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.4);
      max-width: 420px;
      margin: 0 auto;
    }

    .${masterAuthClasses.container} h3 {
      margin: 0;
      font-size: 1.4rem;
    }

    .${masterAuthClasses.helper} {
      color: rgba(148, 163, 184, 0.85);
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .${masterAuthClasses.field} {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .${masterAuthClasses.field} label {
      font-weight: 600;
      color: rgba(226, 232, 240, 0.9);
    }

    .${masterAuthClasses.field} input {
      padding: 0.75rem 0.85rem;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.45);
      background: rgba(15, 23, 42, 0.8);
      color: inherit;
    }

    .${masterAuthClasses.field} input:focus-visible {
      outline: 2px solid rgba(59, 130, 246, 0.6);
      border-color: rgba(59, 130, 246, 0.6);
    }

    .${masterAuthClasses.actions} {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .${masterAuthClasses.actions} button {
      padding: 0.85rem;
      border-radius: 10px;
      border: none;
      font-size: 1rem;
      font-weight: 600;
      background: rgba(59, 130, 246, 0.9);
      color: rgba(248, 250, 252, 0.95);
      cursor: pointer;
    }

    .${masterAuthClasses.actions} button:disabled {
      opacity: 0.6;
      cursor: progress;
    }

    .${masterAuthClasses.error} {
      color: rgba(254, 202, 87, 0.95);
      font-weight: 600;
    }

    .${masterAuthClasses.badge} {
      align-self: flex-start;
      background: rgba(30, 64, 175, 0.35);
      border: 1px solid rgba(147, 197, 253, 0.2);
      border-radius: 999px;
      padding: 0.25rem 0.75rem;
      font-size: 0.8rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
  `;
    document.head.append(style);
};
const dispatchAuthChanged = () => {
    window.dispatchEvent(new window.CustomEvent('appbase:master-auth-changed'));
};
const deriveHash = async (deviceId, password) => {
    return sha256(`${deviceId}:${password}`);
};
export function renderMasterSignup(container, options = {}) {
    ensureMasterAuthStyles();
    const { master, onCompleted, deviceIdBadge } = options;
    const mode = options.mode ?? (master ? 'edit' : 'create');
    const isCreate = mode === 'create';
    container.innerHTML = '';
    const card = document.createElement('section');
    card.className = masterAuthClasses.container;
    const heading = document.createElement('h3');
    heading.textContent = isCreate ? 'Cadastro Master' : 'Minha Conta (Master)';
    card.append(heading);
    if (deviceIdBadge) {
        const badge = document.createElement('span');
        badge.className = masterAuthClasses.badge;
        badge.textContent = `Vinculado a: ${deviceIdBadge}`;
        card.append(badge);
    }
    const helper = document.createElement('p');
    helper.className = masterAuthClasses.helper;
    helper.textContent = 'Use essas credenciais apenas durante a implantação.';
    card.append(helper);
    if (options.requirePasswordChange) {
        const alert = document.createElement('p');
        alert.className = masterAuthClasses.error;
        alert.textContent = 'Alteração de senha obrigatória: defina uma senha segura antes de continuar.';
        card.append(alert);
    }
    const form = document.createElement('form');
    form.autocomplete = 'off';
    const usernameField = document.createElement('div');
    usernameField.className = masterAuthClasses.field;
    const usernameLabel = document.createElement('label');
    usernameLabel.textContent = 'Usuário';
    usernameLabel.htmlFor = 'master-username';
    const usernameInput = document.createElement('input');
    usernameInput.id = 'master-username';
    usernameInput.name = 'username';
    usernameInput.required = true;
    usernameInput.value = isCreate ? 'adm' : master?.username ?? '';
    usernameField.append(usernameLabel, usernameInput);
    const passwordField = document.createElement('div');
    passwordField.className = masterAuthClasses.field;
    const passwordLabel = document.createElement('label');
    passwordLabel.textContent = 'Senha';
    passwordLabel.htmlFor = 'master-password';
    const passwordInput = document.createElement('input');
    passwordInput.id = 'master-password';
    passwordInput.name = 'password';
    passwordInput.type = 'password';
    passwordInput.required = true;
    passwordInput.value = isCreate ? '0000' : '';
    passwordField.append(passwordLabel, passwordInput);
    const confirmField = document.createElement('div');
    confirmField.className = masterAuthClasses.field;
    const confirmLabel = document.createElement('label');
    confirmLabel.textContent = 'Confirmar senha';
    confirmLabel.htmlFor = 'master-confirm-password';
    const confirmInput = document.createElement('input');
    confirmInput.id = 'master-confirm-password';
    confirmInput.name = 'confirmPassword';
    confirmInput.type = 'password';
    confirmInput.required = true;
    confirmInput.value = isCreate ? '0000' : '';
    confirmField.append(confirmLabel, confirmInput);
    const status = document.createElement('p');
    status.className = masterAuthClasses.error;
    status.hidden = true;
    const actions = document.createElement('div');
    actions.className = masterAuthClasses.actions;
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = isCreate ? 'Registrar' : 'Salvar alterações';
    actions.append(submit);
    const setStatus = (message) => {
        if (message) {
            status.textContent = message;
            status.hidden = false;
        }
        else {
            status.textContent = '';
            status.hidden = true;
        }
    };
    form.append(usernameField, passwordField, confirmField, status, actions);
    card.append(form);
    container.append(card);
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        setStatus(null);
        submit.disabled = true;
        try {
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const confirm = confirmInput.value;
            if (!username) {
                throw new Error('Informe um nome de usuário.');
            }
            if (!password) {
                throw new Error('Informe uma senha.');
            }
            if (password !== confirm) {
                throw new Error('As senhas não conferem.');
            }
            const now = new Date().toISOString();
            const deviceId = master?.deviceId ?? getDeviceId();
            const passHash = await deriveHash(deviceId, password);
            const payload = {
                id: master?.id ?? 'master',
                username,
                passHash,
                createdAt: master?.createdAt ?? now,
                updatedAt: now,
                deviceId,
                role: 'master',
            };
            await saveMaster(payload);
            setMasterAuthenticated();
            void scheduleStatusBarUpdate();
            dispatchAuthChanged();
            const target = consumePostAuthHash();
            if (target) {
                window.location.hash = target;
            }
            else if (isCreate) {
                window.location.hash = '#/';
            }
            onCompleted?.(payload);
        }
        catch (error) {
            console.error(error);
            setStatus(error instanceof Error ? error.message : 'Não foi possível salvar.');
        }
        finally {
            submit.disabled = false;
        }
    });
}
//# sourceMappingURL=MasterSignup.js.map