const root = document.getElementById('app');

if (root) {
  root.innerHTML = `<main class="miniapp miniapp--{{SLUG}}">
    <h1>{{TITLE}}</h1>
    <p data-i18n="description"></p>
  </main>`;
}
