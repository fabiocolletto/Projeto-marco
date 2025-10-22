let outlet = null;
let homeHandler = null;
let miniAppHandler = null;

export function configureRouter({ target = document.querySelector("#app"), onHome, onMiniApp }) {
  outlet = target;
  homeHandler = onHome;
  miniAppHandler = onMiniApp;
}

export function navigate(target) {
  const url = typeof target === "string" ? new URL(target, window.location.href) : target;
  const nextPath = `${url.pathname}${url.search}${url.hash}`;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentPath !== nextPath) {
    window.history.pushState({}, "", nextPath);
  }
  resolve();
}

export async function resolve() {
  if (!outlet) {
    outlet = document.querySelector("#app");
  }
  const segments = location.pathname.split("/").filter(Boolean);
  const routePrefixes = ["apps", "miniapps"];
  if (routePrefixes.includes(segments[0]) && segments[1]) {
    if (typeof miniAppHandler === "function") {
      await miniAppHandler({ id: segments[1], outlet });
      return;
    }
  }
  if (typeof homeHandler === "function") {
    await homeHandler({ outlet });
  }
}

addEventListener("popstate", () => {
  resolve();
});

export default { configureRouter, navigate, resolve };
