function cloneApp(app) {
  return { ...app };
}

function getDisplayName(app, locale) {
  if (app?.name && typeof app.name === "object") {
    if (locale && app.name[locale]) {
      return app.name[locale];
    }
    const fallbacks = ["pt-BR", "en-US", "es-419"];
    for (const key of fallbacks) {
      if (app.name[key]) {
        return app.name[key];
      }
    }
  }
  return app?.id ?? "";
}

function moveItem(list, fromIndex, toIndex) {
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next.map(cloneApp);
}

function updateVisibility(list, index) {
  const next = list.map(cloneApp);
  const item = next[index];
  if (!item) {
    return next;
  }
  item.visibility = item.visibility === "hidden" ? "public" : "hidden";
  return next;
}

const REGISTRY_URL = new URL("../../../appbase/market/registry.json", import.meta.url);

export async function renderCatalog(root, { t, locale }) {
  root.innerHTML = `
    <section class="catalog-view">
      <p class="helper">${t("catalog.helper")}</p>
      <div class="catalog-list" data-role="catalog-list" aria-live="polite"></div>
    </section>
  `;
  const list = root.querySelector("[data-role=\"catalog-list\"]");
  if (!list) {
    return;
  }
  let apps = [];
  try {
    const response = await fetch(REGISTRY_URL);
    const payload = await response.json();
    if (payload && Array.isArray(payload.apps)) {
      apps = payload.apps.map(cloneApp);
    }
  } catch (error) {
    const errorBox = document.createElement("div");
    errorBox.className = "alert error";
    errorBox.textContent = t("catalog.error");
    list.appendChild(errorBox);
    console.warn("Falha ao carregar catálogo de MiniApps:", error);
    return;
  }

  if (!apps.length) {
    const empty = document.createElement("p");
    empty.className = "helper empty";
    empty.textContent = t("catalog.empty");
    list.appendChild(empty);
    return;
  }

  function paint() {
    list.innerHTML = "";
    apps.forEach((app, index) => {
      const item = document.createElement("article");
      item.className = "card compact";
      const visibilityLabel = app.visibility === "hidden" ? t("catalog.visibility.hidden") : t("catalog.visibility.visible");
      item.innerHTML = `
        <header class="card-hd">
          <div>
            <h3>${getDisplayName(app, locale)}</h3>
            <small class="hint">${t("catalog.positionLabel")} #${index + 1}</small>
          </div>
          <div class="card-actions">
            <button class="btn ghost" type="button" data-action="move-up">${t("catalog.actions.moveUp")}</button>
            <button class="btn ghost" type="button" data-action="move-down">${t("catalog.actions.moveDown")}</button>
          </div>
        </header>
        <div class="card-bd">
          <p>${app.summary ?? ""}</p>
          <label class="toggle">
            <input type="checkbox" data-action="toggle-visibility" ${app.visibility === "hidden" ? "" : "checked"} />
            <span>${t("catalog.visibilityLabel")}: ${visibilityLabel}</span>
          </label>
        </div>
      `;
      const moveUp = item.querySelector('[data-action="move-up"]');
      const moveDown = item.querySelector('[data-action="move-down"]');
      const toggle = item.querySelector('[data-action="toggle-visibility"]');
      if (moveUp) {
        moveUp.addEventListener("click", () => {
          if (index === 0) {
            return;
          }
          apps = moveItem(apps, index, index - 1);
          paint();
        });
      }
      if (moveDown) {
        moveDown.addEventListener("click", () => {
          if (index === apps.length - 1) {
            return;
          }
          apps = moveItem(apps, index, index + 1);
          paint();
        });
      }
      if (toggle) {
        toggle.addEventListener("change", () => {
          apps = updateVisibility(apps, index);
          paint();
        });
      }
      list.appendChild(item);
    });
  }

  paint();
}
