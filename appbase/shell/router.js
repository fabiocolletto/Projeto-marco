export function navigate(path) {
  history.pushState({}, "", path);
  dispatchEvent(new Event("popstate"));
}

export async function resolve(outlet = document.querySelector("#app")) {
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts[0] === "miniapps" && parts[1]) {
    const id = parts[1];
    try {
      const mod = await import(`/miniapps/${id}/index.js`);
      return mod.mount(outlet);
    } catch {
      outlet.innerHTML = `<div class="card"><div class="card-bd">MiniApp não encontrado.</div></div>`;
    }
  } else {
    const { mountMarket } = await import("./market.js");
    return mountMarket(outlet);
  }
}

addEventListener("popstate", () => resolve());

export default { navigate, resolve };
