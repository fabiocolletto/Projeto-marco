"use strict";
(function () {
  const ACTION_BUTTON_SELECTOR = ".ac-header-action[data-action-id='app.locale']";
  const MENU_URL = "./settings/settings.html";
  const OPTIONS_ATTR = "data-locale-options";
  const OPTION_ATTR = "data-locale-option";
  const OPEN_CLASS = "is-active";

  const LOCALE_META = {
    "pt-BR": { flag: "🇧🇷", label: "Brasil · Português" },
    "en-US": { flag: "🇺🇸", label: "Estados Unidos · Inglês" },
    "es-ES": { flag: "🇪🇸", label: "Espanha · Espanhol" },
  };

  let headerButton = null;
  let menuElement = null;
  let optionsContainer = null;
  let menuLoadingPromise = null;
  let isOpen = false;

  function qs(selector) {
    return document.querySelector(selector);
  }

  function getButton() {
    if (!headerButton) {
      headerButton = qs(ACTION_BUTTON_SELECTOR);
    }
    return headerButton;
  }

  function getSupportedLocales() {
    const supported = window.AppBaseI18n?.supported;
    if (Array.isArray(supported) && supported.length > 0) {
      return supported;
    }
    return ["pt-BR"];
  }

  function getLocaleMeta(locale) {
    if (Object.prototype.hasOwnProperty.call(LOCALE_META, locale)) {
      return LOCALE_META[locale];
    }
    return { flag: "🌐", label: locale };
  }

  function getCurrentLocale() {
    const getter = window.AppBaseI18n?.getLocale;
    if (typeof getter !== "function") {
      return null;
    }
    try {
      return getter.call(window.AppBaseI18n);
    } catch (error) {
      return null;
    }
  }

  function syncButtonState() {
    const button = getButton();
    if (!button) {
      return;
    }
    button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    button.setAttribute("aria-pressed", isOpen ? "true" : "false");
    button.classList.toggle(OPEN_CLASS, isOpen);
  }

  function syncSelectedLocale() {
    if (!optionsContainer) {
      return;
    }
    const current = getCurrentLocale();
    const optionButtons = Array.from(
      optionsContainer.querySelectorAll(`[${OPTION_ATTR}]`)
    );
    optionButtons.forEach((option) => {
      const locale = option.getAttribute(OPTION_ATTR);
      const isCurrent = locale === current;
      option.classList.toggle("is-selected", isCurrent);
      option.setAttribute("aria-checked", isCurrent ? "true" : "false");
      option.setAttribute("tabindex", isCurrent ? "0" : "-1");
      if (isCurrent) {
        option.setAttribute("aria-current", "true");
      } else {
        option.removeAttribute("aria-current");
      }
    });
  }

  function focusSelectedLocale() {
    if (!optionsContainer) {
      return;
    }
    const selected = optionsContainer.querySelector(
      `[${OPTION_ATTR}].is-selected`
    );
    const fallback = optionsContainer.querySelector(`[${OPTION_ATTR}]`);
    const target = selected || fallback;
    if (target) {
      target.focus();
    }
  }

  function createOption(locale) {
    const meta = getLocaleMeta(locale);
    const item = document.createElement("li");
    item.className = "ac-locale-menu__item";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ac-locale-menu__option";
    button.setAttribute(OPTION_ATTR, locale);
    button.setAttribute("role", "menuitemradio");
    button.setAttribute("aria-checked", "false");
    button.setAttribute("tabindex", "-1");

    const flag = document.createElement("span");
    flag.className = "ac-locale-menu__flag";
    flag.setAttribute("aria-hidden", "true");
    flag.textContent = meta.flag;

    const name = document.createElement("span");
    name.className = "ac-locale-menu__name";
    name.setAttribute("data-i18n", `app.locale.menu.options.${locale}`);
    name.textContent = meta.label;

    const check = document.createElement("span");
    check.className = "ac-locale-menu__check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = "✓";

    button.append(flag, name, check);
    item.appendChild(button);
    return item;
  }

  function populateOptions() {
    if (!optionsContainer) {
      return;
    }
    const supported = Array.from(new Set(getSupportedLocales()));
    optionsContainer.textContent = "";
    supported.forEach((locale) => {
      optionsContainer.appendChild(createOption(locale));
    });
    if (typeof window.AppBaseI18n?.refresh === "function") {
      window.AppBaseI18n.refresh();
    }
    syncSelectedLocale();
  }

  function ensureMenuPosition() {
    const button = getButton();
    const container = button?.parentElement;
    if (!container || !menuElement) {
      return;
    }
    if (!menuElement.parentElement) {
      container.appendChild(menuElement);
    }
  }

  function bindMenuEvents() {
    if (!menuElement || !optionsContainer) {
      return;
    }
    if (!menuElement.dataset.localeMenuBound) {
      menuElement.addEventListener("click", handleOptionClick);
      menuElement.dataset.localeMenuBound = "true";
    }
  }

  function handleOutsidePointer(event) {
    if (!isOpen || !menuElement) {
      return;
    }
    const button = getButton();
    if (menuElement.contains(event.target) || button?.contains(event.target)) {
      return;
    }
    closeMenu({ focusButton: false });
  }

  function moveFocus(offset) {
    if (!optionsContainer) {
      return;
    }
    const options = Array.from(
      optionsContainer.querySelectorAll(`[${OPTION_ATTR}]`)
    );
    if (options.length === 0) {
      return;
    }
    const active = document.activeElement;
    const currentIndex = Math.max(
      options.findIndex((option) => option === active),
      0
    );
    const nextIndex = (currentIndex + offset + options.length) % options.length;
    options[nextIndex].focus();
  }

  function focusEdge(which) {
    if (!optionsContainer) {
      return;
    }
    const options = optionsContainer.querySelectorAll(`[${OPTION_ATTR}]`);
    if (!options.length) {
      return;
    }
    const target = which === "start" ? options[0] : options[options.length - 1];
    target.focus();
  }

  function handleMenuKeydown(event) {
    if (!isOpen) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(-1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusEdge("start");
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusEdge("end");
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      const target = event.target.closest(`[${OPTION_ATTR}]`);
      if (target) {
        event.preventDefault();
        selectLocale(target.getAttribute(OPTION_ATTR));
      }
    }
  }

  function selectLocale(locale) {
    if (!locale) {
      return;
    }
    const setter = window.AppBaseI18n?.setLocale;
    if (typeof setter === "function") {
      setter.call(window.AppBaseI18n, locale);
    }
    closeMenu({ focusButton: false });
  }

  function handleOptionClick(event) {
    const target = event.target.closest(`[${OPTION_ATTR}]`);
    if (!target) {
      return;
    }
    event.preventDefault();
    selectLocale(target.getAttribute(OPTION_ATTR));
  }

  function openMenu() {
    const button = getButton();
    if (!button || !menuElement || !optionsContainer) {
      return;
    }
    populateOptions();
    ensureMenuPosition();
    menuElement.hidden = false;
    menuElement.setAttribute("aria-hidden", "false");
    isOpen = true;
    syncButtonState();
    focusSelectedLocale();
    document.addEventListener("pointerdown", handleOutsidePointer, true);
    document.addEventListener("keydown", handleMenuKeydown, true);
  }

  function closeMenu({ focusButton = true } = {}) {
    if (!menuElement) {
      return;
    }
    menuElement.hidden = true;
    menuElement.setAttribute("aria-hidden", "true");
    isOpen = false;
    syncButtonState();
    document.removeEventListener("pointerdown", handleOutsidePointer, true);
    document.removeEventListener("keydown", handleMenuKeydown, true);
    if (focusButton) {
      const button = getButton();
      button?.focus();
    }
  }

  function loadMenu() {
    if (menuElement) {
      return Promise.resolve(true);
    }
    if (menuLoadingPromise) {
      return menuLoadingPromise;
    }
    menuLoadingPromise = fetch(`${MENU_URL}?ts=${Date.now()}`, {
      cache: "no-store",
    })
      .then((response) => response.text())
      .then((html) => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html.trim();
        const fragment = wrapper.firstElementChild;
        if (!fragment) {
          return false;
        }
        menuElement = fragment;
        menuElement.hidden = true;
        menuElement.setAttribute("aria-hidden", "true");
        optionsContainer = menuElement.querySelector(`[${OPTIONS_ATTR}]`);
        ensureMenuPosition();
        bindMenuEvents();
        populateOptions();
        return Boolean(optionsContainer);
      })
      .catch((error) => {
        console.warn("[locale-menu] load failed", error);
        return false;
      })
      .finally(() => {
        menuLoadingPromise = null;
      });
    return menuLoadingPromise;
  }

  function toggleMenu() {
    if (isOpen) {
      closeMenu();
      return;
    }
    if (menuElement) {
      openMenu();
      return;
    }
    loadMenu().then((loaded) => {
      if (!loaded) {
        return;
      }
      openMenu();
    });
  }

  window.addEventListener("app:header:action:click", (event) => {
    if (event.detail?.id !== "app.locale") {
      return;
    }
    const button = getButton();
    if (!button) {
      return;
    }
    toggleMenu();
  });

  window.addEventListener("app:i18n:locale_changed", () => {
    populateOptions();
    syncSelectedLocale();
    syncButtonState();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      getButton();
      syncButtonState();
    });
  } else {
    getButton();
    syncButtonState();
  }
})();
