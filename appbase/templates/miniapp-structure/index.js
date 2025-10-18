import "./components/miniapp-root.js";

export function mount(root = document.body) {
  const host = document.createElement("miniapp-root");
  root.innerHTML = "";
  root.appendChild(host);
  return host;
}
