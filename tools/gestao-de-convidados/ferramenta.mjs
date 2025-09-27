import { mount as mountHeader } from "./app_header.mjs";
import { mount as mountEventEditor } from "./event_editor.mjs";

const css = `
.ac-tool{color:#111;background:#f5f5f5;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Ubuntu,Cantarell,Arial,sans-serif;min-height:100vh;margin:0}
.ac-tool *{box-sizing:border-box}
.ac-tool .tool-shell{min-height:100vh;display:flex;flex-direction:column;gap:24px}
.ac-tool .tool-header{background:#fff;box-shadow:0 1px 0 rgba(0,0,0,0.08)}
.ac-tool .tool-main{flex:1;display:flex;flex-direction:column;gap:24px;padding:0 16px 80px}
.ac-tool .tool-main__inner{width:min(1200px,100%);margin:0 auto;display:flex;flex-direction:column;gap:20px}
.ac-tool .tool-tabs{display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:0;list-style:none}
.ac-tool .tool-tab{appearance:none;border:1px solid #111;border-radius:999px;background:#fff;color:#111;font-weight:700;font-size:14px;padding:10px 18px;cursor:pointer;transition:background .2s ease,color .2s ease}
.ac-tool .tool-tab[disabled],
.ac-tool .tool-tab[aria-disabled="true"]{cursor:not-allowed;opacity:.45}
.ac-tool .tool-tab.is-active{background:#111;color:#fff}
.ac-tool .tool-panel{background:#fff;border-radius:12px;box-shadow:0 20px 40px rgba(17,17,17,0.08);padding:12px;display:none}
.ac-tool .tool-panel.is-active{display:block}
.ac-tool .tool-panel__inner{padding:12px 4px 32px}
.ac-tool .tool-placeholder{padding:32px;text-align:center;color:#555}
.ac-tool .tool-placeholder h2{margin-top:0;font-size:22px}
.ac-tool .tool-placeholder p{margin:8px auto;max-width:480px;line-height:1.6}
@media (max-width:720px){
  .ac-tool .tool-panel{padding:8px;border-radius:10px}
  .ac-tool .tool-panel__inner{padding:4px 0 24px}
  .ac-tool .tool-tab{font-size:13px;padding:8px 14px}
}
`;

const template = `
  <div class="tool-shell">
    <header class="tool-header" id="tool-header">
      <div id="header-root"></div>
    </header>
    <main class="tool-main">
      <div class="tool-main__inner">
        <nav class="tool-tabs" role="tablist" aria-label="Ferramentas da gestão de convidados">
          <button type="button" class="tool-tab is-active" role="tab" aria-selected="true" data-tab="dados">
            Dados do evento
          </button>
          <button
            type="button"
            class="tool-tab"
            role="tab"
            aria-selected="false"
            data-tab="convidados"
            data-module="./convidados_editor.mjs"
            aria-disabled="true"
            disabled
          >
            Convidados
          </button>
          <button type="button" class="tool-tab" role="tab" aria-selected="false" data-tab="mensagens" aria-disabled="true" disabled>
            Mensagens
          </button>
          <button type="button" class="tool-tab" role="tab" aria-selected="false" data-tab="relatorios" aria-disabled="true" disabled>
            Relatórios
          </button>
        </nav>

        <section class="tool-panel is-active" role="tabpanel" data-panel="dados">
          <div class="tool-panel__inner">
            <div id="dados-root" data-module-root="dados"></div>
          </div>
        </section>

        <section class="tool-panel" role="tabpanel" data-panel="convidados" hidden>
          <div class="tool-panel__inner">
            <div class="tool-placeholder" data-module-root="convidados">
              <h2>Editor de convidados</h2>
              <p>
                Assim que disponibilizarmos o módulo de convidados, ele será carregado automaticamente nesta aba.
              </p>
            </div>
          </div>
        </section>

        <section class="tool-panel" role="tabpanel" data-panel="mensagens" hidden>
          <div class="tool-panel__inner">
            <div class="tool-placeholder" data-module-root="mensagens">
              <h2>Mensagens programadas</h2>
              <p>
                Esta aba exibirá a agenda de envios e permitirá configurar os lembretes para seus convidados.
              </p>
            </div>
          </div>
        </section>

        <section class="tool-panel" role="tabpanel" data-panel="relatorios" hidden>
          <div class="tool-panel__inner">
            <div class="tool-placeholder" data-module-root="relatorios">
              <h2>Relatórios do evento</h2>
              <p>
                Aqui ficará o resumo imprimível do evento, incluindo a lista de convidados para compartilhar com a equipe.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
`;

