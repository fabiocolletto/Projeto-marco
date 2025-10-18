const MarcoBus = {
  emit(eventName, payload) {
    console.log(`[MarcoBus] ${eventName}`, payload ?? "");
  }
};

const Store = {
  state: new Map(),
  set(key, value) {
    this.state.set(key, value);
    console.log(`[Store] set ${key}`, value);
  },
  get(key) {
    return this.state.get(key);
  }
};

const railButtons = Array.from(document.querySelectorAll('.js-etiq'));
const panels = new Map(
  Array.from(document.querySelectorAll('.ac-panel')).map((panel) => [panel.id, panel])
);

function updateBreadcrumb(panel, label) {
  const breadcrumbItems = panel.querySelectorAll('.ac-breadcrumb li');
  if (breadcrumbItems.length > 1) {
    const currentItem = breadcrumbItems[breadcrumbItems.length - 1];
    currentItem.textContent = label;
    currentItem.setAttribute('aria-current', 'page');
  }
}

function setActivePanel(panelId, label) {
  panels.forEach((panel) => {
    panel.classList.toggle('ac-panel--active', panel.id === panelId);
  });

  railButtons.forEach((button) => {
    const isActive = button.dataset.target === panelId;
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
    button.classList.toggle('is-active', isActive);
  });

  const activePanel = panels.get(panelId);
  if (activePanel) {
    updateBreadcrumb(activePanel, label);
    activePanel.focus?.();
  }

  Store.set('ui.activePanel', panelId);
  MarcoBus.emit('panel:change', { panelId, label });
}

railButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.target;
    const label = button.textContent.trim();
    setActivePanel(target, label);
  });
});

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function updateKpi(service, isActive) {
  const tile = document.querySelector(`.ac-tile[data-kpi="${service}"]`);
  if (!tile) return;

  const stateEl = tile.querySelector(`.ac-kpi-state[data-state="${service}"]`);
  const dateEl = tile.querySelector(`.ac-kpi-date[data-date="${service}"]`);
  if (!stateEl || !dateEl) return;

  if (isActive) {
    tile.dataset.state = 'active';
    stateEl.textContent = 'Ativo';
    const now = new Date();
    const formatted = formatDate(now);
    dateEl.textContent = formatted;
    dateEl.dateTime = now.toISOString();
  } else {
    delete tile.dataset.state;
    stateEl.textContent = 'Desativado';
    dateEl.textContent = '—';
    dateEl.removeAttribute('dateTime');
  }
}

function handleToggle(button, serviceKey) {
  if (!button) return;
  button.addEventListener('click', () => {
    const current = button.getAttribute('aria-pressed') === 'true';
    const next = !current;
    button.setAttribute('aria-pressed', String(next));
    updateKpi(serviceKey, next);
    Store.set(`services.${serviceKey}`, { enabled: next, updatedAt: next ? new Date().toISOString() : null });
    MarcoBus.emit(`service:${serviceKey}:${next ? 'enabled' : 'disabled'}`);
  });
}

handleToggle(document.querySelector('.js-toggle-sync'), 'sync');
handleToggle(document.querySelector('.js-toggle-backup'), 'backup');

const table = document.querySelector('.ac-table');
const tableBody = table?.querySelector('tbody');
const headerButtons = table ? Array.from(table.querySelectorAll('.ac-th')) : [];

function getCellValue(cell, sortKey) {
  const rawValue = cell.textContent.trim();
  if (sortKey === 'data') {
    const timeEl = cell.querySelector('time');
    const source = timeEl?.dateTime ?? rawValue;
    return new Date(source);
  }
  return rawValue.toLocaleLowerCase();
}

function sortRows(sortKey, direction) {
  if (!tableBody) return;

  const rows = Array.from(tableBody.querySelectorAll('tr'));
  const sorted = rows.sort((rowA, rowB) => {
    const cellA = rowA.querySelector(`[data-type="${sortKey}"]`);
    const cellB = rowB.querySelector(`[data-type="${sortKey}"]`);
    if (!cellA || !cellB) return 0;

    let valueA = getCellValue(cellA, sortKey);
    let valueB = getCellValue(cellB, sortKey);

    if (valueA instanceof Date && valueB instanceof Date) {
      valueA = valueA.getTime();
      valueB = valueB.getTime();
    }

    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  sorted.forEach((row) => tableBody.appendChild(row));

  MarcoBus.emit('table:sorted', { sortKey, direction });
}

headerButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const currentOrder = button.dataset.order === 'asc' ? 'asc' : button.dataset.order === 'desc' ? 'desc' : null;
    const nextOrder = currentOrder === 'asc' ? 'desc' : 'asc';

    headerButtons.forEach((other) => {
      if (other !== button) {
        delete other.dataset.order;
      }
    });

    button.dataset.order = nextOrder;
    const sortKey = button.dataset.sort;
    sortRows(sortKey, nextOrder);
  });
});

