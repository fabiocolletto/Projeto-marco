import { t } from '../../../../packages/base.i18n/i18n.js';

const DISPATCH_ENDPOINT = '/api/github/dispatch';
const DISPATCH_ACTION = 'user.register';
const REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_SUCCESS_MESSAGE = 'Cadastro enviado para processamento.';
const DEFAULT_FAILURE_MESSAGE = 'Não foi possível enviar seu cadastro para processamento. Tente novamente.';
const DEFAULT_TIMEOUT_MESSAGE = 'Tempo limite de envio excedido. Verifique sua conexão e tente novamente.';

function translate(key, fallback) {
  if (typeof t === 'function') {
    try {
      const value = t(key);
      if (value && value !== key) {
        return value;
      }
    } catch (error) {
      console.warn('register: unable to translate message', key, error);
    }
  }
  return fallback;
}

const SUCCESS_MESSAGE = translate('auth.feedback.registered', DEFAULT_SUCCESS_MESSAGE);
const FAILURE_MESSAGE = translate('auth.feedback.generic', DEFAULT_FAILURE_MESSAGE);
const TIMEOUT_MESSAGE = translate('auth.feedback.generic', DEFAULT_TIMEOUT_MESSAGE);

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

export function formatBrazilPhoneDigits(input) {
  const digits = String(input || '')
    .replace(/\D+/g, '')
    .slice(0, 11);
  if (!digits) {
    return '';
  }
  if (digits.length <= 2) {
    return `(${digits}`;
  }
  const areaCode = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  let formatted = `(${areaCode})`;
  if (!subscriber) {
    return formatted;
  }
  formatted += ' ';
  if (subscriber.length <= 4) {
    formatted += subscriber;
    return formatted;
  }
  if (subscriber.length <= 8) {
    const prefix = subscriber.slice(0, subscriber.length - 4);
    const suffix = subscriber.slice(-4);
    formatted += `${prefix}-${suffix}`;
    return formatted;
  }
  const prefix = subscriber.slice(0, 5);
  const suffix = subscriber.slice(5, 9);
  formatted += `${prefix}-${suffix}`;
  return formatted;
}

export function applyPhoneMask(input, { digits: digitsOverride, updateInput = true } = {}) {
  if (!input) {
    return { masked: '', raw: '', e164: '' };
  }
  const source = (() => {
    if (digitsOverride != null) {
      return String(digitsOverride);
    }
    const valueFromInput = String(input.value || '');
    if (valueFromInput) {
      return valueFromInput;
    }
    if (input.dataset.rawValue != null) {
      return String(input.dataset.rawValue);
    }
    return '';
  })();
  const digits = source.replace(/\D+/g, '').slice(0, 11);
  const masked = formatBrazilPhoneDigits(digits);
  if (updateInput) {
    input.value = masked;
    if (digits) {
      input.dataset.rawValue = digits;
    } else {
      delete input.dataset.rawValue;
    }
  }
  const e164 = digits.length >= 10 ? `+55${digits}` : '';
  return { masked, raw: digits, e164 };
}

function normalizeInternationalInput(value, { ensurePlus = false } = {}) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  const filtered = raw.replace(/[^0-9+]/g, '');
  let digits = '';
  let hasPlus = false;
  for (const char of filtered) {
    if (char === '+') {
      if (!hasPlus) {
        hasPlus = true;
      }
      continue;
    }
    if (digits.length >= 15) {
      continue;
    }
    digits += char;
  }
  if (!digits) {
    return hasPlus && !ensurePlus ? '+' : '';
  }
  if (hasPlus || ensurePlus) {
    return `+${digits}`;
  }
  return digits;
}

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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractDetailMessage(detail) {
  if (!detail) {
    return '';
  }
  if (typeof detail === 'string') {
    return detail.trim();
  }
  if (Array.isArray(detail)) {
    for (const item of detail) {
      const message = extractDetailMessage(item);
      if (message) {
        return message;
      }
    }
    return '';
  }
  if (isPlainObject(detail)) {
    const candidates = ['message', 'detail', 'error', 'title', 'description'];
    for (const key of candidates) {
      if (key in detail) {
        const message = extractDetailMessage(detail[key]);
        if (message) {
          return message;
        }
      }
    }
  }
  return '';
}