function activateTabFactory(tabs, panels){
  return function activateTab(name){
    tabs.forEach((btn)=>{
      const isActive = btn.dataset.tab === name;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    panels.forEach((panel, key)=>{
      const isActive = key === name;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });
  };
}

async function loadModule(tabName, modulePath, trigger, moduleRoots, panels){
  if(!modulePath) return;
  if(trigger?.dataset.loaded === "true") return;
  const targetRoot = moduleRoots.get(tabName);
  if(!targetRoot) return;
  try{
    const mod = await import(modulePath);
    if(typeof mod.mount === "function"){
      await mod.mount(targetRoot);
      if(trigger) trigger.dataset.loaded = "true";
    }
  }catch(error){
    console.error(`Não foi possível carregar o módulo da aba ${tabName}:`, error);
    const panel = panels.get(tabName);
    if(panel){
      const placeholder = panel.querySelector(".tool-placeholder");
      if(placeholder){
        placeholder.innerHTML = '<p style="color:#b91c1c">Não foi possível carregar esta ferramenta no momento.</p>';
      }
    }
  }
}

export async function render(rootEl){
  const host = document.createElement("div");
  host.className = "ac-tool";

  const style = document.createElement("style");
  style.textContent = css;
  host.appendChild(style);

  const container = document.createElement("div");
  container.innerHTML = template;
  host.appendChild(container.firstElementChild);

  rootEl.replaceChildren(host);

  const headerRoot = host.querySelector("#header-root");
  if(headerRoot){
    try{
      await mountHeader(headerRoot);
    }catch(err){
      console.error("Falha ao iniciar o cabeçalho:", err);
    }
  }

  const dadosRoot = host.querySelector('[data-module-root="dados"]');
  if(dadosRoot){
    try{
      await mountEventEditor(dadosRoot);
    }catch(err){
      console.error("Falha ao iniciar o editor de evento:", err);
    }
  }

  const tabs = Array.from(host.querySelectorAll(".tool-tab"));
  const panels = new Map(Array.from(host.querySelectorAll(".tool-panel"), (panel) => [panel.dataset.panel, panel]));
  const moduleRoots = new Map(Array.from(host.querySelectorAll("[data-module-root]"), (el) => [el.dataset.moduleRoot, el]));
  const activateTab = activateTabFactory(tabs, panels);
  const loaders = new Map();

  tabs.forEach((btn)=>{
    const tabName = btn.dataset.tab;
    const modulePath = btn.dataset.module;
    const isDisabled = btn.disabled || btn.getAttribute("aria-disabled") === "true";

    if(!isDisabled){
      btn.addEventListener("click", ()=>{
        activateTab(tabName);
        if(modulePath){
          loadModule(tabName, modulePath, btn, moduleRoots, panels);
        }
      });
    }

    if(modulePath){
      loaders.set(tabName, ()=>loadModule(tabName, modulePath, btn, moduleRoots, panels));
    }
  });

  activateTab("dados");

  if(typeof window !== "undefined"){
    window.acFerramentas = Object.freeze({
      activateTab,
      loadModule: (tab)=>{
        const loader = loaders.get(tab);
        return loader ? loader() : Promise.resolve();
      },
      moduleRoots,
    });
  }

  return { activateTab };
}

export function mount(selectorOrElement){
  const el = typeof selectorOrElement === "string" ? document.querySelector(selectorOrElement) : selectorOrElement;
  if(!el){
    throw new Error("Elemento não encontrado para montar ferramenta: " + selectorOrElement);
  }
  return render(el);
}
