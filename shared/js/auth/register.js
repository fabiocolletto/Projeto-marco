const WEBHOOK_URL = 'https://hook.eu2.make.com/r5tejha9egnghosr7yi4knivxvxnb94a';
const REQUEST_TIMEOUT_MS = 20_000;
const SUCCESS_MESSAGE = 'Cadastro concluído.';
const FAILURE_MESSAGE = 'Não foi possível concluir o cadastro. Tente novamente.';

const SELECTORS = Object.freeze({
  form: '#register-form, form[data-register-form], form[data-auth-register]',
  fullName:
    '#user_fullName, [name="user_fullName"], #register-name, [name="name"], [data-field="fullName"]',
  email: '#user_email, [name="user_email"], #register-email, [name="email"], [data-field="email"]',
  password:
    '#user_password, [name="user_password"], #register-password, [name="password"], [data-field="password"]',
  phone:
    '#user_phoneNumber, [name="user_phoneNumber"], #register-phone, [name="phone"], [data-field="phone"]',
  terms: '#terms_accept, [name="terms_accept"], #register-terms, [name="terms"], [data-field="terms"]',
  button: '#btn-register, button[data-action="register"], button[type="submit"]',
  feedback: '#register-feedback, [data-register-feedback]'
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/;

let hasInitialized = false;

function getFieldErrorElement(field) {
  if (!field) return null;
  const container = field.closest('.field') || field.parentElement;
  if (!container) return null;
  if (container.classList.contains('field-error')) return container;
  return container.querySelector('.field-error');
}

function setFieldError(field, message) {
  if (!field) return;
  field.classList.add('is-invalid');
  field.setAttribute('aria-invalid', 'true');
  const errorElement = getFieldErrorElement(field);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.hidden = false;
  }
}

function clearFieldError(field) {
  if (!field) return;
  field.classList.remove('is-invalid');
  field.removeAttribute('aria-invalid');
  const errorElement = getFieldErrorElement(field);
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.hidden = true;
  }
}

function sanitizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (PHONE_E164_REGEX.test(raw)) {
    return raw;
  }
  const digits = raw.replace(/\D+/g, '');
  if (!digits) {
    return '';
  }
  const prefixed = raw.startsWith('+') ? `+${digits}` : `+${digits}`;
  if (PHONE_E164_REGEX.test(prefixed)) {
    return prefixed;
  }
  return '';
}

async function sha256Hex(input) {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Ambiente incompatível com geração de identificadores seguros.');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(String(input));
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function setButtonState(button, state) {
  if (!button) return;
  if (!button.dataset.originalLabel) {
    button.dataset.originalLabel = button.textContent?.trim() || '';
  }
  if (state === 'loading') {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Enviando…';
    button.classList.remove('is-error');
  } else {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (state === 'error') {
      button.classList.add('is-error');
    } else {
      button.classList.remove('is-error');
    }
    button.textContent = button.dataset.originalLabel || button.textContent;
  }
}

function setFeedback(element, message, type = 'info') {
  if (!element) return;
  if (message) {
    element.textContent = message;
    element.dataset.feedbackType = type;
  } else {
    element.textContent = '';
    delete element.dataset.feedbackType;
  }
}

function extractServerUserId(data) {
  if (!data) return null;
  if (typeof data === 'string') {
    const trimmed = data.trim();
    return trimmed || null;
  }
  if (typeof data === 'object') {
    if (data.user_id && typeof data.user_id === 'string') {
      return data.user_id;
    }
    if (data.registration && typeof data.registration === 'object') {
      const registrationId = data.registration.user_id;
      if (typeof registrationId === 'string') {
        return registrationId;
      }
    }
  }
  return null;
}

async function resolveServerUserId(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const json = await response.json();
      return extractServerUserId(json);
    } catch {
      return null;
    }
  }
  try {
    const text = await response.text();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      return extractServerUserId(parsed);
    } catch {
      return extractServerUserId(text);
    }
  } catch {
    return null;
  }
}

function persistUser(data) {
  if (typeof window === 'undefined') return;
  try {
    const storage = window.localStorage;
    if (!storage) return;
    storage.setItem('miniapp_user', JSON.stringify(data));
  } catch (error) {
    console.warn('register: unable to persist user locally', error);
  }
}

function getFieldValue(field) {
  if (!field) return '';
  if (field.type === 'checkbox' || field.type === 'radio') {
    return field.checked ? 'on' : '';
  }
  return field.value ?? '';
}

function focusField(field) {
  if (!field) return;
  try {
    field.focus({ preventScroll: false });
  } catch {
    field.focus();
  }
}

