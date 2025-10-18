import { configureRouter, navigate, resolve } from "./router.js";
import { getAppsCount, mountMarket } from "./market.js";

const appOutlet = document.querySelector("#app");
const statusFooter = document.querySelector("#status");

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
    const url = new URL(link.href, location.origin);
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
      navigate(`/miniapps/${id}`);
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
    const mod = await import(`/miniapps/${id}/index.js`);
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
