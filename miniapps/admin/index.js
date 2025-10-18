export async function mount(root) {
  await import("./components/miniapp-root.js");
  root.innerHTML = "<admin-miniapp></admin-miniapp>";
}
