"use strict";
(function () {
  const ACTION_BUTTON_SELECTOR = ".ac-header-action[data-action-id='app.locale']";
  const CARD_SELECTOR = "[data-lang-card]";
  const CLOSE_ATTR = "data-lang-close";
  const SELECT_ATTR = "data-lang-select";
  const APPLY_ATTR = "data-lang-apply";
  const LOG_ATTR = "data-lang-log";

  let cardElement = null;
  let headerButton = null;
  let selectElement = null;
  let applyButton = null;
  let logElement = null;
  let closeButton = null;
  let isOpen = false;
  let initialized = false;

  function qs(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function isHostPanelOpen() {
    const hostPanel = document.getElementById("painel-stage");
    return hostPanel ? !hostPanel.hidden : false;
  }

  function ensureHostPanelOpen() {
    if (isHostPanelOpen()) {
      return;
    }
    const toggle = qs("[data-panel-access]");
    if (toggle && toggle.getAttribute("aria-expanded") !== "true") {
      toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  }

  function getCard() {
    if (!cardElement) {
      cardElement = qs(CARD_SELECTOR);
    }
    return cardElement;
  }

  function getHeaderButton() {
    if (!headerButton) {
      headerButton = qs(ACTION_BUTTON_SELECTOR);
    }
    return headerButton;
  }

  function ensureElements() {
    const card = getCard();
    if (!card) {
      return false;
    }
    if (!selectElement) {
      selectElement = qs(`[${SELECT_ATTR}]`, card);
    }
    if (!applyButton) {
      applyButton = qs(`[${APPLY_ATTR}]`, card);
    }
    if (!logElement) {
      logElement = qs(`[${LOG_ATTR}]`, card);
    }
    if (!closeButton) {
      closeButton = qs(`[${CLOSE_ATTR}]`, card);
    }
    return Boolean(selectElement && applyButton && logElement && closeButton);
  }

  function syncButtonLabel(button) {
    if (!button) {
      return;
    }
    const label = button.querySelector("[data-i18n]");
    if (!label) {
      return;
    }
    const text = label.textContent.trim();
    if (text) {
      button.setAttribute("aria-label", text);
      button.setAttribute("title", text);
    }
  }

  function syncHeaderButtonState() {
    const button = getHeaderButton();
    if (!button) {
      return;
    }
    button.setAttribute("aria-pressed", isOpen ? "true" : "false");
    button.classList.toggle("is-active", isOpen);
    syncButtonLabel(button);
  }

  function log(message, data) {
    if (!logElement) {
      return;
    }
    const time = new Date().toISOString();
    const payload = data ? ` ${JSON.stringify(data)}` : "";
    const prefix = logElement.textContent ? "\n" : "";
    logElement.textContent += `${prefix}${time} — ${message}${payload}`;
    logElement.scrollTop = logElement.scrollHeight;
  }

  function populateLocales() {
    if (!selectElement) {
      return;
    }
    const supported = window.AppBaseI18n?.supported || ["pt-BR"];
    const current = window.AppBaseI18n?.getLocale?.() || supported[0];
    const existing = Array.from(selectElement.querySelectorAll("option"));
    existing.forEach((option) => {
      if (!supported.includes(option.value)) {
        option.remove();
      }
    });
    const options = Array.from(selectElement.querySelectorAll("option"));
    supported.forEach((locale) => {
      if (!options.find((option) => option.value === locale)) {
        const option = document.createElement("option");
        option.value = locale;
        option.setAttribute("data-i18n", `app.settings.lang_card.options.${locale}`);
        option.textContent = locale;
        selectElement.appendChild(option);
      }
    });
    selectElement.value = current;
  }

  function focusTitle() {
    const title = getCard()?.querySelector("#language-stage-title");
    if (!title) {
      return;
    }
    window.requestAnimationFrame(() => {
      title.focus();
    });
  }

  function applyLocale() {
    if (!selectElement) {
      return;
    }
    const locale = selectElement.value;
    if (!locale) {
      return;
    }
    log("i18n:setLocale:req", { locale });
    window.AppBaseI18n?.setLocale?.(locale);
  }

  function openCard() {
    if (isOpen || !ensureElements()) {
      return;
    }
    ensureHostPanelOpen();
    populateLocales();
    window.AppBaseI18n?.refresh?.();
    const card = getCard();
    if (!card) {
      return;
    }
    card.hidden = false;
    card.setAttribute("aria-hidden", "false");
    isOpen = true;
    syncHeaderButtonState();
    focusTitle();
    log("settings:open", { section: "lang" });
    window.dispatchEvent(new CustomEvent("app:locale-panel:open"));
  }

  function closeCard({ focusButton = true } = {}) {
    if (!isOpen) {
      return;
    }
    const card = getCard();
    if (!card) {
      return;
    }
    card.hidden = true;
    card.setAttribute("aria-hidden", "true");
    isOpen = false;
    syncHeaderButtonState();
    log("settings:close");
    if (focusButton) {
      getHeaderButton()?.focus();
    }
    window.dispatchEvent(new CustomEvent("app:locale-panel:close"));
  }

  function toggleCard() {
    if (isOpen) {
      closeCard();
    } else {
      openCard();
    }
  }

  function handleLocaleChanged(event) {
    if (!ensureElements()) {
      return;
    }
    populateLocales();
    syncHeaderButtonState();
    syncButtonLabel(closeButton);
    log("i18n:locale_changed", event?.detail || {});
  }

  function bindInteractions() {
    if (initialized || !ensureElements()) {
      return;
    }
    applyButton.addEventListener("click", applyLocale);
    closeButton.addEventListener("click", () => closeCard());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen) {
        closeCard();
      }
    });
    syncButtonLabel(closeButton);
    populateLocales();
    window.AppBaseI18n?.refresh?.();
    log("settings:init");
    initialized = true;
  }

  function init() {
    if (!ensureElements()) {
      return;
    }
    bindInteractions();
    syncHeaderButtonState();
  }

  window.addEventListener("app:header:action:click", (event) => {
    if (event.detail?.id !== "app.locale") {
      return;
    }
    if (!initialized) {
      bindInteractions();
    }
    toggleCard();
  });

  window.addEventListener("app:i18n:locale_changed", handleLocaleChanged);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.AppSettings = {
    open: openCard,
    close: closeCard,
    log,
  };
})();
