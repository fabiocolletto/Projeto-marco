const tpl = document.createElement("template");
tpl.innerHTML = `
  <style>
    @import "/packages/ui/tokens.css";
    @import "/packages/ui/components.css";
  </style>
  <article class="card">
    <header class="card-hd">
      <h3>MiniApp: <span id="title"></span></h3>
      <div class="card-actions">
        <a class="btn ghost" href="#/miniapps/example/settings">Settings</a>
      </div>
    </header>
    <div class="card-bd">
      <p>Estrutura base pronta. Edite <code>views/</code> e <code>styles/</code>.</p>
    </div>
    <footer class="card-ft">Versão 1.0.0</footer>
  </article>
`;
customElements.define("miniapp-root", class extends HTMLElement {
  constructor(){
    super(); this.attachShadow({mode:"open"}).appendChild(tpl.content.cloneNode(true));
    this.shadowRoot.getElementById("title").textContent = location.hash.split("/")[2] || "example";
  }
});
