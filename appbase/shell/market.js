import router from "./router.js";

export async function mountMarket(root=document.querySelector("#app")){
  const { apps } = await (await fetch("/appbase/market/registry.json")).json();
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
    el.querySelector("button").onclick = () => router.navigate(`#/miniapps/${app.id}`);
    grid.appendChild(el);
  }
}
