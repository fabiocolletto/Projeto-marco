// tools/gestao-de-convidados/app_header.mjs
// Ponto de entrada do Assistente Cerimonial — V5 (modular, pronto para uso)
// - Shell + navegação
// - Import dinâmico das views
// - CSS mínimo namespaced (.ac-app) — tipografia herda do site
import * as store from '../../shared/projectStore.js';
import { qs, on, mount, spinner, showToast, cssBase } from './ui/dom.mjs';

const routes = {
  convites: () => import('./views/convites.mjs'),
  evento: () => import('./views/evento.mjs'),
  agenda: () => import('./views/mensagens_agenda.mjs'),
  relatorio: () => import('./views/relatorio_pdf.mjs'),
};

let current = { destroy: null };
let currentTab = 'convites';

async function render(root) {
  injectBaseStyles();
  mountShell(root);
  await store.init?.();
  const initial = getTabFromHash() || currentTab;
  await navigate(initial);
  bindHeaderNav();
}

function injectBaseStyles(){
  if (document.getElementById('ac-base-styles')) return;
  const style = document.createElement('style');
  style.id = 'ac-base-styles';
  style.textContent = cssBase();
  document.head.appendChild(style);
}

function mountShell(root) {
  const html = `
    <div class="ac-shell">
      <header class="ac-header">
        <h2>Assistente Cerimonial — V5</h2>
        <nav class="ac-tabs">
          <a href="#convites" data-tab="convites" class="active">Convites</a>
          <a href="#evento" data-tab="evento">Evento</a>
          <a href="#agenda" data-tab="agenda">Mensagens & Agenda</a>
          <a href="#relatorio" data-tab="relatorio">Relatório</a>
        </nav>
        <div class="ac-status" id="ac-status">Pronto</div>
      </header>
      <main id="ac-main" aria-live="polite">${spinner()}</main>
    </div>
  `;
  root.innerHTML = html;
}

function getTabFromHash() {
  if (location.hash) return location.hash.replace('#','');
  return null;
}

function bindHeaderNav() {
  on(document, 'click', 'a[data-tab]', async (e) => {
    e.preventDefault();
    const tab = e.target.getAttribute('data-tab');
    history.replaceState(null, '', '#' + tab);
    await navigate(tab);
  });
  window.addEventListener('hashchange', async () => {
    const tab = getTabFromHash();
    if (tab) await navigate(tab);
  });
}

async function navigate(tab) {
  const main = qs('#ac-main');
  currentTab = tab;
  main.innerHTML = spinner();
  try {
    if (typeof current.destroy === 'function') current.destroy();
    const mod = await routes[tab]();
    current = { destroy: mod.destroy || null };
    const pid = await ensureProjectId();
    await mod.render(main, {
      store,
      navigate,
      projectId: pid,
    });
    setActiveTab(tab);
  } catch (err) {
    console.error('[AC] navigate error', err);
    showToast('Erro ao carregar a tela. Veja o console.', 'error');
    main.innerHTML = '<p>Falha ao carregar a tela.</p>';
  }
}

function setActiveTab(tab) {
  document.querySelectorAll('.ac-tabs a').forEach(a => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
}

async function ensureProjectId() {
  // Usa o primeiro projeto existente; caso não exista, cria um inicial em branco.
  const list = await store.listProjects();
  if (list && list.length) {
    return list[0].id;
  }
  const { meta } = await store.createProject({
    evento: {
      titulo: 'Meu Evento',
      local: '',
      data: '',
      hora: '',
      endereco: { logradouro: '' },
      anfitriao: { nome: '' },
    },
  });
  showToast('Projeto inicial criado. Preencha os dados do evento.', 'info');
  return meta.id;
}

export { render };
