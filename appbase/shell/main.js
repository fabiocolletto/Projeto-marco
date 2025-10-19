import { configureRouter, navigate, resolve } from "./router.js";
import { getAppsCount, mountMarket } from "./market.js";
import {
  getSessionPreferences,
  subscribeToSessionPreferences,
  updateSessionPreferences,
} from "./session.js";
import {
  bootstrapLocale,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
} from "./i18n.js";
import { bootstrapTheme } from "./theme.js";

const appOutlet = document.querySelector("#app");
const statusFooter = document.querySelector("#status");
const adminElements = document.querySelectorAll("[data-admin-only]");
const themeToggle = document.getElementById("theme-toggle");
const languageToggle = document.getElementById("language-toggle");

const LOCALE_SEQUENCE = (() => {
  const sequence = Array.from(SUPPORTED_LOCALES);
  if (!sequence.includes(DEFAULT_LOCALE)) {
    sequence.unshift(DEFAULT_LOCALE);
  }
  return sequence;
})();

const LOCALE_LABELS = {
  "pt-BR": "Português (Brasil)",
  "en-US": "English (US)",
  "es-419": "Español (Latinoamérica)",
};

const LOCALE_ICONS = {
  "pt-BR": "🇧🇷",
  "en-US": "🇺🇸",
  "es-419": "🇲🇽",
};

const THEME_LABELS = {
  system: { label: "Sistema", icon: "💻" },
  dark: { label: "Escuro", icon: "🌙" },
  light: { label: "Claro", icon: "☀️" },
};

bootstrapLocale();
bootstrapTheme();

function applySessionMode(preferences) {
  const isAdmin = preferences?.mode === "admin";
  adminElements.forEach((element) => {
    if (!element) {
      return;
    }
    element.hidden = !isAdmin;
    element.setAttribute("aria-hidden", String(!isAdmin));
  });
  document.body.dataset.sessionMode = isAdmin ? "admin" : "user";
}

const initialPreferences = getSessionPreferences();
applySessionMode(initialPreferences);
renderThemeControl(initialPreferences);
renderLanguageControl(initialPreferences);

subscribeToSessionPreferences((preferences) => {
  applySessionMode(preferences);
  renderThemeControl(preferences);
  renderLanguageControl(preferences);
});

function getThemeState(preferences) {
  if (!preferences) {
    return "system";
  }
  if (preferences.seguirSistema !== false) {
    return "system";
  }
  return preferences.temaPreferido === "dark" ? "dark" : "light";
}

function renderThemeControl(preferences) {
  if (!themeToggle) {
    return;
  }
  const current = getThemeState(preferences);
  const config = THEME_LABELS[current] ?? THEME_LABELS.system;
  const icon = themeToggle.querySelector("[data-theme-icon]");
  const label = themeToggle.querySelector("[data-theme-label]");
  const description = themeToggle.querySelector("[data-theme-description]");
  const readable = `Tema: ${config.label}`;
  themeToggle.setAttribute("aria-label", `Alternar tema (atual: ${config.label})`);
  themeToggle.title = readable;
  if (description) {
    description.textContent = `Alternar tema (atual: ${config.label})`;
  }
  if (icon) {
    icon.textContent = config.icon;
  }
  if (label) {
    label.textContent = config.label;
  }
}

function cycleTheme() {
  const preferences = getSessionPreferences();
  const current = getThemeState(preferences);
  if (current === "system") {
    updateSessionPreferences({ seguirSistema: false, temaPreferido: "dark" });
    return;
  }
  if (current === "dark") {
    updateSessionPreferences({ seguirSistema: false, temaPreferido: "light" });
    return;
  }
  updateSessionPreferences({ seguirSistema: true });
}

function getLocaleState(preferences) {
  if (!preferences) {
    return DEFAULT_LOCALE;
  }
  const preferred = preferences.idiomaPreferido;
  if (preferred && SUPPORTED_LOCALES.has(preferred)) {
    return preferred;
  }
  return DEFAULT_LOCALE;
}

function getLocaleLabel(locale) {
  return LOCALE_LABELS[locale] ?? locale;
}

function getLocaleIcon(locale) {
  return LOCALE_ICONS[locale] ?? "🌐";
}

