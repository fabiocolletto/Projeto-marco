import "../styles/tokens.css";
import "../styles/components.css";
import { renderHome } from "../views/home.js";
import { renderSettings } from "../views/settings.js";

const routes = {
  "/": renderHome,
  "/settings": renderSettings
};

function renderRoute(host, route) {
  const target = host.querySelector(".miniapp-view");
  const action = routes[route] ?? routes["/"];
  action(target);
}

class MiniappRoot extends HTMLElement {
  constructor() {
    super();
    this.handleClick = this.handleClick.bind(this);
  }

  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    this.innerHTML = `
      <section class="card miniapp-card">
        <header class="card-hd">
          <h2 class="miniapp-title" data-i18n="miniapp.title">MiniApp Scaffold</h2>
        </header>
        <div class="card-bd">
          <div class="miniapp-view"></div>
          <button class="btn primary miniapp-action" type="button" data-route="/settings" data-i18n="actions.openSettings">
            Abrir Settings
          </button>
        </div>
      </section>
    `;
    this.addEventListener("click", this.handleClick);
    renderRoute(this, "/");
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick);
  }

  handleClick(event) {
    const btn = event.target.closest("[data-route]");
    if (!btn) return;
    event.preventDefault();
    const route = btn.dataset.route;
    renderRoute(this, route);
    this.dispatchEvent(
      new CustomEvent("miniapp:navigate", {
        bubbles: true,
        composed: true,
        detail: { route }
      })
    );
  }
}

customElements.define("miniapp-root", MiniappRoot);
