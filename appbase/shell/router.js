let outlet = null;
let homeHandler = null;
let miniAppHandler = null;

export function configureRouter({ target = document.querySelector("#app"), onHome, onMiniApp }) {
  outlet = target;
  homeHandler = onHome;
  miniAppHandler = onMiniApp;
}

export function navigate(path) {
  if (location.pathname !== path) {
    history.pushState({}, "", path);
  }
  resolve();
}

export async function resolve() {
  if (!outlet) {
    outlet = document.querySelector("#app");
  }
  const segments = location.pathname.split("/").filter(Boolean);
  if (segments[0] === "miniapps" && segments[1]) {
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
