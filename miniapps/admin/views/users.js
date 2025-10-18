import {
  createUser,
  deleteUser,
  listUsers,
  subscribeToUsers,
  updateUser,
} from "/appbase/shell/users-store.js";
import {
  SUPPORTED_LOCALES,
  getTranslationOpportunities,
  subscribeToTranslationOpportunities,
} from "/appbase/shell/i18n.js";

const STATUS_OPTIONS = ["active", "pending", "suspended"];
const ROLE_OPTIONS = ["admin", "manager", "viewer"];
const THEME_OPTIONS = ["light", "dark"];
const LANG_OPTIONS = Array.from(SUPPORTED_LOCALES);
const FEEDBACK_TIMEOUT = 3200;

function formatHash(hash) {
  if (!hash) {
    return "—";
  }
  if (hash.length <= 16) {
    return hash;
  }
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function populateSelect(select, values, getLabel) {
  if (!select) {
    return;
  }
  select.innerHTML = "";
  values.forEach((value) => {
    const option = createOption(value, getLabel(value));
    select.appendChild(option);
  });
}

function createDependentRow({
  nome = "",
  telefone = "",
  telefoneHash = null,
}, { t, allowRemove = true, placeholderPhone = "", includeHash = false } = {}) {
  const row = document.createElement("div");
  row.className = "dependent-row";
  row.dataset.dependentRow = "true";
  row.innerHTML = `
    <div class="field">
      <label>
        <span>${t("users.create.fields.dependenteNome")}</span>
        <input type="text" name="dependente-nome" value="${nome.replace(/"/g, "&quot;")}" />
      </label>
    </div>
    <div class="field">
      <label>
        <span>${t("users.create.fields.dependenteTelefone")}</span>
        <input type="text" name="dependente-telefone" value="${telefone.replace(/"/g, "&quot;")}" placeholder="${placeholderPhone}" />
      </label>
    </div>
    ${includeHash && telefoneHash ? `<input type="hidden" name="dependente-hash" value="${telefoneHash}" />` : ""}
    ${
      allowRemove
        ? `<button type="button" class="btn ghost" data-action="remove-dependent">${t("users.create.fields.removerDependente")}</button>`
        : ""
    }
  `;
  return row;
}

function readDependents(container) {
  const dependents = [];
  if (!container) {
    return dependents;
  }
  const rows = container.querySelectorAll("[data-dependent-row]");
  rows.forEach((row) => {
    const nameInput = row.querySelector('input[name="dependente-nome"]');
    const phoneInput = row.querySelector('input[name="dependente-telefone"]');
    const hashInput = row.querySelector('input[name="dependente-hash"]');
    const nome = nameInput?.value?.trim() ?? "";
    const telefone = phoneInput?.value?.trim() ?? "";
    const telefoneHash = hashInput?.value?.trim() ?? null;
    if (!nome) {
      return;
    }
    const payload = { nome };
    if (telefone) {
      payload.telefone = telefone;
    } else if (telefoneHash) {
      payload.telefoneHash = telefoneHash;
    }
    dependents.push(payload);
  });
  return dependents;
}

function toggleThemeControl(form) {
  if (!form) {
    return;
  }
  const followInput = form.querySelector('input[name="seguirSistema"]');
  const themeSelect = form.querySelector('select[name="temaPreferido"]');
  if (!followInput || !themeSelect) {
    return;
  }
  const updateState = () => {
    if (followInput.checked) {
      themeSelect.setAttribute("disabled", "true");
    } else {
      themeSelect.removeAttribute("disabled");
    }
  };
  followInput.addEventListener("change", updateState, { passive: true });
  updateState();
}

function showFeedback(element, message) {
  if (!element) {
    return;
  }
  element.textContent = message ?? "";
  element.hidden = !message;
  if (message) {
    window.setTimeout(() => {
      element.textContent = "";
      element.hidden = true;
    }, FEEDBACK_TIMEOUT);
  }
}

function describeTheme(user, t) {
  if (user.seguirSistema) {
    return t("users.list.seguirSistema");
  }
  if (user.temaPreferido) {
    const themeLabel = t(`users.themes.${user.temaPreferido}`);
    return `${t("users.list.temaPersonalizado")}: ${themeLabel}`;
  }
  return t("users.list.temaPersonalizado");
}

function describeLanguage(locale, t) {
  const label = t(`users.languages.${locale}`);
  if (!label || label === `users.languages.${locale}`) {
    return locale;
  }
  return label;
}

function renderDependentsSummary(container, user, t) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!user.dependentes || !user.dependentes.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = t("users.list.noDependentes");
    container.appendChild(empty);
    return;
  }
  const list = document.createElement("ul");
  list.className = "dependent-summary";
  user.dependentes.forEach((dependent) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${dependent.nome}</strong>
      <span>${t("users.dependentes.hash")}: <code>${formatHash(dependent.telefoneHash)}</code></span>
    `;
    list.appendChild(item);
  });
  container.appendChild(list);
}

function renderUserCard(user, { t }) {
  const card = document.createElement("article");
  card.className = "card compact";
  card.dataset.userId = user.userId;
  const statusLabel = t(`users.list.status.${user.status}`);
  const roleLabel = t(`users.list.role.${user.role}`);
  const themeDescription = describeTheme(user, t);
  const languageLabel = describeLanguage(user.idiomaPreferido, t);
  card.innerHTML = `
    <header class="card-hd">
      <div>
        <h3>${user.nome || user.email || user.userId}</h3>
        <small class="hint">${roleLabel} • ${statusLabel}</small>
      </div>
      <div class="card-actions">
        <button type="button" class="btn ghost" data-action="edit">${t("users.list.actions.edit")}</button>
        <button type="button" class="btn danger" data-action="delete">${t("users.list.actions.delete")}</button>
      </div>
    </header>
    <div class="card-bd" data-role="summary">
      <dl class="user-summary">
        <div>
          <dt>${t("users.list.email")}</dt>
          <dd>${user.email || "—"}</dd>
        </div>
        <div>
          <dt>${t("users.list.telefone")}</dt>
          <dd><code>${formatHash(user.telefoneHash)}</code></dd>
        </div>
        <div>
          <dt>${t("users.create.fields.idioma")}</dt>
          <dd>${languageLabel}</dd>
        </div>
        <div>
          <dt>${t("users.create.fields.tema")}</dt>
          <dd>${themeDescription}</dd>
        </div>
      </dl>
      <section class="dependent-section" data-role="dependent-summary" aria-label="${t("users.list.dependentes")}"></section>
    </div>
    <div class="card-ft" data-role="editor" hidden>
      <form data-role="edit-form">
        <div class="form-grid">
          <div class="field">
            <label>
              <span>${t("users.create.fields.nome")}</span>
              <input type="text" name="nome" value="${user.nome.replace(/"/g, "&quot;")}" />
            </label>
          </div>
          <div class="field">
            <label>
              <span>${t("users.create.fields.email")}</span>
              <input type="email" name="email" value="${user.email.replace(/"/g, "&quot;")}" />
            </label>
          </div>
          <div class="field">
            <label>
              <span>${t("users.create.fields.telefone")}</span>
              <input type="text" name="telefone" placeholder="${t("users.create.fields.telefone")}" />
            </label>
            <small class="hint">${t("users.list.telefone")}: <code>${formatHash(user.telefoneHash)}</code></small>
          </div>
          <div class="field">
            <label>
              <span>${t("users.create.fields.status")}</span>
              <select name="status"></select>
            </label>
          </div>
          <div class="field">
            <label>
              <span>${t("users.create.fields.role")}</span>
              <select name="role"></select>
            </label>
          </div>
          <div class="field">
            <label>
              <span>${t("users.create.fields.idioma")}</span>
              <select name="idiomaPreferido"></select>
            </label>
          </div>
          <div class="field">
            <label>
              <span>${t("users.create.fields.tema")}</span>
              <select name="temaPreferido"></select>
            </label>
          </div>
          <label class="toggle">
            <input type="checkbox" name="seguirSistema" ${user.seguirSistema ? "checked" : ""} />
            <span>${t("users.create.fields.seguirSistema")}</span>
          </label>
        </div>
        <fieldset data-role="dependentes">
          <legend>${t("users.create.fields.dependentes")}</legend>
          <div data-role="dependente-rows"></div>
          <button type="button" class="btn ghost" data-action="add-dependent">${t("users.create.fields.adicionarDependente")}</button>
        </fieldset>
        <div class="form-actions">
          <button type="submit" class="btn primary">${t("users.list.actions.save")}</button>
          <button type="button" class="btn ghost" data-action="cancel-edit">${t("users.list.actions.cancel")}</button>
        </div>
        <p class="hint" data-role="edit-feedback" hidden></p>
      </form>
    </div>
  `;
  const dependentsContainer = card.querySelector("[data-role=\"dependente-rows\"]");
  if (dependentsContainer) {
    user.dependentes.forEach((dep) => {
      dependentsContainer.appendChild(
        createDependentRow(dep, {
          t,
          includeHash: true,
          placeholderPhone: t("users.create.fields.telefone"),
        }),
      );
    });
  }
  const statusSelect = card.querySelector('select[name="status"]');
  populateSelect(statusSelect, STATUS_OPTIONS, (value) => t(`users.list.status.${value}`));
  if (statusSelect) {
    statusSelect.value = user.status;
  }
  const roleSelect = card.querySelector('select[name="role"]');
  populateSelect(roleSelect, ROLE_OPTIONS, (value) => t(`users.list.role.${value}`));
  if (roleSelect) {
    roleSelect.value = user.role;
  }
  const langSelect = card.querySelector('select[name="idiomaPreferido"]');
  populateSelect(langSelect, LANG_OPTIONS, (value) => describeLanguage(value, t));
  if (langSelect) {
    langSelect.value = user.idiomaPreferido;
  }
  const themeSelect = card.querySelector('select[name="temaPreferido"]');
  populateSelect(themeSelect, THEME_OPTIONS, (value) => t(`users.themes.${value}`));
  if (themeSelect) {
    themeSelect.value = user.temaPreferido || THEME_OPTIONS[0];
  }
  toggleThemeControl(card.querySelector("form[data-role=\"edit-form\"]"));
  renderDependentsSummary(card.querySelector("[data-role=\"dependent-summary\"]"), user, t);
  return card;
}

function renderUsersList(container, users, { t }) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!users.length) {
    const empty = document.createElement("p");
    empty.className = "helper";
    empty.textContent = t("users.list.empty");
    container.appendChild(empty);
    return;
  }
  users.forEach((user) => {
    container.appendChild(renderUserCard(user, { t }));
  });
}

function renderOpportunities(container, emptyElement, events, t) {
  if (!container || !emptyElement) {
    return;
  }
  container.innerHTML = "";
  if (!events.length) {
    emptyElement.hidden = false;
    return;
  }
  emptyElement.hidden = true;
  const formatter = (() => {
    try {
      return new Intl.DateTimeFormat(document.documentElement.lang || navigator.language || "pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch (error) {
      return null;
    }
  })();
  events
    .slice()
    .reverse()
    .forEach((event) => {
      const item = document.createElement("li");
      let description = event.type;
      if (event.type === "idioma_nao_suportado") {
        description = `${t("users.events.unsupportedLocale")}: ${event.localeDetectado ?? ""}`;
      }
      const timestampLabel = t("users.events.timestamp");
      const when = formatter ? formatter.format(new Date(event.ts)) : new Date(event.ts).toLocaleString();
      item.innerHTML = `
        <strong>${description}</strong>
        <small>${timestampLabel}: ${when}</small>
      `;
      container.appendChild(item);
    });
}

export function renderUsers(root, { t }) {
  if (!root) {
    return;
  }
  if (typeof root.__destroyUsersView === "function") {
    root.__destroyUsersView();
  }
  const teardowns = [];
  const abortController = new AbortController();
  teardowns.push(() => abortController.abort());

  root.innerHTML = `
    <section class="users-view">
      <p class="helper">${t("users.helper")}</p>
      <article class="card outline" data-role="create-user">
        <header class="card-hd">
          <h2>${t("users.create.title")}</h2>
          <p class="hint">${t("users.create.description")}</p>
        </header>
        <form class="card-bd form-grid" data-role="user-create-form">
          <div class="field">
            <label>
              <span>${t("users.create.fields.nome")}</span>
              <input type="text" name="nome" required />
            </label>
          </div>
          <div class="field">
            <label>
              <span>${t("users.create.fields.email")}</span>
              <input type="email" name="email" required />
            </label>
          </div>
          <div class="field">
            <label>
              <span>${t("users.create.fields.telefone")}</span>
              <input type="text" name="telefone" />
            </label>
          </div>
          <div class="field">
            <label>
              <span>${t("users.create.fields.role")}</span>
              <select name="role"></select>
            </label>
          </div>
          <div class="field">
            <label>
              <span>${t("users.create.fields.status")}</span>
              <select name="status"></select>
            </label>
          </div>
          <div class="field">
            <label>
              <span>${t("users.create.fields.idioma")}</span>
              <select name="idiomaPreferido"></select>
            </label>
          </div>
          <div class="field">
            <label>
              <span>${t("users.create.fields.tema")}</span>
              <select name="temaPreferido"></select>
            </label>
          </div>
          <label class="toggle">
            <input type="checkbox" name="seguirSistema" checked />
            <span>${t("users.create.fields.seguirSistema")}</span>
          </label>
          <fieldset data-role="dependentes">
            <legend>${t("users.create.fields.dependentes")}</legend>
            <div data-role="dependente-rows"></div>
            <button type="button" class="btn ghost" data-action="add-dependent">${t("users.create.fields.adicionarDependente")}</button>
          </fieldset>
          <div class="form-actions">
            <button type="submit" class="btn primary">${t("users.create.submit")}</button>
          </div>
          <p class="hint" data-role="create-feedback" hidden></p>
        </form>
      </article>
      <section class="users-list" data-role="users-list" aria-live="polite"></section>
      <article class="card outline" data-role="opportunities">
        <header class="card-hd">
          <h2>${t("users.events.title")}</h2>
        </header>
        <div class="card-bd">
          <p class="hint" data-role="opportunities-empty">${t("users.events.empty")}</p>
          <ul data-role="opportunities-list"></ul>
        </div>
      </article>
    </section>
  `;

  const createForm = root.querySelector("[data-role=\"user-create-form\"]");
  const createFeedback = root.querySelector("[data-role=\"create-feedback\"]");
  const dependentsContainer = createForm?.querySelector("[data-role=\"dependente-rows\"]");
  const userList = root.querySelector("[data-role=\"users-list\"]");
  const opportunitiesList = root.querySelector("[data-role=\"opportunities-list\"]");
  const opportunitiesEmpty = root.querySelector("[data-role=\"opportunities-empty\"]");

  if (dependentsContainer) {
    dependentsContainer.appendChild(
      createDependentRow({}, { t, allowRemove: true, placeholderPhone: t("users.create.fields.telefone") }),
    );
  }

  populateSelect(createForm?.querySelector('select[name="role"]'), ROLE_OPTIONS, (value) =>
    t(`users.list.role.${value}`),
  );
  populateSelect(createForm?.querySelector('select[name="status"]'), STATUS_OPTIONS, (value) =>
    t(`users.list.status.${value}`),
  );
  populateSelect(createForm?.querySelector('select[name="idiomaPreferido"]'), LANG_OPTIONS, (value) =>
    describeLanguage(value, t),
  );
  populateSelect(createForm?.querySelector('select[name="temaPreferido"]'), THEME_OPTIONS, (value) =>
    t(`users.themes.${value}`),
  );
  toggleThemeControl(createForm);

  const handleDependentClick = (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }
    if (action.dataset.action === "add-dependent") {
      event.preventDefault();
      const container = action.closest("fieldset")?.querySelector("[data-role=dependente-rows]");
      if (container) {
        container.appendChild(
          createDependentRow({}, { t, allowRemove: true, placeholderPhone: t("users.create.fields.telefone") }),
        );
      }
    }
    if (action.dataset.action === "remove-dependent") {
      event.preventDefault();
      const row = action.closest("[data-dependent-row]");
      row?.remove();
    }
  };

  createForm?.addEventListener(
    "click",
    (event) => {
      handleDependentClick(event);
    },
    { signal: abortController.signal },
  );

  createForm?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      if (!createForm) {
        return;
      }
      const formData = new FormData(createForm);
      const nome = (formData.get("nome") || "").toString().trim();
      const email = (formData.get("email") || "").toString().trim();
      if (!nome) {
        showFeedback(createFeedback, t("users.errors.requiredName"));
        return;
      }
      if (!email) {
        showFeedback(createFeedback, t("users.errors.requiredEmail"));
        return;
      }
      const telefone = (formData.get("telefone") || "").toString().trim();
      const role = (formData.get("role") || "viewer").toString();
      const status = (formData.get("status") || "pending").toString();
      const idiomaPreferido = (formData.get("idiomaPreferido") || LANG_OPTIONS[0]).toString();
      const temaPreferido = (formData.get("temaPreferido") || THEME_OPTIONS[0]).toString();
      const seguirSistema = formData.get("seguirSistema") !== null;
      const dependentes = readDependents(createForm.querySelector("[data-role=dependente-rows]"));
      try {
        await createUser({
          nome,
          email,
          telefone,
          role,
          status,
          idiomaPreferido,
          temaPreferido: seguirSistema ? null : temaPreferido,
          seguirSistema,
          dependentes,
        });
        createForm.reset();
        toggleThemeControl(createForm);
        if (dependentsContainer) {
          dependentsContainer.innerHTML = "";
          dependentsContainer.appendChild(
            createDependentRow({}, { t, allowRemove: true, placeholderPhone: t("users.create.fields.telefone") }),
          );
        }
        showFeedback(createFeedback, t("users.feedback.created"));
      } catch (error) {
        console.error("users-view: falha ao criar usuário.", error);
        showFeedback(createFeedback, error?.message ?? "Erro ao criar usuário");
      }
    },
    { signal: abortController.signal },
  );

  const handleUsersClick = async (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }
    const card = action.closest("[data-user-id]");
    const userId = card?.dataset.userId;
    if (!userId) {
      return;
    }
    if (action.dataset.action === "edit") {
      event.preventDefault();
      const editor = card.querySelector("[data-role=editor]");
      if (editor) {
        editor.hidden = false;
      }
    }
    if (action.dataset.action === "cancel-edit") {
      event.preventDefault();
      const editor = card.querySelector("[data-role=editor]");
      if (editor) {
        editor.hidden = true;
      }
    }
    if (action.dataset.action === "delete") {
      event.preventDefault();
      const confirmed = window.confirm(t("users.list.actions.delete"));
      if (!confirmed) {
        return;
      }
      try {
        await deleteUser(userId);
        renderDependentsSummary(card.querySelector("[data-role=dependent-summary]"), { dependentes: [] }, t);
      } catch (error) {
        console.error("users-view: falha ao remover usuário.", error);
      }
    }
    if (action.dataset.action === "add-dependent") {
      event.preventDefault();
      const container = action.closest("fieldset")?.querySelector("[data-role=dependente-rows]");
      if (container) {
        container.appendChild(
          createDependentRow({}, { t, allowRemove: true, placeholderPhone: t("users.create.fields.telefone") }),
        );
      }
    }
    if (action.dataset.action === "remove-dependent") {
      event.preventDefault();
      const row = action.closest("[data-dependent-row]");
      row?.remove();
    }
  };

  userList?.addEventListener("click", handleUsersClick, { signal: abortController.signal });

  userList?.addEventListener(
    "submit",
    async (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.matches("[data-role=edit-form]")) {
        return;
      }
      event.preventDefault();
      const card = form.closest("[data-user-id]");
      const userId = card?.dataset.userId;
      if (!userId) {
        return;
      }
      const feedback = form.querySelector("[data-role=edit-feedback]");
      const formData = new FormData(form);
      const nome = (formData.get("nome") || "").toString().trim();
      const email = (formData.get("email") || "").toString().trim();
      const telefone = (formData.get("telefone") || "").toString().trim();
      const role = (formData.get("role") || "viewer").toString();
      const status = (formData.get("status") || "pending").toString();
      const idiomaPreferido = (formData.get("idiomaPreferido") || LANG_OPTIONS[0]).toString();
      const temaPreferido = (formData.get("temaPreferido") || THEME_OPTIONS[0]).toString();
      const seguirSistema = formData.get("seguirSistema") !== null;
      const dependentes = readDependents(form.querySelector("[data-role=dependente-rows]"));
      try {
        await updateUser(userId, {
          nome,
          email,
          telefone,
          role,
          status,
          idiomaPreferido,
          temaPreferido: seguirSistema ? null : temaPreferido,
          seguirSistema,
          dependentes,
        });
        showFeedback(feedback, t("users.feedback.updated"));
        const editor = card.querySelector("[data-role=editor]");
        if (editor) {
          editor.hidden = true;
        }
      } catch (error) {
        console.error("users-view: falha ao atualizar usuário.", error);
        showFeedback(feedback, error?.message ?? "Erro ao atualizar usuário");
      }
    },
    { signal: abortController.signal },
  );

  listUsers().then((users) => {
    renderUsersList(userList, users, { t });
  });

  const unsubscribeUsers = subscribeToUsers((users) => {
    renderUsersList(userList, users, { t });
  });
  teardowns.push(unsubscribeUsers);

  renderOpportunities(opportunitiesList, opportunitiesEmpty, getTranslationOpportunities(), t);
  const unsubscribeOpportunities = subscribeToTranslationOpportunities((events) => {
    renderOpportunities(opportunitiesList, opportunitiesEmpty, events, t);
  });
  teardowns.push(unsubscribeOpportunities);

  root.__destroyUsersView = () => {
    teardowns.forEach((fn) => {
      try {
        fn?.();
      } catch (error) {
        console.error("users-view: falha ao executar teardown.", error);
      }
    });
    teardowns.length = 0;
    delete root.__destroyUsersView;
  };
}
