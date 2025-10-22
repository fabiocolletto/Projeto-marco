let versionInfo = null;
let overlayRef = null;
let triggerRef = null;
let closeButtonRef = null;

function parseLatestEntry(markdown){
  const rows = markdown
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^\|\s*\d+/.test(line));
  if (!rows.length) return null;
  const [version, date, description, status] = rows[0]
    .split('|')
    .map(cell => cell.trim())
    .filter(Boolean);
  return {
    version,
    date,
    description,
    status: status || ''
  };
}

async function fetchLatestLogEntry(){
  try {
    const response = await fetch('../docs/registro-log.md');
    if (!response.ok) {
      return null;
    }
    const text = await response.text();
    return parseLatestEntry(text);
  } catch (error) {
    console.error('Erro ao carregar registro de versão:', error);
    return null;
  }
}

function updateModalContent(info){
  versionInfo = info;
  const versionField = document.getElementById('status-modal-version');
  const dateField = document.getElementById('status-modal-date');
  const descriptionField = document.getElementById('status-modal-description');
  const statusField = document.getElementById('status-modal-status');

  if (versionField) versionField.textContent = info?.version ?? '—';
  if (dateField) dateField.textContent = info?.date ?? '—';
  if (descriptionField) descriptionField.textContent = info?.description ?? '—';
  if (statusField) {
    statusField.dataset.statusKey = info?.status ?? '';
    statusField.textContent = info?.status ?? '—';
  }
  if (triggerRef) {
    triggerRef.dataset.version = info?.version ?? '';
    const versionLabel = info?.version ? `Versão ${info.version}` : 'Versão —';
    triggerRef.textContent = versionLabel;
  }
}

function openModal(){
  if (!overlayRef) return;
  overlayRef.hidden = false;
  document.body.setAttribute('data-modal-open', 'true');
}

function closeModal(){
  if (!overlayRef) return;
  overlayRef.hidden = true;
  document.body.removeAttribute('data-modal-open');
  if (triggerRef) {
    try {
      triggerRef.focus({ preventScroll: true });
    } catch (error) {
      triggerRef.focus();
    }
  }
}

function handleKeydown(event){
  if (event.key === 'Escape' && overlayRef && !overlayRef.hidden) {
    closeModal();
  }
}

export async function initVersionStatus(){
  triggerRef = document.getElementById('version-trigger');
  overlayRef = document.getElementById('version-overlay');
  closeButtonRef = document.getElementById('version-modal-close');

  if (!triggerRef || !overlayRef || !closeButtonRef) {
    return;
  }

  const info = await fetchLatestLogEntry();
  if (info) {
    updateModalContent(info);
  } else {
    updateModalContent({
      version: '—',
      date: '—',
      description: 'Não foi possível carregar o registro.',
      status: ''
    });
  }

  triggerRef.addEventListener('click', openModal);
  closeButtonRef.addEventListener('click', closeModal);
  overlayRef.addEventListener('click', (event) => {
    if (event.target === overlayRef) {
      closeModal();
    }
  });
  document.addEventListener('keydown', handleKeydown);
}

export function refreshVersionTranslations(i18n){
  if (!triggerRef) return;
  const prefix = i18n ? i18n.t('app.footer.prefix') : 'Versão';
  const label = `${prefix === 'app.footer.prefix' ? 'Versão' : prefix} ${versionInfo?.version ?? '—'}`.trim();
  triggerRef.textContent = label;

  if (closeButtonRef && i18n) {
    const closeLabel = i18n.t('app.statusModal.close');
    const resolved = closeLabel === 'app.statusModal.close' ? 'Fechar' : closeLabel;
    closeButtonRef.setAttribute('aria-label', resolved);
    closeButtonRef.title = resolved;
  }

  const statusField = document.getElementById('status-modal-status');
  if (statusField && i18n) {
    const key = statusField.dataset.statusKey;
    if (key) {
      const statusValue = i18n.t(`app.statusModal.states.${key}`);
      statusField.textContent = statusValue === `app.statusModal.states.${key}` ? key : statusValue;
    } else {
      statusField.textContent = '—';
    }
  }
}
