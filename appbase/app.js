import config from "./config/app.config.json" assert { type: "json" };
import { users } from "./modules/users.js";
import { subscribe, validateLicense, fetchPlans } from "./modules/licensing.js";

const root = document.querySelector("[data-app-root]");
if (!root) {
  throw new Error("[clean-shell] elemento raiz não encontrado");
}

const get = (selector) => root.querySelector(selector);
const versionTag = get("[data-version]");
const wrap = get(".ac-clean__wrap");
const overlay = get(".ac-clean__desktop-overlay");
const output = get("#out");
const who = get("#who");
const inputEmail = get("#email");

if (versionTag && config.version_label) {
  versionTag.textContent = config.version_label;
}

const log = (value) => {
  if (!output) return;
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  output.textContent = `${text}\n${output.textContent}`.trim();
};

const refreshSession = () => {
  const current = users.getCurrent();
  if (!who) return;
  who.textContent = current ? `Logado como ${current.email}` : "Não logado";
};

const isDesktop = () => window.innerWidth > 800 || window.matchMedia("(pointer: fine)").matches;

const toggleOverlay = () => {
  if (!overlay || !wrap) return;
  const show = Boolean(config.mobile_only) && isDesktop();
  overlay.classList.toggle("is-visible", show);
  wrap.classList.toggle("is-blurred", show);
  overlay.setAttribute("aria-hidden", String(!show));
};

toggleOverlay();
window.addEventListener("resize", toggleOverlay);

try {
  const pointerQuery = window.matchMedia("(pointer: fine)");
  pointerQuery.addEventListener("change", toggleOverlay);
} catch (error) {
  console.warn("[clean-shell] não foi possível observar mudanças de ponteiro", error);
}

refreshSession();

get("#btnLogin")?.addEventListener("click", () => {
  try {
    const email = inputEmail?.value ?? "";
    users.login(email);
    refreshSession();
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
  }
});

get("#btnLogout")?.addEventListener("click", () => {
  users.logout();
  refreshSession();
});

get("#btnSubscribe")?.addEventListener("click", async () => {
  const current = users.getCurrent();
  if (!current) {
    alert("Faça login antes.");
    return;
  }
  try {
    const response = await subscribe(
      config.worker_url,
      current.email,
      config?.licensing?.plan_required ?? "pro"
    );
    log(response);
    const initPoint = response?.subscription?.init_point;
    if (initPoint) {
      window.open(initPoint, "_blank", "noopener");
    }
  } catch (error) {
    log({ error: String(error) });
  }
});

get("#btnValidate")?.addEventListener("click", async () => {
  const current = users.getCurrent();
  if (!current) {
    alert("Faça login antes.");
    return;
  }
  const result = await validateLicense(config.worker_url, current.ref);
  log(result);
});

get("#btnPlans")?.addEventListener("click", async () => {
  try {
    const plans = await fetchPlans(config.worker_url);
    log(plans);
  } catch (error) {
    log({ error: String(error) });
  }
});
