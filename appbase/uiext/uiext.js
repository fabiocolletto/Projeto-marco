"use strict";
(function () {
  const HEADER_SELECTOR = "[data-header-actions]";
  const ACTION_ATTR = "data-action-id";
  const ACTION_CLASS = "ac-header-action";

  function qs(selector) {
    return document.querySelector(selector);
  }

  const LOCALE_ACTION_ID = "app.locale";
  const LOCALE_ICON_CLASS = "ac-locale-indicator";

  function getCurrentLocale() {
    const localeGetter = window.AppBaseI18n?.getLocale;
    if (typeof localeGetter !== "function") {
      return "";
    }
    try {
      return localeGetter.call(window.AppBaseI18n) || "";
    } catch (error) {
      return "";
    }
  }

  const LOCALE_FLAGS = {
    "pt-BR": "🇧🇷",
    pt: "🇧🇷",
    "en-US": "🇺🇸",
    en: "🇺🇸",
    "es-ES": "🇪🇸",
    es: "🇪🇸",
  };

  const FLAG_FALLBACK = "🌐";

  function localeToInitials(locale) {
    if (!locale) {
      return "";
    }
    const primaryTag = `${locale}`.split(/[-_]/)[0] || "";
    const letters = primaryTag.replace(/[^a-zA-Z]/g, "");
    return letters.slice(0, 2).toUpperCase();
  }

  function getLocaleFlag(locale) {
    if (!locale) {
      return "";
    }
    if (Object.prototype.hasOwnProperty.call(LOCALE_FLAGS, locale)) {
      return LOCALE_FLAGS[locale];
    }
    const primaryTag = `${locale}`.split(/[-_]/)[0];
    if (Object.prototype.hasOwnProperty.call(LOCALE_FLAGS, primaryTag)) {
      return LOCALE_FLAGS[primaryTag];
    }
    return "";
  }

  function getLocaleIndicator(locale) {
    const flag = getLocaleFlag(locale);
    if (flag) {
      return flag;
    }
    const initials = localeToInitials(locale);
    if (initials) {
      return initials;
    }
    return FLAG_FALLBACK;
  }

  function applyLocaleIndicator(target) {
    if (!target) {
      return;
    }
    const indicator = getLocaleIndicator(getCurrentLocale());
    target.textContent = indicator;
  }

  function updateLocaleIndicators() {
    document
      .querySelectorAll(
        `[${ACTION_ATTR}="${LOCALE_ACTION_ID}"] .${LOCALE_ICON_CLASS}`
      )
      .forEach((element) => applyLocaleIndicator(element));
  }

  function createIcon(action) {
    const icon = document.createElement("span");
    icon.className = [
      "ac-i",
      LOCALE_ICON_CLASS,
      action.iconRef || "",
    ]
      .filter(Boolean)
      .join(" ");
    icon.setAttribute("aria-hidden", "true");
    applyLocaleIndicator(icon);
    return icon;
  }

  function createLabel(action) {
    const span = document.createElement("span");
    span.className = "ac-visually-hidden";
    span.setAttribute("data-i18n", action.tooltipKey || "");
    span.textContent = "Idioma";
    return span;
  }

  function updateButtonLabels(button) {
    const label = button?.querySelector("[data-i18n]");
    if (!label) {
      return;
    }
    const text = label.textContent.trim();
    if (text) {
      button.setAttribute("aria-label", text);
      button.setAttribute("title", text);
    }
  }

  function addHeaderAction(action) {
    if (!action || !action.id) {
      return;
    }
    const container = qs(HEADER_SELECTOR);
    if (!container) {
      return;
    }
    if (container.querySelector(`[${ACTION_ATTR}="${action.id}"]`)) {
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = ACTION_CLASS;
    button.setAttribute(ACTION_ATTR, action.id);
    button.setAttribute("aria-pressed", "false");
    button.appendChild(createIcon(action));
    button.appendChild(createLabel(action));
    button.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("app:header:action:click", { detail: { id: action.id } })
      );
    });
    container.appendChild(button);
    updateButtonLabels(button);
  }

  async function loadCatalog() {
    try {
      const response = await fetch(`../catalog/ui-extensions.json?ts=${Date.now()}`, {
        cache: "no-store",
      });
      return await response.json();
    } catch (error) {
      console.warn("[uiext] catalog load failed", error);
      return { header: [], footer: [] };
    }
  }

  function bindLocaleLabelUpdates() {
    window.addEventListener("app:i18n:locale_changed", () => {
      updateLocaleIndicators();
      document
        .querySelectorAll(`.${ACTION_CLASS}`)
        .forEach((button) => updateButtonLabels(button));
    });
  }

  async function init() {
    const catalog = await loadCatalog();
    (catalog.header || [])
      .filter((entry) => entry.id === LOCALE_ACTION_ID)
      .forEach(addHeaderAction);
    updateLocaleIndicators();
    bindLocaleLabelUpdates();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
