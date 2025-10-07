"use strict";
(function () {
  const metaContent = document.querySelector('meta[name=appbase-i18n]')?.content || "";
  const config = metaContent.split(";").reduce(
    (acc, part) => {
      const [key, value] = part.trim().split("=");
      if (key) {
        acc[key] = value;
      }
      return acc;
    },
    { defaultLocale: "pt-BR", supportedLocales: "pt-BR,en-US,es-ES" }
  );

  const STORAGE_KEY = "app.locale";
  const SUPPORTED = (config.supportedLocales || "pt-BR")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  function readStoredLocale() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function storeLocale(locale) {
    if (!SUPPORTED.includes(locale)) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch (error) {
      /* noop */
    }
  }

  const storedLocale = readStoredLocale();
  const fallbackLocale = SUPPORTED.includes(storedLocale)
    ? storedLocale
    : SUPPORTED.includes(config.defaultLocale)
    ? config.defaultLocale
    : SUPPORTED[0] || "pt-BR";

  let currentLocale = fallbackLocale;
  let currentDictionary = null;

  function resolveValue(dictionary, key) {
    return key
      .split(".")
      .reduce((acc, segment) => (acc ? acc[segment] : null), dictionary);
  }

  function apply(dictionary) {
    if (!dictionary) {
      return;
    }
    currentDictionary = dictionary;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (!key) {
        return;
      }
      const value = resolveValue(dictionary, key);
      if (typeof value === "string") {
        element.textContent = value;
      }
    });
  }

  async function load(locale) {
    if (!SUPPORTED.includes(locale)) {
      return;
    }
    try {
      const response = await fetch(`./i18n/${locale}.json?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const dictionary = await response.json();
      currentLocale = locale;
      apply(dictionary);
      window.dispatchEvent(
        new CustomEvent("app:i18n:locale_changed", { detail: { locale } })
      );
      storeLocale(locale);
    } catch (error) {
      console.warn("[i18n] load failed", error);
    }
  }

  function refresh() {
    apply(currentDictionary);
  }

  function translate(key) {
    if (!key || !currentDictionary) {
      return null;
    }
    const value = resolveValue(currentDictionary, key);
    return typeof value === "string" ? value : null;
  }

  window.AppBaseI18n = {
    setLocale: load,
    refresh,
    getLocale: () => currentLocale,
    supported: SUPPORTED,
    translate,
  };

  load(currentLocale);
})();
