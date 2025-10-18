export async function mount(root){
  await import("./components/miniapp-root.js");
  root.innerHTML = "<miniapp-root></miniapp-root>";
}