async function readResponseBody(response) {
  if (!response || typeof response.text !== 'function') {
    return null;
  }
  try {
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

async function triggerRegisterDispatch(payload, { signal } = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch API indisponível no ambiente atual.');
  }
  const response = await fetch(DISPATCH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: DISPATCH_ACTION, payload }),
    signal
  });
  const body = await readResponseBody(response);
  if (!response.ok) {
    const error = new Error('DISPATCH_REQUEST_FAILED');
    error.status = response.status;
    error.detail = body;
    throw error;
  }
  return body;
}

function summarizeDispatchResult(result) {
  if (!isPlainObject(result)) {
    return null;
  }
  const summary = {};
  const status =
    typeof result.status === 'string'
      ? result.status
      : typeof result.state === 'string'
      ? result.state
      : '';
  if (status) {
    summary.status = status;
  }
  const runId =
    typeof result.runId === 'string'
      ? result.runId
      : typeof result.runId === 'number'
      ? String(result.runId)
      : typeof result.workflow_run_id === 'number'
      ? String(result.workflow_run_id)
      : typeof result.workflow_run_id === 'string'
      ? result.workflow_run_id
      : typeof result.dispatchId === 'string'
      ? result.dispatchId
      : typeof result.id === 'string'
      ? result.id
      : null;
  if (runId) {
    summary.runId = runId;
  }
  const message = extractDetailMessage(result);
  if (message) {
    summary.message = message;
  }
  if (!Object.keys(summary).length) {
    return null;
  }
  return summary;
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
  const phoneRegionField = form.querySelector('[data-phone-region]');
  const phoneHint = form.querySelector('[data-phone-field] .form-hint');
  const termsField = form.querySelector(SELECTORS.terms);
  const submitButton = form.querySelector(SELECTORS.button);
  const feedbackElement = document.querySelector(SELECTORS.feedback);

  const updatePhonePlaceholder = region => {
    if (!phoneField) return;
    phoneField.placeholder = region === 'INTL' ? '+447700900123' : '(11) 98888-7777';
  };

  const syncPhoneHintRegion = region => {
    if (!phoneHint) return;
    phoneHint.dataset.phoneRegion = region;
  };

  const getPhoneRegion = () => {
    const rawValue = phoneRegionField ? String(phoneRegionField.value || '').trim().toUpperCase() : '';
    return rawValue === 'INTL' ? 'INTL' : 'BR';
  };

  const enableBrazilPhoneMask = digits => {
    if (!phoneField) return;
    applyPhoneMask(phoneField, { digits });
    updatePhonePlaceholder('BR');
    syncPhoneHintRegion('BR');
  };

  const enableInternationalPhoneInput = ({ ensurePlus = false } = {}) => {
    if (!phoneField) return;
    const { raw, e164 } = applyPhoneMask(phoneField, { updateInput: false });
    let nextValue = phoneField.value;
    if (raw) {
      const masked = formatBrazilPhoneDigits(raw);
      if (!nextValue || nextValue === masked) {
        nextValue = e164;
      }
    }
    const normalized = normalizeInternationalInput(nextValue, { ensurePlus });
    phoneField.value = normalized;
    delete phoneField.dataset.rawValue;
    updatePhonePlaceholder('INTL');
    syncPhoneHintRegion('INTL');
  };

  const syncPhoneInputOnRegionChange = ({ ensurePlus = false } = {}) => {
    const region = getPhoneRegion();
    if (region === 'BR') {
      enableBrazilPhoneMask();
    } else {
      enableInternationalPhoneInput({ ensurePlus });
    }
  };

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

  if (phoneField) {
    phoneField.addEventListener('input', () => {
      syncPhoneInputOnRegionChange();
    });
    phoneField.addEventListener('blur', () => {
      syncPhoneInputOnRegionChange({ ensurePlus: true });
    });
  }

  if (phoneRegionField) {
    phoneRegionField.addEventListener('change', () => {
      syncPhoneInputOnRegionChange({ ensurePlus: true });
    });
    syncPhoneInputOnRegionChange();
  } else if (phoneField) {
    syncPhoneInputOnRegionChange();
  }

  let submitting = false;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;

    clearFieldErrors();
    setFeedback(feedbackElement, '');

    const fullName = String(getFieldValue(fullNameField)).trim();
    const email = String(getFieldValue(emailField)).trim();
    const phoneRegion = getPhoneRegion();
    const rawPhoneValue = String(getFieldValue(phoneField));
    let sanitizedPhone = '';
    if (phoneRegion === 'BR') {
      const { e164 } = applyPhoneMask(phoneField);
      sanitizedPhone = e164;
    } else {
      const normalizedInternational = normalizeInternationalInput(rawPhoneValue, { ensurePlus: true });
      if (phoneField) {
        phoneField.value = normalizedInternational;
        delete phoneField.dataset.rawValue;
      }
      sanitizedPhone = sanitizePhone(normalizedInternational);
    }
    let password = String(getFieldValue(passwordField));
    const termsAccepted = termsField ? termsField.checked : true;

    const invalidFields = [];

    if (fullName.length < 3) {
      setFieldError(fullNameField, translate('auth.feedback.fullNameRequired', 'Informe um nome com pelo menos 3 caracteres.'));
      invalidFields.push(fullNameField);
    }

    if (!EMAIL_REGEX.test(email)) {
      setFieldError(emailField, translate('auth.feedback.invalidEmail', 'Informe um e-mail válido.'));
      invalidFields.push(emailField);
    }

    if (!PHONE_E164_REGEX.test(sanitizedPhone)) {
      const phoneMessage =
        phoneRegion === 'BR'
          ? translate('auth.feedback.invalidBrazilianPhone', 'Informe um telefone no formato +5511999999999.')
          : translate('auth.feedback.invalidInternationalPhone', 'Informe um telefone no formato +5511999999999.');
      setFieldError(phoneField, phoneMessage);
      invalidFields.push(phoneField);
    }

    if (password.length < 7) {
      setFieldError(passwordField, translate('auth.feedback.passwordWeak', 'A senha deve ter pelo menos 8 caracteres.'));
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
      let dispatchResponse;
      let dispatchError = null;
      try {
        dispatchResponse = await triggerRegisterDispatch(payload, { signal: controller.signal });
      } catch (error) {
        dispatchError = error;
        console.warn('register: dispatch request failed, continuing with local flow', error);
      } finally {
        window.clearTimeout(timeoutId);
      }

      const serverUserId = extractServerUserId(dispatchResponse);
      if (serverUserId && serverUserId !== userId) {
        userId = serverUserId;
      }

      if (payload && payload.registration) {
        delete payload.registration.user_password;
      }

      const credentialPassword = password;
      password = '';

      const dispatchSummary = summarizeDispatchResult(dispatchResponse);

      persistUser({
        user_id: userId,
        user_fullName: fullName,
        user_email: email,
        user_phoneNumber: sanitizedPhone,
        user_role: 'proprietario'
      });

      const registrationDetail = {
        user: {
          id: userId,
          fullName,
          email,
          phoneNumber: sanitizedPhone,
          role: 'proprietario'
        },
        credentials: {
          password: credentialPassword
        },
        termsAccepted: Boolean(termsAccepted),
        phoneRegion,
        timestamp,
        dispatch: {
          endpoint: DISPATCH_ENDPOINT,
          action: DISPATCH_ACTION
        }
      };

      if (dispatchSummary) {
        registrationDetail.dispatch.summary = dispatchSummary;
      }

      const successFeedbackMessage = extractDetailMessage(dispatchResponse) || SUCCESS_MESSAGE;
      setFeedback(feedbackElement, successFeedbackMessage, 'success');
      if (form) {
        form.dispatchEvent(
          new CustomEvent('register:completed', {
            bubbles: true,
            composed: true,
            detail: registrationDetail
          })
        );
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
        syncPhoneInputOnRegionChange();
      }
      submitting = false;
      setButtonState(submitButton, 'idle');
    } catch (error) {
      submitting = false;
      setButtonState(submitButton, 'error');
      if (error?.name === 'AbortError') {
        setFeedback(feedbackElement, TIMEOUT_MESSAGE, 'error');
        return;
      }
      const detailMessage =
        extractDetailMessage(error?.detail) || extractDetailMessage(error?.message) || FAILURE_MESSAGE;
      setFeedback(feedbackElement, detailMessage || FAILURE_MESSAGE, 'error');
    }
  });
}

export default initRegisterForm;
