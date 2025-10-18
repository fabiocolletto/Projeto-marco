import router from "./router.js";

export async function mountMarket(root = document.querySelector("#app")) {
  const { apps } = await (await fetch("/appbase/market/registry.json")).json();
  root.innerHTML = `<section class="grid" id="market-grid"></section>`;
  const grid = root.querySelector("#market-grid");
  for (const app of apps) {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `<header class="card-hd"><h3>${app.name?.["pt-BR"] || app.id}</h3>
      <div class="card-actions"><button class="btn primary" data-id="${app.id}">Abrir</button></div></header>
      <div class="card-bd"><p>${app.summary || ""}</p></div>`;
    el.querySelector("button").onclick = () => router.navigate(`/miniapps/${app.id}`);
    grid.appendChild(el);
  }
}