function tableToCsv(tableElement) {
  const rows = Array.from(tableElement.querySelectorAll('tr'));
  return rows
    .map((row) =>
      Array.from(row.children)
        .map((cell) => `"${cell.textContent.trim().replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
}

const exportButton = document.querySelector('.js-export');
if (exportButton && table) {
  exportButton.addEventListener('click', () => {
    const csvContent = tableToCsv(table);
    const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eventos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    MarcoBus.emit('table:export', { rows: table.querySelectorAll('tbody tr').length });
  });
}

const overlay = document.getElementById('login-overlay');
const dialog = overlay?.querySelector('.ac-dialog');
const closeControls = overlay ? Array.from(overlay.querySelectorAll('.js-close')) : [];
const openLoginButton = document.querySelector('.js-open-login');
const resetAppButton = document.querySelector('.js-reset-app');
let lastFocus = null;

function openOverlay() {
  if (!overlay || !dialog) return;
  lastFocus = document.activeElement;
  overlay.hidden = false;
  requestAnimationFrame(() => {
    dialog.focus();
  });
  MarcoBus.emit('overlay:open');
  Store.set('ui.loginOverlay', { open: true });
}

function closeOverlay() {
  if (!overlay || !dialog) return;
  overlay.hidden = true;
  if (lastFocus && typeof lastFocus.focus === 'function') {
    lastFocus.focus();
  }
  MarcoBus.emit('overlay:close');
  Store.set('ui.loginOverlay', { open: false });
}

openLoginButton?.addEventListener('click', openOverlay);

closeControls.forEach((control) => {
  control.addEventListener('click', closeOverlay);
});

overlay?.addEventListener('click', (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.dataset.overlayDismiss === 'true') {
    closeOverlay();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !overlay?.hidden) {
    event.preventDefault();
    closeOverlay();
  }
});

if (dialog) {
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
    }
  });
}

async function clearIndexedDbDatabases() {
  if (!('indexedDB' in window)) return;

  const deleteDatabase = (name) =>
    new Promise((resolve) => {
      const request = window.indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });

  if (typeof window.indexedDB.databases === 'function') {
    try {
      const databases = await window.indexedDB.databases();
      const deletions = databases
        .map((database) => database?.name)
        .filter(Boolean)
        .map((name) => deleteDatabase(name));
      await Promise.all(deletions);
    } catch (error) {
      console.warn('[Reset] Não foi possível listar bancos IndexedDB', error);
    }
  }
}

async function clearCachesStorage() {
  if (!('caches' in window)) return;
  try {
    const keys = await window.caches.keys();
    await Promise.all(keys.map((key) => window.caches.delete(key)));
  } catch (error) {
    console.warn('[Reset] Não foi possível limpar Cache Storage', error);
  }
}

async function resetStoredData() {
  try {
    window.localStorage?.clear?.();
  } catch (error) {
    console.warn('[Reset] Não foi possível limpar o localStorage', error);
  }

  try {
    window.sessionStorage?.clear?.();
  } catch (error) {
    console.warn('[Reset] Não foi possível limpar o sessionStorage', error);
  }

  await Promise.all([clearIndexedDbDatabases(), clearCachesStorage()]);

  MarcoBus.emit('app:reset:data');
}

if (resetAppButton) {
  const originalLabel = resetAppButton.textContent.trim();

  resetAppButton.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Tem certeza de que deseja limpar todos os dados salvos e restaurar o aplicativo?'
    );
    if (!confirmed) return;

    resetAppButton.disabled = true;
    resetAppButton.textContent = 'Resetando…';

    await resetStoredData();

    resetAppButton.disabled = false;
    resetAppButton.textContent = originalLabel;

    alert('Os dados locais foram limpos. O aplicativo será recarregado.');
    MarcoBus.emit('app:reset:complete');
    window.location.reload();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const activeButton = railButtons.find((button) => button.getAttribute('aria-current') === 'page');
  if (activeButton) {
    setActivePanel(activeButton.dataset.target, activeButton.textContent.trim());
  }

  updateKpi('sync', false);
  updateKpi('backup', false);
});
