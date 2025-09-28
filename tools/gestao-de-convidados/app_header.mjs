// tools/gestao-de-convidados/app_header.mjs
// Ponto de entrada do Assistente Cerimonial — V5 (modular, pronto para uso)
// - Shell + navegação
// - Import dinâmico das views
// - CSS mínimo namespaced (.ac-app) — tipografia herda do site
import * as store from '/shared/projectStore.js';
import { qs, on, spinner, showToast, cssBase } from './ui/dom.mjs';

const routes = {
  inicio: () => import('./views/inicio.mjs'),
  evento: () => import('./views/evento.mjs'),
  convites: () => import('./views/convites.mjs'),
  agenda: () => import('./views/mensagens_agenda.mjs'),
  relatorio: () => import('./views/relatorio_pdf.mjs'),
};

let current = { destroy: null };
let currentTab = 'convites';
let currentProjectId = null;
let statusTimeout = null;

async function render(root) {
  injectBaseStyles();
  mountShell(root);
  await store.init?.();
  await ensureAnyProject();
  await refreshProjectSelector();
  const initial = getTabFromHash() || currentTab;
  await navigate(initial, { skipSpinner: true });
  bindHeaderNav();
  bindProjectSelector();
  bindMenu();
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
        <div class="ac-header__top">
          <div class="ac-brand">
            <h2>Assistente Cerimonial — V5</h2>
            <div class="ac-menu" data-open="false">
              <button id="ac-menu-btn" aria-haspopup="true" aria-expanded="false">Menu Arquivo ▾</button>
              <div class="ac-menu__panel" id="ac-menu-panel" hidden>
                <button data-menu="novo">Novo projeto</button>
                <button data-menu="duplicar">Duplicar projeto…</button>
                <button data-menu="renomear">Renomear…</button>
                <hr />
                <button data-menu="exportar">Exportar JSON</button>
                <button data-menu="importar">Importar JSON…</button>
                <hr />
                <button data-menu="excluir" class="ac-danger">Excluir projeto…</button>
              </div>
            </div>
          </div>
          <label class="ac-project-picker">
            <span>Projeto</span>
            <select id="ac-project-select"></select>
          </label>
          <div class="ac-status" id="ac-status">Pronto</div>
        </div>
        <nav class="ac-tabs">
          <a href="#inicio" data-tab="inicio">Início</a>
          <a href="#evento" data-tab="evento">Evento</a>
          <a href="#convites" data-tab="convites" class="active">Convites</a>
          <a href="#agenda" data-tab="agenda">Mensagens & Agenda</a>
          <a href="#relatorio" data-tab="relatorio">Relatório</a>
        </nav>
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
    await navigate(tab);
  });
  window.addEventListener('hashchange', async () => {
    const tab = getTabFromHash();
    if (tab) await navigate(tab);
  });
}

