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
  host.querySelectorAll("[data-route]").forEach(btn => {
    btn.ariaCurrent = btn.dataset.route === route ? "page" : null;
  });
}

class MiniappRoot extends HTMLElement {
  connectedCallback() {
    if (this.isConnected) {
      this.innerHTML = `
        <section class="card miniapp-card">
          <header class="card-hd">
            <h2>MiniApp Scaffold</h2>
            <div class="card-actions">
              <button class="btn ghost" data-route="/">Início</button>
              <button class="btn ghost" data-route="/settings">Configurações</button>
            </div>
          </header>
          <div class="card-bd">
            <section class="miniapp-view"></section>
          </div>
        </section>
      `;
      this.addEventListener("click", event => {
        const btn = event.target.closest("[data-route]");
        if (btn) {
          event.preventDefault();
          renderRoute(this, btn.dataset.route);
        }
      });
      renderRoute(this, "/");
    }
  }
}

customElements.define("miniapp-root", MiniappRoot);
