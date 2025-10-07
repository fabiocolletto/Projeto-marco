"use strict";
(function () {
  const HEADER_SELECTOR = ".ac-appbar__actions";
  const ACTION_ATTR = "data-action-id";
  const ACTION_CLASS = "ac-header-action";

  function qs(selector) {
    return document.querySelector(selector);
  }

  function createIcon(action) {
    const icon = document.createElement("i");
    icon.className = ["ac-i", action.iconRef || ""].filter(Boolean).join(" ");
    icon.setAttribute("aria-hidden", "true");
    if (!icon.textContent) {
      icon.textContent = "🌐";
    }
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
      document
        .querySelectorAll(`.${ACTION_CLASS}`)
        .forEach((button) => updateButtonLabels(button));
    });
  }

  async function init() {
    const catalog = await loadCatalog();
    (catalog.header || [])
      .filter((entry) => entry.id === "app.locale")
      .forEach(addHeaderAction);
    bindLocaleLabelUpdates();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