async function navigate(tab, { skipSpinner = false } = {}) {
  const main = qs('#ac-main');
  currentTab = tab;
  if (location.hash.replace('#', '') !== tab) {
    history.replaceState(null, '', '#' + tab);
  }
  if (!skipSpinner) main.innerHTML = spinner();
  try {
    if (typeof current.destroy === 'function') current.destroy();
    const loader = routes[tab];
    if (!loader) throw new Error(`Rota desconhecida: ${tab}`);
    const mod = await loader();
    current = { destroy: mod.destroy || null };
    const pid = await ensureProjectId();
    const ctx = buildContext(pid);
    await mod.render(main, ctx);
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
  if (currentProjectId) return currentProjectId;
  const list = store.listProjects();
  if (list && list.length) {
    currentProjectId = list[0].id;
    return currentProjectId;
  }
  const p = await store.createProject({ evento: { titulo: 'Meu evento' } });
  currentProjectId = p.id;
  await refreshProjectSelector();
  return currentProjectId;
}

export { render };

function buildContext(projectId) {
  const statusEl = qs('#ac-status');
  const setStatus = (label, tone = 'idle') => {
    if (!statusEl) return;
    statusEl.textContent = label;
    statusEl.dataset.tone = tone;
    if (statusTimeout) clearTimeout(statusTimeout);
    if (tone === 'saved') {
      statusTimeout = setTimeout(() => {
        statusEl.textContent = 'Pronto';
        statusEl.dataset.tone = 'idle';
      }, 2200);
    }
  };
  const markDirty = () => setStatus('Alterações não salvas', 'dirty');
  const storeProxy = new Proxy(store, {
    get(target, prop) {
      if (prop === 'updateProject') {
        return async (...args) => {
          setStatus('Salvando…', 'saving');
          try {
            const result = await target.updateProject(...args);
            await refreshProjectSelector();
            setStatus('Salvo!', 'saved');
            return result;
          } catch (error) {
            console.error('[AC] Falha ao salvar', error);
            setStatus('Erro ao salvar', 'error');
            throw error;
          }
        };
      }
      return target[prop];
    },
  });
  return {
    store: storeProxy,
    navigate,
    projectId,
    setStatus,
    markDirty,
    refreshProject: async () => {
      await navigate(currentTab, { skipSpinner: true });
    },
  };
}

async function ensureAnyProject() {
  const list = store.listProjects();
  if (!list.length) {
    const project = await store.createProject({ evento: { titulo: 'Meu evento' } });
    currentProjectId = project.id;
  } else {
    currentProjectId = list[0].id;
  }
}

async function refreshProjectSelector() {
  const select = qs('#ac-project-select');
  if (!select) return;
  const projects = store.listProjects();
  const options = projects.map(
    (p) => `<option value="${p.id}" ${p.id === currentProjectId ? 'selected' : ''}>${p.titulo}</option>`,
  );
  select.innerHTML = options.join('');
  if (!projects.length) {
    select.innerHTML = '<option>Sem projetos</option>';
    select.disabled = true;
  } else {
    select.disabled = false;
  }
}

function bindProjectSelector() {
  const select = qs('#ac-project-select');
  if (!select) return;
  select.addEventListener('change', async (event) => {
    currentProjectId = event.target.value;
    await navigate(currentTab);
  });
}

function bindMenu() {
  const btn = qs('#ac-menu-btn');
  const panel = qs('#ac-menu-panel');
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (event) => {
    if (event.target === btn || btn.contains(event.target)) return;
    if (panel.contains(event.target)) return;
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  });
  panel.addEventListener('click', async (event) => {
    const action = event.target.dataset.menu;
    if (!action) return;
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    try {
      if (action === 'novo') {
        const project = await store.createProject({ evento: { titulo: 'Novo evento' } });
        currentProjectId = project.id;
        await refreshProjectSelector();
        await navigate('convites');
      }
      if (action === 'duplicar') {
        if (!currentProjectId) return;
        const original = await store.getProject(currentProjectId);
        if (!original) return;
        const copy = await store.duplicateProject(currentProjectId, {
          evento: { ...original.evento, titulo: `${original.evento.titulo || 'Evento'} (cópia)` },
        });
        currentProjectId = copy.id;
        await refreshProjectSelector();
        await navigate(currentTab);
      }
      if (action === 'renomear') {
        if (!currentProjectId) return;
        const currentProject = await store.getProject(currentProjectId);
        const next = prompt('Novo título do evento:', currentProject?.evento?.titulo || '');
        if (next && next.trim()) {
          await store.renameProject(currentProjectId, next.trim());
          await refreshProjectSelector();
          await navigate(currentTab, { skipSpinner: true });
        }
      }
      if (action === 'exportar') {
        if (!currentProjectId) return;
        const json = await store.exportProject(currentProjectId);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const project = await store.getProject(currentProjectId);
        const nome = (project?.evento?.titulo || 'projeto').replace(/[^\w\d-_]+/g, '_');
        a.download = `${nome}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      if (action === 'importar') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          const text = await file.text();
          try {
            const imported = await store.importProject(text);
            currentProjectId = imported.id;
            await refreshProjectSelector();
            await navigate('convites');
          } catch (error) {
            console.error(error);
            alert('Falha ao importar JSON. Verifique o arquivo.');
          }
        };
        input.click();
      }
      if (action === 'excluir') {
        if (!currentProjectId) return;
        const confirmDelete = confirm('Tem certeza que deseja excluir este projeto?');
        if (!confirmDelete) return;
        await store.deleteProject(currentProjectId);
        const remaining = store.listProjects();
        currentProjectId = remaining.length ? remaining[0].id : null;
        await refreshProjectSelector();
        await navigate(currentTab);
      }
    } catch (error) {
      console.error('[AC] ação de menu falhou', error);
      alert('Não foi possível concluir a ação. Verifique o console.');
    }
  });
}
