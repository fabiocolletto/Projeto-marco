export function renderUsers(root, { t }) {
  root.innerHTML = `
    <section class="users-view">
      <p class="helper">${t("users.helper")}</p>
      <article class="card outline">
        <div class="card-bd">
          <p>${t("users.placeholder")}</p>
        </div>
      </article>
    </section>
  `;
}