function renderLanguageControl(preferences) {
  if (!languageToggle) {
    return;
  }
  if (!LOCALE_SEQUENCE.length) {
    languageToggle.setAttribute("aria-label", "Alternar idioma");
    languageToggle.title = "Idioma";
    const description = languageToggle.querySelector("[data-language-description]");
    if (description) {
      description.textContent = "Alternar idioma";
    }
    return;
  }
  const locale = getLocaleState(preferences);
  const icon = languageToggle.querySelector("[data-language-icon]");
  const label = languageToggle.querySelector("[data-language-label]");
  const description = languageToggle.querySelector("[data-language-description]");
  const readable = `Idioma: ${getLocaleLabel(locale)}`;
  languageToggle.setAttribute("aria-label", `Alternar idioma (atual: ${getLocaleLabel(locale)})`);
  languageToggle.title = readable;
  if (description) {
    description.textContent = `Alternar idioma (atual: ${getLocaleLabel(locale)})`;
  }
  if (icon) {
    icon.textContent = getLocaleIcon(locale);
  }
  if (label) {
    label.textContent = getLocaleLabel(locale);
  }
}

function cycleLanguage() {
  if (!LOCALE_SEQUENCE.length) {
    return;
  }
  const preferences = getSessionPreferences();
  const locale = getLocaleState(preferences);
  const index = LOCALE_SEQUENCE.indexOf(locale);
  if (index === -1) {
    updateSessionPreferences({ idiomaPreferido: LOCALE_SEQUENCE[0] ?? DEFAULT_LOCALE });
    return;
  }
  const nextIndex = (index + 1) % LOCALE_SEQUENCE.length;
  const nextLocale = LOCALE_SEQUENCE[nextIndex] ?? DEFAULT_LOCALE;
  updateSessionPreferences({ idiomaPreferido: nextLocale });
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    cycleTheme();
  });
}

if (languageToggle) {
  languageToggle.addEventListener("click", () => {
    cycleLanguage();
  });
}

configureRouter({
  target: appOutlet,
  onHome: renderHome,
  onMiniApp: renderMiniApp,
});

function wireNavigation() {
  document.body.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) {
      return;
    }
    const href = link.getAttribute("href");
    if (!href) {
      return;
    }
    const url = new URL(href, window.location.href);
    if (url.origin !== location.origin) {
      return;
    }
    event.preventDefault();
    navigate(url.pathname + url.search + url.hash);
  });
}

async function renderHome({ outlet }) {
  if (!outlet) {
    return;
  }
  outlet.innerHTML = `
    <section class="app-shell">
      <header class="section-header">
        <div>
          <h1>Central de Operações</h1>
          <p class="kpi-label">KPIs e Marketplace de MiniApps</p>
        </div>
      </header>
      <section class="kpi-grid" aria-label="Indicadores principais">
        <article class="kpi-card">
          <span class="kpi-label">MiniApps Registradas</span>
          <span class="kpi-value" data-kpi="apps">--</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">Ativas Hoje</span>
          <span class="kpi-value">--</span>
        </article>
        <article class="kpi-card">
          <span class="kpi-label">Uso Médio</span>
          <span class="kpi-value">--</span>
        </article>
      </section>
      <section aria-labelledby="market-title">
        <div class="section-header">
          <h2 id="market-title">Marketplace</h2>
        </div>
        <div id="market-grid" class="grid"></div>
      </section>
    </section>
  `;

  const grid = outlet.querySelector("#market-grid");
  const appsTotal = await getAppsCount();
  const totalElement = outlet.querySelector('[data-kpi="apps"]');
  if (totalElement) {
    totalElement.textContent = String(appsTotal);
  }
  await mountMarket(grid);
  grid?.addEventListener("click", (event) => {
    const trigger = event.target.closest("button[data-id]");
    if (!trigger) {
      return;
    }
    event.preventDefault();
    const id = trigger.getAttribute("data-id");
    if (id) {
      const target = new URL(`../../miniapps/${id}/`, window.location.href);
      navigate(`${target.pathname}${target.search}${target.hash}`);
    }
  });
  if (statusFooter) {
    statusFooter.textContent = "Home carregada.";
  }
}

async function renderMiniApp({ id, outlet }) {
  if (!outlet) {
    return;
  }
  try {
    const moduleUrl = new URL(`../../miniapps/${id}/index.js`, import.meta.url);
    const mod = await import(moduleUrl.href);
    if (typeof mod.mount === "function") {
      await mod.mount(outlet);
      if (statusFooter) {
        statusFooter.textContent = `MiniApp “${id}” carregada.`;
      }
      return;
    }
  } catch (error) {
    console.warn(`Falha ao carregar MiniApp ${id}:`, error);
  }
  outlet.innerHTML = `
    <section class="card">
      <header class="card-hd">
        <h2>MiniApp não encontrado</h2>
      </header>
      <div class="card-bd">
        <p>Não foi possível localizar a MiniApp solicitada.</p>
      </div>
    </section>
  `;
  if (statusFooter) {
    statusFooter.textContent = "Erro ao carregar MiniApp.";
  }
}

wireNavigation();
resolve();
