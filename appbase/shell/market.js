const REGISTRY_PATH = "/appbase/market/registry.json";
let cachedApps = null;

async function loadRegistry() {
  if (cachedApps) {
    return cachedApps;
  }
  const response = await fetch(REGISTRY_PATH, { cache: "no-store" });
  if (!response.ok) {
    cachedApps = [];
    return cachedApps;
  }
  const payload = await response.json();
  cachedApps = Array.isArray(payload.apps) ? payload.apps : [];
  return cachedApps;
}

function createMarketCard(app) {
  const article = document.createElement("article");
  article.className = "card";
  const title = app.name?.["pt-BR"] || app.name?.default || app.id;
  article.innerHTML = `
    <header class="card-hd">
      <div>
        <h3>${title || "MiniApp"}</h3>
      </div>
      <div class="card-actions">
        <button class="btn primary" data-id="${app.id}">Abrir</button>
      </div>
    </header>
    <div class="card-bd">
      <p>${app.summary || "Experimente esta MiniApp."}</p>
    </div>
  `;
  return article;
}

export async function mountMarket(container) {
  if (!container) {
    return;
  }
  const apps = await loadRegistry();
  container.innerHTML = "";
  if (!apps.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Nenhuma MiniApp disponível no momento.";
    container.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const app of apps) {
    fragment.appendChild(createMarketCard(app));
  }
  container.appendChild(fragment);
}

export async function getAppsCount() {
  const apps = await loadRegistry();
  return apps.length;
}