export function initRegisterForm() {
  if (hasInitialized) return;
  if (typeof document === 'undefined') return;
  const form = document.querySelector(SELECTORS.form);
  if (!form) return;
  hasInitialized = true;

  const fullNameField = form.querySelector(SELECTORS.fullName);
  const emailField = form.querySelector(SELECTORS.email);
  const passwordField = form.querySelector(SELECTORS.password);
  const phoneField = form.querySelector(SELECTORS.phone);
  const termsField = form.querySelector(SELECTORS.terms);
  const submitButton = form.querySelector(SELECTORS.button);
  const feedbackElement = document.querySelector(SELECTORS.feedback);

  const clearFieldErrors = () => {
    [fullNameField, emailField, passwordField, phoneField, termsField].forEach(clearFieldError);
  };

  [fullNameField, emailField, passwordField, phoneField].forEach(field => {
    if (!field) return;
    field.addEventListener('input', () => clearFieldError(field));
    field.addEventListener('blur', () => {
      if (!field.classList.contains('is-invalid')) return;
      const value = field.type === 'checkbox' ? field.checked : field.value;
      if (value) {
        clearFieldError(field);
      }
    });
  });

  if (termsField) {
    const clearTermsError = () => {
      if (termsField.checked) {
        clearFieldError(termsField);
      }
    };
    termsField.addEventListener('change', clearTermsError);
    termsField.addEventListener('input', clearTermsError);
  }

  let submitting = false;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (submitting) return;

    clearFieldErrors();
    setFeedback(feedbackElement, '');

    const fullName = String(getFieldValue(fullNameField)).trim();
    const email = String(getFieldValue(emailField)).trim();
    const rawPhone = String(getFieldValue(phoneField));
    const sanitizedPhone = sanitizePhone(rawPhone);
    if (phoneField && sanitizedPhone) {
      phoneField.value = sanitizedPhone;
    }
    let password = String(getFieldValue(passwordField));
    const termsAccepted = termsField ? termsField.checked : true;

    const invalidFields = [];

    if (fullName.length < 3) {
      setFieldError(fullNameField, 'Informe um nome com pelo menos 3 caracteres.');
      invalidFields.push(fullNameField);
    }

    if (!EMAIL_REGEX.test(email)) {
      setFieldError(emailField, 'Informe um e-mail válido.');
      invalidFields.push(emailField);
    }

    if (!PHONE_E164_REGEX.test(sanitizedPhone)) {
      setFieldError(phoneField, 'Informe um telefone no formato +5511999999999.');
      invalidFields.push(phoneField);
    }

    if (password.length < 8) {
      setFieldError(passwordField, 'A senha deve ter pelo menos 8 caracteres.');
      invalidFields.push(passwordField);
    }

    if (termsField && !termsAccepted) {
      setFieldError(termsField, 'É necessário aceitar os termos para continuar.');
      invalidFields.push(termsField);
    }

    if (invalidFields.length > 0) {
      focusField(invalidFields[0]);
      setButtonState(submitButton, 'error');
      return;
    }

    submitting = true;
    setButtonState(submitButton, 'loading');

    try {
      const timestamp = new Date().toISOString();
      const userIdSource = `${sanitizedPhone}${timestamp}`;
      let userId = await sha256Hex(userIdSource);
      const payload = {
        event: 'user.register',
        source: 'miniapp-base',
        version: 'r1',
        registration: {
          user_id: userId,
          user_fullName: fullName,
          user_email: email,
          user_password: password,
          user_phoneNumber: sanitizedPhone,
          user_role: 'proprietario'
        },
        logs: {
          user_registerLog: { ts: timestamp, channel: 'web', result: 'pending' },
          user_accessLog: [],
          user_tempLog: { terms_accepted: Boolean(termsAccepted) }
        }
      };

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let response;
      try {
        response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (!response || !response.ok || response.status !== 200) {
        throw new Error('HTTP_ERROR');
      }

      const serverUserId = await resolveServerUserId(response);
      if (serverUserId && serverUserId !== userId) {
        userId = serverUserId;
      }

      if (payload && payload.registration) {
        delete payload.registration.user_password;
      }
      password = '';

      persistUser({
        user_id: userId,
        user_fullName: fullName,
        user_email: email,
        user_phoneNumber: sanitizedPhone,
        user_role: 'proprietario'
      });

      setFeedback(feedbackElement, SUCCESS_MESSAGE, 'success');
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(SUCCESS_MESSAGE);
      }
      window.dispatchEvent(
        new CustomEvent('user:registered', { detail: { user_id: userId } })
      );
      if (passwordField) {
        passwordField.value = '';
      }
      if (form) {
        form.reset();
        clearFieldErrors();
      }
      submitting = false;
      setButtonState(submitButton, 'idle');
    } catch (error) {
      submitting = false;
      setButtonState(submitButton, 'error');
      setFeedback(feedbackElement, FAILURE_MESSAGE, 'error');
      if (error?.name === 'AbortError') {
        return;
      }
    }
  });
}

export default initRegisterForm;
