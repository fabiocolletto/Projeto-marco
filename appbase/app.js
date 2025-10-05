(function () {
  const byId = (id) => document.getElementById(id);

  const overlay = byId('login-overlay');
  const sheet = overlay.querySelector('.ac-sheet');
  const title = byId('login-sheet-title');
  const loginForm = document.getElementById('login-form');
  const breadcrumbsPrimary = byId('breadcrumbs-primary');
  const breadcrumbsSecondary = byId('breadcrumbs-secondary');
  let lastFocusedElement = null;

  function logStub(topic, payload = {}) {
    console.log(`[stub] ${topic}`, payload);
  }

  function formatNow() {
    return new Date().toLocaleString('pt-BR');
  }

  function updateBreadcrumbs(card) {
    const titleEl = card.querySelector('.ac-card__title');
    const subtitleEl = card.querySelector('.ac-card__subtitle');
    breadcrumbsPrimary.textContent = titleEl ? titleEl.textContent.trim() : '';
    breadcrumbsSecondary.textContent = subtitleEl
      ? subtitleEl.textContent.trim()
      : '';
  }

  function selectPanel(id, card) {
    const panels = document.querySelectorAll('.js-panel');
    panels.forEach((panel) => {
      if (panel.id === `panel-${id}`) {
        panel.hidden = false;
      } else {
        panel.hidden = true;
      }
    });
    document.querySelectorAll('.js-etiq').forEach((etiq) => {
      const isTarget = etiq.dataset.panel === id;
      etiq.classList.toggle('is-active', isTarget);
      if (isTarget) {
        etiq.setAttribute('aria-current', 'page');
      } else {
        etiq.removeAttribute('aria-current');
      }
    });
    updateBreadcrumbs(card);
    logStub('ui/panel/select', { id });
  }

  function setDotState(el, isOn) {
    if (!el) return;
    el.classList.toggle('ac-dot--ok', isOn);
    el.classList.toggle('ac-dot--crit', !isOn);
  }

  function setSwitchState(button, isOn, labels) {
    button.classList.toggle('is-on', isOn);
    button.classList.toggle('is-off', !isOn);
    button.setAttribute('aria-pressed', String(isOn));
    const label = button.querySelector('.ac-switch__label');
    if (label) {
      label.textContent = isOn ? labels.on : labels.off;
    }
  }

  function toggleSync(button, forceState) {
    const isOn =
      typeof forceState === 'boolean'
        ? forceState
        : !button.classList.contains('is-on');
    setSwitchState(button, isOn, {
      on: 'Sync ativada',
      off: 'Sync desativada',
    });
    const dot = byId('kpi-sync');
    setDotState(dot, isOn);
    const value = isOn ? formatNow() : '';
    byId('meta-sync').textContent = value;
    byId('v-sync').textContent = value;
    logStub('sync/toggle', { on: isOn });
  }

  function toggleBackup(button, forceState) {
    const isOn =
      typeof forceState === 'boolean'
        ? forceState
        : !button.classList.contains('is-on');
    setSwitchState(button, isOn, {
      on: 'Backup ativado',
      off: 'Backup desativado',
    });
    const dot = byId('kpi-backup');
    setDotState(dot, isOn);
    const value = isOn ? formatNow() : '';
    byId('meta-backup').textContent = value;
    byId('v-backup').textContent = value;
    logStub('backup/toggle', { on: isOn });
  }

  function sortTable(key, button) {
    const table = document.getElementById('events-table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const currentOrder = button.dataset.order === 'asc' ? 'asc' : 'desc';
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    const columnIndex = button.closest('th').cellIndex;

    table.querySelectorAll('.ac-th').forEach((th) => {
      th.dataset.order = '';
      const arrow = th.querySelector('.arrow');
      if (arrow) arrow.textContent = '↕';
    });

    button.dataset.order = newOrder;
    const arrow = button.querySelector('.arrow');
    if (arrow) {
      arrow.textContent = newOrder === 'asc' ? '↑' : '↓';
    }
    const compare = (a, b) => {
      const aText = a.cells[columnIndex].textContent.trim();
      const bText = b.cells[columnIndex].textContent.trim();
      if (key === 'time') {
        const toMinutes = (value) => {
          const [hours, minutes] = value.split(':').map(Number);
          return hours * 60 + minutes;
        };
        const diff = toMinutes(aText) - toMinutes(bText);
        return newOrder === 'asc' ? diff : -diff;
      }
      const result = aText.localeCompare(bText, 'pt-BR', {
        numeric: true,
        sensitivity: 'base',
      });
      return newOrder === 'asc' ? result : -result;
    };

    rows.sort(compare);
    rows.forEach((row) => tbody.appendChild(row));
  }

  function exportEvents() {
    const table = document.getElementById('events-table');
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const csvRows = [];
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
      th.textContent.trim()
    );
    csvRows.push(headers.join(';'));
    rows.forEach((row) => {
      if (row.hidden) return;
      const cols = Array.from(row.cells).map((cell) => {
        const text = cell.textContent.trim();
        if (text.includes(';') || text.includes('"')) {
          return '"' + text.replace(/"/g, '""') + '"';
        }
        return text;
      });
      csvRows.push(cols.join(';'));
    });
    const blob = new Blob([csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eventos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logStub('events/export', { rows: rows.length });
  }

  function openOverlay() {
    if (overlay.getAttribute('aria-hidden') === 'false') return;
    lastFocusedElement = document.activeElement;
    overlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', handleOverlayKeydown);
    overlay.addEventListener('click', handleOverlayBackdrop);
    requestAnimationFrame(() => {
      title.focus();
    });
    logStub('auth/login/open', { from: 'tile-login' });
  }

  function closeOverlay() {
    if (overlay.getAttribute('aria-hidden') === 'true') return;
    overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', handleOverlayKeydown);
    overlay.removeEventListener('click', handleOverlayBackdrop);
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function handleOverlayKeydown(event) {
    if (event.key === 'Escape') {
      closeOverlay();
    }
  }

  function handleOverlayBackdrop(event) {
    if (!sheet.contains(event.target)) {
      closeOverlay();
    }
  }

  function bindOverlayActions() {
    const openButton = document.querySelector('.js-login-open');
    if (openButton) {
      openButton.addEventListener('click', openOverlay);
    }

    overlay.querySelectorAll('.js-close').forEach((btn) => {
      btn.addEventListener('click', closeOverlay);
    });

    overlay
      .querySelectorAll('.js-disconnect')
      .forEach((btn) =>
        btn.addEventListener('click', () => {
          const deviceId = btn.dataset.device;
          logStub('devices/disconnect', { deviceId });
        })
      );

    const saveButton = overlay.querySelector('.js-save');
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        const data = new FormData(loginForm);
        const payload = {
          name: data.get('name') || '',
          email: data.get('email') || '',
          phone: data.get('phone') || '',
        };
        logStub('auth/login/save', payload);
      });
    }

    const changePassword = overlay.querySelector('.js-chgpass');
    if (changePassword) {
      changePassword.addEventListener('click', () => {
        logStub('auth/login/save', { action: 'change-password' });
      });
    }

    const logoffButton = overlay.querySelector('.js-logoff');
    if (logoffButton) {
      logoffButton.addEventListener('click', () => {
        logStub('auth/session/logout', {});
      });
    }

    const killAllButton = overlay.querySelector('.js-killall');
    if (killAllButton) {
      killAllButton.addEventListener('click', () => {
        logStub('devices/disconnect', { deviceId: 'all' });
      });
    }
  }

  function bindPanelSwitcher() {
    document.querySelectorAll('.js-etiq').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.panel;
        selectPanel(id, card);
      });
    });
  }

  function bindToggles() {
    const syncButton = document.querySelector('.js-toggle-sync');
    const backupButton = document.querySelector('.js-toggle-backup');
    if (syncButton) {
      syncButton.addEventListener('click', () => toggleSync(syncButton));
      toggleSync(syncButton, false);
    }
    if (backupButton) {
      backupButton.addEventListener('click', () => toggleBackup(backupButton));
      toggleBackup(backupButton, false);
    }
  }

  function bindTableControls() {
    document.querySelectorAll('.ac-th[data-key]').forEach((button) => {
      button.addEventListener('click', () => {
        sortTable(button.dataset.key, button);
      });
    });
    const exportBtn = document.querySelector('.js-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportEvents);
    }
  }

  function init() {
    bindPanelSwitcher();
    bindToggles();
    bindTableControls();
    bindOverlayActions();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
