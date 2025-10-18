import {
  getSessionPreferences,
  subscribeToSessionPreferences,
} from "/appbase/shell/session.js";
import {
  createTranslator,
  getMessages,
  normalizeLocale,
} from "../i18n/index.js";
import { renderCatalog } from "../views/catalog.js";
import { renderUsers } from "../views/users.js";

const baseStyles = `
  @import "/packages/ui/tokens.css";
  @import "/packages/ui/components.css";
  :host { display: block; }
  .admin-app { display: flex; flex-direction: column; gap: 1.25rem; }
  .admin-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: var(--primary-100, #dbeafe);
    color: var(--primary-700, #1d4ed8);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .tab-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.5rem 0 1rem; }
  .tab-bar button {
    border-radius: 999px;
    border: 1px solid var(--gray-300, #d1d5db);
    background: var(--surface-100, #f3f4f6);
    padding: 0.5rem 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  }
  .tab-bar button[aria-selected="true"] {
    background: var(--primary-500, #2563eb);
    border-color: var(--primary-500, #2563eb);
    color: var(--surface-0, #ffffff);
  }
  .tab-bar button:focus-visible {
    outline: 2px solid var(--primary-500, #2563eb);
    outline-offset: 2px;
  }
  .helper { color: var(--gray-600, #4b5563); font-size: 0.875rem; margin-bottom: 0.75rem; }
  .catalog-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .users-view .card { margin-top: 0.5rem; }
  .card.compact .card-bd { display: flex; flex-direction: column; gap: 0.5rem; }
  .card.compact .card-actions { gap: 0.5rem; }
  .toggle { display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 500; }
  .alert.error {
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: var(--error-100, #fee2e2);
    color: var(--error-700, #b91c1c);
  }
  footer[data-role="footnote"] {
    font-size: 0.75rem;
    color: var(--gray-500, #6b7280);
  }
  .lock-card {
    max-width: 480px;
    margin: 2rem auto;
  }
`;

class AdminMiniApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.preferences = getSessionPreferences();
    this.currentLocale = normalizeLocale(this.preferences?.idiomaPreferido);
    this.messages = null;
    this.t = (key) => key;
    this.currentTab = null;
    this.updatePromise = null;
    this.renderToken = null;
    this.unsubscribe = null;
    this.onTabClick = null;
    this.handleHashChange = this.handleHashChange.bind(this);
    this.currentPath = location.pathname;
  }

  connectedCallback() {
    this.requestUpdate();
    this.unsubscribe = subscribeToSessionPreferences((prefs) => {
      this.preferences = prefs;
      const nextLocale = normalizeLocale(prefs?.idiomaPreferido);
      if (nextLocale !== this.currentLocale) {
        this.currentLocale = nextLocale;
      }
      this.requestUpdate();
    });
    window.addEventListener("hashchange", this.handleHashChange);
  }

  disconnectedCallback() {
    if (typeof this.unsubscribe === "function") {
      this.unsubscribe();
    }
    window.removeEventListener("hashchange", this.handleHashChange);
    this.teardownAdminLayout();
  }

  handleHashChange() {
    if (location.pathname !== this.currentPath) {
      return;
    }
    const targetTab = this.normalizeTab(this.getTabFromHash());
    if (targetTab !== this.currentTab) {
      this.currentTab = targetTab;
      this.requestUpdate();
    }
  }

  requestUpdate() {
    this.updatePromise = (this.updatePromise ?? Promise.resolve())
      .then(() => this.performUpdate())
      .catch((error) => {
        console.error("Falha ao atualizar o Admin MiniApp:", error);
      });
    return this.updatePromise;
  }

  async performUpdate() {
    await this.ensureMessages();
    this.renderAccordingToMode();
  }

  async ensureMessages() {
    const locale = this.currentLocale;
    try {
      this.messages = await getMessages(locale);
      this.t = createTranslator(this.messages);
    } catch (error) {
      console.error("Erro ao carregar traduções do Admin MiniApp:", error);
      this.messages = null;
      this.t = (key) => key;
    }
  }

  renderAccordingToMode() {
    if (this.preferences?.mode !== "admin") {
      this.renderToken = null;
      this.teardownAdminLayout();
      this.renderAccessDenied();
      return;
    }
    this.ensureAdminLayout();
    this.updateTexts();
    const tab = this.normalizeTab(this.currentTab ?? this.getTabFromHash());
    if (tab !== this.currentTab) {
      this.currentTab = tab;
    }
    this.switchTab(tab);
  }

  renderAccessDenied() {
    this.shadowRoot.innerHTML = `
      <style>${baseStyles}</style>
      <article class="card lock-card">
        <header class="card-hd">
          <h2>${this.t("access.title")}</h2>
        </header>
        <div class="card-bd">
          <p>${this.t("access.description")}</p>
        </div>
      </article>
    `;
  }

  ensureAdminLayout() {
    if (this.isAdminLayoutMounted) {
      return;
    }
    this.shadowRoot.innerHTML = `
      <style>${baseStyles}</style>
      <article class="card admin-app" data-role="admin-layout">
        <header class="card-hd admin-header">
          <div>
            <h1 data-i18n="title"></h1>
          </div>
          <span class="badge" data-i18n="modeBadge"></span>
        </header>
        <div class="card-bd">
          <nav class="tab-bar" data-role="tabs" role="tablist">
            <button type="button" role="tab" data-tab="catalog" aria-selected="true" tabindex="0" data-i18n="tabs.catalog"></button>
            <button type="button" role="tab" data-tab="users" aria-selected="false" tabindex="-1" data-i18n="tabs.users"></button>
          </nav>
          <section class="view" data-role="view" aria-live="polite"></section>
        </div>
        <footer class="card-ft" data-role="footnote"></footer>
      </article>
    `;
    this.isAdminLayoutMounted = true;
    this.tabsElement = this.shadowRoot.querySelector("[data-role=\"tabs\"]");
    this.viewContainer = this.shadowRoot.querySelector("[data-role=\"view\"]");
    this.footnoteElement = this.shadowRoot.querySelector("[data-role=\"footnote\"]");
    this.onTabClick = (event) => {
      const trigger = event.target.closest("[data-tab]");
      if (!trigger) {
        return;
      }
      event.preventDefault();
      const tab = this.normalizeTab(trigger.getAttribute("data-tab"));
      if (tab !== this.currentTab) {
        this.currentTab = tab;
        this.switchTab(tab);
      }
    };
    if (this.tabsElement) {
      this.tabsElement.addEventListener("click", this.onTabClick);
    }
  }

  teardownAdminLayout() {
    if (this.tabsElement && this.onTabClick) {
      this.tabsElement.removeEventListener("click", this.onTabClick);
    }
    this.tabsElement = null;
    this.viewContainer = null;
    this.footnoteElement = null;
    this.isAdminLayoutMounted = false;
  }

  updateTexts() {
    if (!this.isAdminLayoutMounted) {
      return;
    }
    const assignments = [
      ["[data-i18n=\"title\"]", "title"],
      ["[data-i18n=\"modeBadge\"]", "modeBadge"],
      ["[data-i18n=\"tabs.catalog\"]", "tabs.catalog"],
      ["[data-i18n=\"tabs.users\"]", "tabs.users"],
    ];
    assignments.forEach(([selector, key]) => {
      const element = this.shadowRoot.querySelector(selector);
      if (element) {
        element.textContent = this.t(key);
      }
    });
  }

  async switchTab(tab) {
    if (!this.isAdminLayoutMounted || !this.viewContainer) {
      return;
    }
    const normalized = this.normalizeTab(tab);
    this.currentTab = normalized;
    this.updateTabButtons();
    const token = Symbol("admin-view");
    this.renderToken = token;
    if (normalized === "catalog") {
      await renderCatalog(this.viewContainer, { t: this.t, locale: this.currentLocale });
      if (this.renderToken !== token) {
        return;
      }
      this.setFootnote(this.t("catalog.localChanges"));
    } else {
      renderUsers(this.viewContainer, { t: this.t });
      if (this.renderToken !== token) {
        return;
      }
      this.setFootnote(this.t("users.helper"));
    }
    this.updateTabButtons();
    this.syncHash(normalized);
  }

  updateTabButtons() {
    if (!this.tabsElement) {
      return;
    }
    const buttons = this.tabsElement.querySelectorAll("[data-tab]");
    buttons.forEach((button) => {
      const tab = this.normalizeTab(button.getAttribute("data-tab"));
      const isActive = tab === this.currentTab;
      button.setAttribute("aria-selected", String(isActive));
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });
  }

  setFootnote(text) {
    if (!this.footnoteElement) {
      return;
    }
    if (text) {
      this.footnoteElement.hidden = false;
      this.footnoteElement.textContent = text;
    } else {
      this.footnoteElement.hidden = true;
      this.footnoteElement.textContent = "";
    }
  }

  syncHash(tab) {
    const desiredHash = `#${tab}`;
    if (location.pathname === this.currentPath && location.hash !== desiredHash) {
      history.replaceState(null, "", `${location.pathname}${desiredHash}`);
    }
  }

  getTabFromHash() {
    const hash = (location.hash || "").replace(/^#/, "");
    return this.normalizeTab(hash);
  }

  normalizeTab(tab) {
    return tab === "users" ? "users" : "catalog";
  }
}

customElements.define("admin-miniapp", AdminMiniApp);
