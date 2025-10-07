"use strict";
(function () {
  const STAGE_SELECTOR = "[data-lang-stage]";
  const ACTION_BUTTON_SELECTOR = ".ac-header-action[data-action-id='app.locale']";
  const PANEL_URL = "./settings/settings.html";
  const CLOSE_ATTR = "data-lang-close";
  const SELECT_ATTR = "data-lang-select";
  const APPLY_ATTR = "data-lang-apply";
  const LOG_ATTR = "data-lang-log";
  const LOADED_FLAG = "langLoaded";
  const INIT_FLAG = "langInit";

  let stageElement = null;
  let headerButton = null;
  let selectElement = null;
  let logElement = null;
  let applyButton = null;
  let closeButton = null;
  let isOpen = false;
  let previousPanelState = "host-closed";

  function by(selector) {
    return document.querySelector(selector);
  }

  function getStage() {
    if (!stageElement) {
      stageElement = by(STAGE_SELECTOR);
    }
    return stageElement;
  }

  function getHeaderButton() {
    if (!headerButton) {
      headerButton = by(ACTION_BUTTON_SELECTOR);
    }
    return headerButton;
  }

  function log(message, data) {
    if (!logElement) {
      return;
    }
    const time = new Date().toISOString();
    const payload = data ? ` ${JSON.stringify(data)}` : "";
    logElement.textContent += `${logElement.textContent ? "\n" : ""}${time} — ${message}${payload}`;
    logElement.scrollTop = logElement.scrollHeight;
  }

  async function loadPanelTemplate() {
    const stage = getStage();
    if (!stage || stage.dataset[LOADED_FLAG] === "true") {
      return;
    }
    try {
      const response = await fetch(`${PANEL_URL}?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const html = await response.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html.trim();
      const fragment = wrapper.firstElementChild;
      if (fragment) {
        stage.appendChild(fragment);
        stage.dataset[LOADED_FLAG] = "true";
      }
    } catch (error) {
      console.warn("[settings] panel load failed", error);
    }
  }

  function ensureElements() {
    const stage = getStage();
    if (!stage || stage.dataset[LOADED_FLAG] !== "true") {
      return false;
    }
    if (!selectElement) {
      selectElement = stage.querySelector(`[${SELECT_ATTR}]`);
    }
    if (!logElement) {
      logElement = stage.querySelector(`[${LOG_ATTR}]`);
    }
    if (!applyButton) {
      applyButton = stage.querySelector(`[${APPLY_ATTR}]`);
    }
    if (!closeButton) {
      closeButton = stage.querySelector(`[${CLOSE_ATTR}]`);
    }
    return Boolean(selectElement && logElement && applyButton && closeButton);
  }

  function syncButtonLabel(button) {
    if (!button) {
      return;
    }
    const label = button.querySelector("[data-i18n]");
    if (label) {
      const text = label.textContent.trim();
      if (text) {
        button.setAttribute("aria-label", text);
        button.setAttribute("title", text);
      }
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

  function focusTitle() {
    const stage = getStage();
    const title = stage?.querySelector("#language-stage-title");
    if (title) {
      window.requestAnimationFrame(() => {
        title.focus();
      });
    }
  }

  function isHostPanelOpen() {
    const hostPanel = document.getElementById("painel-stage");
    return hostPanel ? !hostPanel.hidden : false;
  }

  function closeHostPanel() {
    const hostPanel = document.getElementById("painel-stage");
    if (!hostPanel || hostPanel.hidden) {
      return;
    }
    const closeAction = hostPanel.querySelector("[data-stage-close]");
    if (closeAction) {
      closeAction.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return;
    }
    const toggle = by("[data-panel-access]");
    toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  function reopenHostPanel() {
    if (previousPanelState !== "host-open") {
      return;
    }
    const toggle = by("[data-panel-access]");
    if (toggle && toggle.getAttribute("aria-expanded") !== "true") {
      toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  }

  function hideEmptyState() {
    const empty = by("[data-stage-empty]");
    if (empty) {
      empty.hidden = true;
    }
  }

  function restoreEmptyState() {
    const empty = by("[data-stage-empty]");
    if (empty && !isHostPanelOpen()) {
      empty.hidden = false;
    }
  }

  function populateLocales() {
    if (!selectElement) {
      return;
    }
    const supported = (window.AppBaseI18n?.supported) || ["pt-BR"];
    const current = window.AppBaseI18n?.getLocale?.() || supported[0];
    const existing = Array.from(selectElement.querySelectorAll("option"));
    existing.forEach((option) => {
      if (!supported.includes(option.value)) {
        option.remove();
      }
    });
    const currentOptions = Array.from(selectElement.querySelectorAll("option"));
    supported.forEach((locale) => {
      if (!currentOptions.find((option) => option.value === locale)) {
        const option = document.createElement("option");
        option.value = locale;
        option.setAttribute(
          "data-i18n",
          `app.settings.lang_card.options.${locale}`
        );
        option.textContent = locale;
        selectElement.appendChild(option);
      }
    });
    selectElement.value = current;
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

  function openPanel() {
    if (isOpen) {
      return;
    }
    const stage = getStage();
    if (!stage) {
      return;
    }
    previousPanelState = isHostPanelOpen() ? "host-open" : "host-closed";
    if (previousPanelState === "host-open") {
      closeHostPanel();
    }
    hideEmptyState();
    populateLocales();
    window.AppBaseI18n?.refresh?.();
    stage.hidden = false;
    stage.setAttribute("aria-hidden", "false");
    isOpen = true;
    syncHeaderButtonState();
    focusTitle();
    log("settings:open", { section: "lang" });
    window.dispatchEvent(new CustomEvent("app:locale-panel:open"));
  }

  function closePanel({ restoreHost = true, focusButton = true } = {}) {
    if (!isOpen) {
      return;
    }
    const stage = getStage();
    if (!stage) {
      return;
    }
    stage.hidden = true;
    stage.setAttribute("aria-hidden", "true");
    isOpen = false;
    syncHeaderButtonState();
    log("settings:close");
    if (restoreHost) {
      reopenHostPanel();
      if (!isHostPanelOpen()) {
        restoreEmptyState();
      }
    } else {
      restoreEmptyState();
    }
    if (focusButton) {
      const button = getHeaderButton();
      button?.focus();
    }
    previousPanelState = "host-closed";
    window.dispatchEvent(new CustomEvent("app:locale-panel:close"));
  }

  function togglePanel() {
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function handleLocaleChanged(event) {
    populateLocales();
    syncHeaderButtonState();
    syncButtonLabel(closeButton);
    log("i18n:locale_changed", event?.detail || {});
  }

  function bindInteractions() {
    if (!ensureElements()) {
      return;
    }
    if (!stageElement.dataset[INIT_FLAG]) {
      applyButton?.addEventListener("click", applyLocale);
      closeButton?.addEventListener("click", () => closePanel({ restoreHost: true }));
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && isOpen) {
          closePanel();
        }
      });
      const toggle = by("[data-panel-access]");
      toggle?.addEventListener("click", () => {
        if (isOpen) {
          closePanel({ restoreHost: false, focusButton: false });
        }
      });
      syncButtonLabel(closeButton);
      populateLocales();
      window.AppBaseI18n?.refresh?.();
      log("settings:init");
      stageElement.dataset[INIT_FLAG] = "true";
    }
  }

  async function init() {
    const stage = getStage();
    if (!stage) {
      return;
    }
    await loadPanelTemplate();
    if (!ensureElements()) {
      return;
    }
    bindInteractions();
    syncHeaderButtonState();
    window.AppSettings = {
      open: openPanel,
      close: closePanel,
      log,
    };
  }

  window.addEventListener("app:header:action:click", (event) => {
    if (event.detail?.id !== "app.locale") {
      return;
    }
    if (!stageElement || stageElement.dataset[LOADED_FLAG] !== "true") {
      loadPanelTemplate().then(() => {
        bindInteractions();
        populateLocales();
        togglePanel();
      });
      return;
    }
    bindInteractions();
    togglePanel();
  });

  window.addEventListener("app:i18n:locale_changed", handleLocaleChanged);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
