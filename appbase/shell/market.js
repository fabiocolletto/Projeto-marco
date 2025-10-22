import router from "./router.js";

const REGISTRY_URL = new URL("./market/registry.json", import.meta.url);

function buildMiniAppPath(id) {
  if (!id) {
    return location.pathname;
  }
  const target = new URL(`../../apps/${id}/`, window.location.href);
  return `${target.pathname}${target.search}${target.hash}`;
}

export async function mountMarket(root=document.querySelector("#app")){
  const response = await fetch(REGISTRY_URL);
  const { apps } = await response.json();
  root.innerHTML = `<section class="grid" id="market-grid"></section>`;
  const grid = root.querySelector("#market-grid");

  if (!apps || apps.length === 0) {
    const empty = document.createElement("article");
    empty.className = "card";
    empty.innerHTML = `<div class="card-bd">Nenhum MiniApp ainda. Use “Criar MiniApp” (modo Admin).</div>`;
    grid.appendChild(empty); return;
  }

  for (const app of apps){
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <header class="card-hd">
        <h3>${app.name?.["pt-BR"] || app.id}</h3>
        <div class="card-actions"><button class="btn primary" data-id="${app.id}">Abrir</button></div>
      </header>
      <div class="card-bd">
        ${app.icon ? `<img src="${app.icon}" alt="" style="width:48px;height:48px;border-radius:12px">` : ""}
        <p>${app.summary || ""}</p>
      </div>
    `;
    el.querySelector("button").onclick = () => router.navigate(buildMiniAppPath(app.id));
    grid.appendChild(el);
  }
}
