import { AppBase } from './app-base.js';
import {
  exportRegistry,
  exportSection,
  tryPrintFallback,
  COMMON_EXPORT_EXCLUDE_KEYS,
} from './exporter.js';
import { registerExportAudit } from './state.js';

const THEME_STORAGE_KEY = 'marco-ui-theme';

const views = Array.from(document.querySelectorAll('.view'));
const appRoot = document.documentElement;
const panelCard = document.getElementById('miniapp-panel-card');
const panelContent = panelCard?.querySelector('[data-panel-content]') ?? null;
const panelPlaceholder = panelCard?.querySelector('[data-panel-placeholder]') ?? null;
const panelChip = panelCard?.querySelector('[data-panel-chip]') ?? null;
const panelMeta = panelCard?.querySelector('[data-panel-meta]') ?? null;
const panelClose = panelCard?.querySelector('[data-panel-close]') ?? null;
const panelMenu = panelCard?.querySelector('[data-panel-menu]') ?? null;
const exportFeedbackElement = document.querySelector('[data-export-feedback]');
const exportFeedbackMessage = exportFeedbackElement?.querySelector('[data-export-message]') ?? null;
const exportFeedbackIcon = exportFeedbackElement?.querySelector('[data-export-icon]') ?? null;

let activePanelKey = null;
let activePanelTrigger = null;
let activePanelDestroy = null;
let hideFeedbackTimeout = null;
let currentLocale = 'pt-BR';
const localeCache = new Map();
let translations = {};
const relativeTimeFormatters = new Map();

let storedConfig = null;
let storedSession = null;
let storedDashboard = null;
let storedBackup = null;
let storedObservability = null;
let storedCatalog = null;

export async function setLocale(locale) {
  const data = await loadLocale(locale);
  currentLocale = locale;
  translations = data;
  document.documentElement.lang = locale;
  applyTranslations();
  rerenderDynamicContent();
}

export function getCurrentLocale() {
  return currentLocale;
}

export function translate(key, replacements = {}) {
  const template = translations[key];
  if (typeof template !== 'string') {
    return key;
  }
  return template.replace(/{{(.*?)}}/g, (_, token) => {
    const value = replacements[token.trim()];
    return value === undefined ? '' : String(value);
  });
}

function translateWithFallback(key, fallback = '', replacements = {}) {
  if (!key) {
    return fallback;
  }
  const value = translate(key, replacements);
  return value === key ? fallback : value;
}

function resolveTranslation(key, replacements = {}) {
  return translateWithFallback(key, '', replacements);
}

function getRelativeTimeFormatter(locale) {
  if (!relativeTimeFormatters.has(locale)) {
    try {
      relativeTimeFormatters.set(locale, new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }));
    } catch (error) {
      relativeTimeFormatters.set(locale, new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }));
    }
  }
  return relativeTimeFormatters.get(locale);
}

function formatRelativeTime(relative) {
  if (!relative || typeof relative.value !== 'number' || !relative.unit) {
    return '';
  }
  const formatter = getRelativeTimeFormatter(currentLocale);
  const value = Number.isFinite(relative.value) ? Math.abs(relative.value) : 0;
  return formatter.format(-value, relative.unit);
}

async function loadLocale(locale) {
  if (localeCache.has(locale)) {
    return localeCache.get(locale);
  }
  const response = await fetch(`./locales/${locale}.json`);
  if (!response.ok) {
    throw new Error(`Não foi possível carregar o arquivo de idioma ${locale}`);
  }
  const data = await response.json();
  localeCache.set(locale, data);
  return data;
}

export async function initLocalization(defaultLocale = 'pt-BR') {
  const selector = document.querySelector('[data-action="change-locale"]');
  if (selector) {
    selector.addEventListener('change', async (event) => {
      const locale = event.target.value;
      try {
        await setLocale(locale);
      } catch (error) {
        console.error('Erro ao alterar idioma', error);
      }
    });
  }
  try {
    await setLocale(defaultLocale);
    if (selector) {
      selector.value = defaultLocale;
    }
  } catch (error) {
    console.error('Erro ao carregar idioma padrão', error);
  }
}

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) {
      return;
    }
    const text = translate(key);
    if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
      element.value = text;
    } else {
      element.textContent = text;
    }
  });
}

export function activateView(id) {
  views.forEach((view) => {
    view.classList.toggle('active', view.id === id);
  });
  if (window.scrollY > 0) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  appRoot.setAttribute('data-view', id);
}

export function initThemeControls() {
  const root = document.documentElement;
  let storedTheme = null;
  try {
    storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    storedTheme = null;
  }
  if (storedTheme !== 'light' && storedTheme !== 'dark') {
    storedTheme = null;
  }
  if (storedTheme) {
    root.dataset.theme = storedTheme;
  }

  const toggle = document.querySelector('[data-action="toggle-theme"]');
  if (!toggle) {
    return;
  }

  const icon = toggle.querySelector('.theme-toggle__icon');
  const label = toggle.querySelector('[data-theme-label]');

  function syncTheme(theme) {
    if (label) {
      label.textContent = theme === 'dark' ? translate('controls.theme.dark') : translate('controls.theme.light');
    }
    if (icon) {
      icon.textContent = theme === 'dark' ? '🌙' : '🌞';
    }
    toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    toggle.setAttribute('aria-label', theme === 'dark' ? translate('controls.theme.switchToLight') : translate('controls.theme.switchToDark'));
  }

  syncTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');

  toggle.addEventListener('click', () => {
    const current = root.dataset.theme === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    syncTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (error) {
      /* ignore storage errors */
    }
  });
}

export function updateHeaderSession(config, session) {
  storedConfig = config;
  storedSession = session;
  const indicator = document.querySelector('[data-ref="status-indicator"]');
  if (indicator) {
    indicator.textContent = translateWithFallback('status.indicator', `Sessão ativa • ${session.network}`, {
      network: session.network,
    });
  }
  const tenantRef = document.querySelector('[data-ref="status-tenant"]');
  if (tenantRef) {
    tenantRef.textContent = translateWithFallback('status.tenantValue', `Tenant: ${config.tenantId}`, {
      tenant: config.tenantId,
    });
  }
  const userRef = document.querySelector('[data-ref="status-user"]');
  if (userRef) {
    userRef.textContent = translateWithFallback(
      'status.userValue',
      `Usuário: ${config.userId} • ${session.deviceName}`,
      {
        user: config.userId,
        device: session.deviceName,
      },
    );
  }
  const storageProviders = config.user?.providers?.storage ?? [];
  const storageRef = document.querySelector('[data-ref="status-storage"]');
  if (storageRef) {
    storageRef.textContent = storageProviders.length
      ? translateWithFallback(
          'status.storageLinked',
          `Armazenamento vinculado: ${storageProviders.map((provider) => provider.toUpperCase()).join(' • ')}`,
          {
            providers: storageProviders.map((provider) => provider.toUpperCase()).join(' • '),
          },
        )
      : translateWithFallback('status.storageDisabled', 'Armazenamento vinculado: não habilitado');
  }
  const syncRef = document.querySelector('[data-ref="status-sync"]');
  if (syncRef) {
    syncRef.textContent = session.lastSync
      ? translateWithFallback('status.syncValue', `Último sync: ${session.lastSync}`, {
          timestamp: session.lastSync,
        })
      : translateWithFallback('status.syncDisabled', 'Sync desativado');
  }
  const readyRef = document.querySelector('[data-ref="status-ready"]');
  if (readyRef) {
    readyRef.textContent = translateWithFallback('status.readyValue', `Tempo até READY: ${session.timeToReady}`, {
      time: session.timeToReady,
    });
  }
}

export function updateHomeSnapshot(snapshot) {
  storedDashboard = snapshot;
  const flow = document.querySelector('[data-ref="metric-task-flow"]');
  if (flow) {
    flow.textContent = `${snapshot.taskFlow}%`;
  }
  const capacity = document.querySelector('[data-ref="metric-capacity"]');
  if (capacity) {
    capacity.textContent = `${snapshot.capacity}%`;
  }
  const alerts = document.querySelector('[data-ref="metric-alerts"]');
  if (alerts) {
    alerts.textContent = snapshot.alerts;
  }
  const approvals = document.querySelector('[data-ref="highlight-approvals"]');
  if (approvals) {
    approvals.textContent = snapshot.approvals;
  }
  const teams = document.querySelector('[data-ref="highlight-field-teams"]');
  if (teams) {
    teams.textContent = snapshot.fieldTeams;
  }
  const priority = document.querySelector('[data-ref="highlight-priority"]');
  if (priority) {
    priority.textContent = snapshot.priorityTasks;
  }
}

export function updateAccountDetails(config, session, backup) {
  storedConfig = config;
  storedSession = session;
  storedBackup = backup;
  const tenantDetail = document.querySelector('[data-ref="detail-tenant"]');
  if (tenantDetail) {
    tenantDetail.textContent = config.tenantId;
  }
  const userDetail = document.querySelector('[data-ref="detail-user"]');
  if (userDetail) {
    userDetail.textContent = config.userId;
  }
  const loginDetail = document.querySelector('[data-ref="detail-logins"]');
  if (loginDetail) {
    const providers = config.user?.providers?.login ?? [];
    const loginText = providers.length
      ? providers.map((provider) => provider.toUpperCase()).join(' • ')
      : translateWithFallback('account.identity.loginEmpty', 'Sem provedores configurados');
    loginDetail.textContent = loginText;
  }
  const kioskDetail = document.querySelector('[data-ref="detail-kiosk"]');
  if (kioskDetail) {
    kioskDetail.textContent = translateWithFallback(session.kioskModeKey, session.kioskMode);
  }
  const backupDetail = document.querySelector('[data-ref="detail-backup"]');
  if (backupDetail) {
    const stateKey = backup.enabled ? 'account.backup.active' : 'account.backup.inactive';
    backupDetail.textContent = translateWithFallback(stateKey, backup.enabled ? 'Ativo' : 'Desativado');
  }
  const filesDetail = document.querySelector('[data-ref="detail-files"]');
  if (filesDetail) {
    const filesText = typeof backup.filesSynced === 'number'
      ? translateWithFallback('account.backup.filesCount', `${backup.filesSynced}`, { count: backup.filesSynced })
      : backup.filesSynced;
    filesDetail.textContent = filesText;
  }
  const exportDetail = document.querySelector('[data-ref="detail-export"]');
  if (exportDetail) {
    exportDetail.textContent = backup.lastExport;
  }

  const storageGrid = document.getElementById('storage-grid');
  if (storageGrid) {
    storageGrid.innerHTML = '';
    const storageProviders = config.user?.providers?.storage ?? [];
    storageProviders.forEach((providerKey) => {
      const data = backup.storageStatus[providerKey];
      const card = document.createElement('article');
      card.className = 'storage-card';
      const statusText = translateWithFallback(data?.statusKey, data?.status ?? '—');
      const relativeSync = data?.lastSync ? formatRelativeTime(data.lastSync) : '';
      const syncText = relativeSync || (data?.lastSync ?? '—');
      card.innerHTML = `
              <strong>${data?.name ?? providerKey.toUpperCase()}</strong>
              <span>${translateWithFallback('account.backup.statusLabel', `Status: ${statusText}`, {
                status: statusText || '—',
              })}</span>
              <span>${translateWithFallback('account.backup.lastSync', `Último sync: ${syncText}`, {
                timestamp: syncText || '—',
              })}</span>
            `;
      storageGrid.appendChild(card);
    });
  }

  const deviceList = document.getElementById('device-list');
  if (deviceList) {
    deviceList.innerHTML = '';
    session.devices.forEach((device) => {
      const card = document.createElement('article');
      card.className = 'device-card';
      const statusText = translateWithFallback(device.statusKey, device.status);
      const typeText =
        translateWithFallback(device.typeKey, device.type ?? '—') || (device.type ?? '—');
      const lastActivityText = device.lastActivity ? formatRelativeTime(device.lastActivity) : device.lastActivity ?? '—';
      card.innerHTML = `
              <header>
                <strong>${device.label}</strong>
                <span>${statusText}</span>
              </header>
              <ul>
                <li>${translateWithFallback('account.devices.type', `Tipo: ${typeText}`, { type: typeText })}</li>
                <li>${translateWithFallback('account.devices.lastActivity', `Última atividade: ${lastActivityText}`, {
                  activity: lastActivityText || '—',
                })}</li>
                <li>${translateWithFallback('account.devices.id', `ID: ${device.id}`, { id: device.id })}</li>
              </ul>
            `;
      deviceList.appendChild(card);
    });
  }

  const timeline = document.getElementById('audit-timeline');
  if (timeline) {
    timeline.innerHTML = '';
    session.auditTrail.forEach((entry) => {
      const item = document.createElement('li');
      const label = entry.labelKey
        ? translateWithFallback(entry.labelKey, entry.labelFallback ?? '')
        : entry.labelFallback ?? '';
      const description = translateWithFallback(
        entry.descriptionKey,
        entry.description ?? entry.descriptionFallback ?? '',
        { ...(entry.replacements ?? {}), label },
      );
      const text = description || entry.description || entry.descriptionFallback || entry.event;
      item.textContent = entry.timestamp ? `${entry.timestamp} • ${text}` : text;
      timeline.appendChild(item);
    });
  }

  const configJson = document.getElementById('config-json');
  if (configJson) {
    const resolved = AppBase.getResolvedConfig();
    configJson.textContent = JSON.stringify(resolved, null, 2);
  }
}

export function buildObservabilityTable(entries) {
  storedObservability = entries;
  const tbody = document.getElementById('observability-table');
  if (!tbody) {
    return;
  }
  tbody.innerHTML = '';
  entries.forEach((entry) => {
    const row = document.createElement('tr');
    const eventLabel = translateWithFallback(entry.eventKey, entry.event ?? '');
    const notesLabel = translateWithFallback(entry.notesKey, entry.notes ?? '');
    row.innerHTML = `
            <td><strong>${eventLabel || entry.event}</strong></td>
            <td>${entry.timestamp}</td>
            <td>${notesLabel || entry.notes}</td>
          `;
    tbody.appendChild(row);
  });
}

export function renderMiniAppGrid() {
  const container = document.getElementById('mini-app-grid');
  if (!container) {
    return;
  }
  container.innerHTML = '';
  const enabledKeys = AppBase.getEnabledMiniApps();
  enabledKeys.forEach((key) => {
    const module = AppBase.resolve(key);
    const meta = AppBase.getModuleMeta(key);
    if (!module || !meta) {
      return;
    }
    container.appendChild(createMiniAppCard(meta, key));
  });
  updateMiniAppSummary(enabledKeys.length);
  connectMiniAppTriggers();
}

function createMiniAppCard(meta, key) {
  const article = document.createElement('article');
  article.className = 'mini-app-card';
  article.dataset.miniapp = key;
  article.dataset.miniappView = key;
  article.tabIndex = 0;
  article.setAttribute('role', 'button');
  const cardLabel = translateWithFallback(meta.card?.labelKey, meta.card?.label ?? meta.key);
  article.setAttribute('aria-label', translateWithFallback('miniapps.card.open', `Abrir visão completa de ${cardLabel}`, {
    label: cardLabel,
  }));

  const header = document.createElement('div');
  header.className = 'mini-app-card-header';

  const chip = document.createElement('div');
  chip.className = 'mini-app-chip';

  const title = document.createElement('span');
  title.className = 'mini-app-title';
  title.textContent = cardLabel;
  chip.appendChild(title);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'icon-button';
  trigger.dataset.panelTrigger = key;
  trigger.setAttribute(
    'aria-label',
    translateWithFallback('miniapps.card.openPanel', `Abrir MiniAppPanel de ${cardLabel}`, {
      label: cardLabel,
    }),
  );
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = `
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2.5 8a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm4 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm4 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
            </svg>
            <span class="sr-only">${translateWithFallback('miniapps.card.more', 'Abrir painel de mini-app')}</span>
          `;

  chip.appendChild(trigger);
  header.appendChild(chip);
  article.appendChild(header);

  const cardMeta = translateWithFallback(meta.card?.metaKey, meta.card?.meta ?? '');
  if (cardMeta) {
    const meta = document.createElement('p');
    meta.className = 'mini-app-meta';
    meta.textContent = cardMeta;
    article.appendChild(meta);
  }

  article.addEventListener('click', (event) => {
    if (event.target.closest('button')) {
      return;
    }
    activateView(meta.id);
  });

  article.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateView(meta.id);
    }
  });

  return article;
}

export function buildMarketplace(catalog = [], appBase = AppBase) {
  storedCatalog = catalog;
  const container = document.getElementById('market-grid');
  if (!container) {
    return;
  }
  container.innerHTML = '';
  catalog.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'market-card';
    card.dataset.marketCard = item.key;

    const header = document.createElement('header');
    header.innerHTML = `
            <div>
              <h4>${translateWithFallback(item.titleKey, item.title ?? item.key)}</h4>
              <p>${translateWithFallback(item.descriptionKey, item.description ?? '')}</p>
            </div>
          `;
    card.appendChild(header);

    if (item.capabilities?.length) {
      const chips = document.createElement('div');
      chips.className = 'chip-row';
      item.capabilities.forEach((capability, index) => {
        const chip = document.createElement('span');
        chip.className = 'chip neutral';
        const capabilityKey = item.capabilityKeys?.[index];
        chip.textContent = translateWithFallback(capabilityKey, capability);
        chips.appendChild(chip);
      });
      card.appendChild(chips);
    }

    const statusRow = document.createElement('div');
    statusRow.className = 'chip-row';
    const statusChip = document.createElement('span');
    const isComingSoon = Boolean(item.comingSoon);
    const comingSoonLabel = item.comingSoonKey
      ? translateWithFallback(item.comingSoonKey, translateWithFallback('market.catalog.comingSoon', 'Em breve'))
      : translateWithFallback('market.catalog.comingSoon', 'Em breve');

    if (isComingSoon) {
      statusChip.className = 'chip neutral';
      statusChip.textContent = comingSoonLabel;
    } else if (appBase.isEnabled(item.key)) {
      statusChip.className = 'chip success';
      statusChip.textContent = translateWithFallback('market.catalog.enabled', 'Ativo');
    } else {
      statusChip.className = 'chip info';
      statusChip.textContent = translateWithFallback('market.catalog.available', 'Disponível');
    }
    statusRow.appendChild(statusChip);

    if (item.license) {
      const licenseChip = document.createElement('span');
      licenseChip.className = 'chip neutral';
      licenseChip.textContent = translateWithFallback(item.licenseKey, `Licença: ${item.license}`, {
        license: item.license,
      });
      statusRow.appendChild(licenseChip);
    }
    card.appendChild(statusRow);

    const footer = document.createElement('footer');
    if (isComingSoon) {
      const info = document.createElement('span');
      info.className = 'chip neutral';
      info.textContent = translateWithFallback('market.catalog.soonMessage', comingSoonLabel);
      footer.appendChild(info);
    } else {
      const toggle = document.createElement('button');
      toggle.className = 'toggle';
      toggle.type = 'button';
      if (appBase.isDefault(item.key)) {
        toggle.textContent = translateWithFallback('market.catalog.required', 'Obrigatório');
        toggle.disabled = true;
      } else {
        toggle.textContent = appBase.isEnabled(item.key)
          ? translateWithFallback('market.catalog.disable', 'Desabilitar')
          : translateWithFallback('market.catalog.enable', 'Habilitar');
        toggle.addEventListener('click', () => {
          const previous = appBase.isEnabled(item.key);
          const result = appBase.toggleMiniApp(item.key);
          if (result.changed) {
            renderMiniAppGrid();
            buildMarketplace(catalog, appBase);
            if (!result.enabled && previous) {
              hideMiniAppPanel();
              activateView('tela-principal');
            }
          }
        });
      }
      footer.appendChild(toggle);
    }
    card.appendChild(footer);

    container.appendChild(card);
  });
}

export function connectMiniAppTriggers() {
  document.querySelectorAll('[data-miniapp-view]').forEach((element) => {
    if (element.dataset.bound === 'true') {
      return;
    }
    const module = AppBase.resolve(element.dataset.miniappView);
    const meta = AppBase.getModuleMeta(element.dataset.miniappView);
    if (!module || !meta) {
      return;
    }
    element.dataset.bound = 'true';
    element.addEventListener('click', (event) => {
      if (event.target.closest('button')) {
        return;
      }
      activateView(meta.id);
    });
  });

  document.querySelectorAll('[data-panel-trigger]').forEach((button) => {
    if (button.dataset.panelBound === 'true') {
      return;
    }
    button.dataset.panelBound = 'true';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleMiniAppPanel(button.dataset.panelTrigger, button);
    });
  });
}

export function toggleMiniAppPanel(key, trigger) {
  if (!panelCard || !panelContent || !panelPlaceholder) {
    return;
  }
  if (activePanelKey === key && panelCard.classList.contains('is-active')) {
    hideMiniAppPanel();
    return;
  }
  showMiniAppPanel(key, trigger);
}

function createModuleContext(meta) {
  const config = storedConfig ?? AppBase.getConfig() ?? null;
  return {
    app: AppBase,
    meta,
    state: {
      config,
      session: storedSession,
      dashboard: storedDashboard,
      backup: storedBackup,
      observability: storedObservability,
      catalog: storedCatalog,
    },
    ui: {
      translate,
      translateWithFallback,
      resolveTranslation,
      applyTranslations,
      formatRelativeTime,
    },
  };
}

function cleanupActivePanel() {
  if (typeof activePanelDestroy === 'function') {
    try {
      activePanelDestroy();
    } catch (error) {
      console.error('MiniApp destroy error', error);
    }
  }
  activePanelDestroy = null;
}

function showMiniAppPanel(key, trigger) {
  const module = AppBase.resolve(key);
  const meta = AppBase.getModuleMeta(key);
  if (!module || !meta || !panelCard || !panelContent || !panelPlaceholder) {
    return;
  }

  cleanupActivePanel();

  panelContent.innerHTML = '';
  const moduleContainer = document.createElement('div');
  moduleContainer.className = 'miniapp-panel-container';
  panelContent.appendChild(moduleContainer);

  const context = createModuleContext(meta);
  try {
    const result = module.init(moduleContainer, context);
    if (typeof result === 'function') {
      activePanelDestroy = result;
    } else if (typeof module.destroy === 'function') {
      activePanelDestroy = () => module.destroy(moduleContainer, context);
    } else {
      activePanelDestroy = null;
    }
  } catch (error) {
    console.error(`Erro ao iniciar módulo "${key}"`, error);
    activePanelDestroy = null;
  }

  if (!moduleContainer.hasChildNodes()) {
    const label = translateWithFallback(meta.card?.labelKey, meta.card?.label ?? meta.key);
    const fallback = document.createElement('p');
    fallback.className = 'panel-note';
    fallback.textContent =
      translateWithFallback('panel.placeholder.default', `Selecione um mini-app para ${label}`, { label }) ||
      `Selecione um mini-app para ${label}`;
    moduleContainer.appendChild(fallback);
  }

  applyTranslations(moduleContainer);

  panelPlaceholder.setAttribute('hidden', 'hidden');
  panelContent.removeAttribute('hidden');
  panelCard.classList.add('is-active');
  panelCard.classList.remove('is-collapsed');

  if (panelChip) {
    panelChip.textContent = translateWithFallback(meta.card?.labelKey, meta.card?.label ?? meta.key);
  }
  if (panelMeta) {
    panelMeta.textContent =
      translateWithFallback(meta.panel?.metaKey, meta.panel?.meta ?? '') ||
      translateWithFallback(meta.card?.metaKey, meta.card?.meta ?? '');
  }

  if (panelClose) {
    panelClose.removeAttribute('hidden');
  }

  if (panelMenu) {
    panelMenu.dataset.panelTrigger = key;
    panelMenu.setAttribute('aria-expanded', 'true');
    const label = translateWithFallback(meta.card?.labelKey, meta.card?.label ?? meta.key);
    panelMenu.setAttribute('aria-label', translateWithFallback('panel.close', `Fechar MiniAppPanel de ${label}`, {
      label,
    }));
  }

  if (activePanelTrigger) {
    activePanelTrigger.setAttribute('aria-expanded', 'false');
  }
  if (trigger) {
    trigger.setAttribute('aria-expanded', 'true');
    activePanelTrigger = trigger;
  } else {
    activePanelTrigger = null;
  }

  activePanelKey = key;
}

export function hideMiniAppPanel() {
  if (!panelCard || !panelContent || !panelPlaceholder) {
    cleanupActivePanel();
    return;
  }
  cleanupActivePanel();
  panelCard.classList.remove('is-active');
  panelCard.classList.add('is-collapsed');
  panelContent.innerHTML = '';
  panelContent.setAttribute('hidden', 'hidden');
  panelPlaceholder.removeAttribute('hidden');

  if (panelChip) {
    panelChip.textContent = translateWithFallback('panel.placeholder.chip', 'Mini-app não selecionado');
  }
  if (panelMeta) {
    panelMeta.textContent = translateWithFallback(
      'panel.placeholder.meta',
      'Selecione um mini-app na coluna à esquerda para visualizar os masters.',
    );
  }
  if (panelClose) {
    panelClose.setAttribute('hidden', 'hidden');
  }
  if (panelMenu) {
    panelMenu.removeAttribute('data-panel-trigger');
    panelMenu.setAttribute('aria-expanded', 'false');
    panelMenu.setAttribute('aria-label', translateWithFallback('panel.open', 'Abrir MiniAppPanel'));
  }
  if (activePanelTrigger) {
    activePanelTrigger.setAttribute('aria-expanded', 'false');
  }
  activePanelTrigger = null;
  activePanelKey = null;
}

if (panelClose) {
  panelClose.addEventListener('click', (event) => {
    event.stopPropagation();
    hideMiniAppPanel();
  });
}

if (panelMenu) {
  panelMenu.addEventListener('click', (event) => {
    event.stopPropagation();
    const targetKey = panelMenu.dataset.panelTrigger ?? activePanelKey;
    if (targetKey) {
      toggleMiniAppPanel(targetKey, panelMenu);
    }
  });
}

export function initExportActions() {
  document.querySelectorAll('[data-export-button]').forEach((button) => {
    if (button.dataset.exportBound === 'true') {
      return;
    }
    button.dataset.exportBound = 'true';
    button.addEventListener('click', async () => {
      await handleExportRequest(button.dataset.exportTarget, button);
    });
  });
}

function prepareExportConfig(config) {
  const headings = Array.isArray(config.headings)
    ? config.headings.map((heading, index) => translateWithFallback(config.headingKeys?.[index], heading))
    : config.headings;
  const excludedPhrases = [
    ...COMMON_EXPORT_EXCLUDE_KEYS.map((key) => resolveTranslation(key)).filter(Boolean),
    ...(config.excludedKeys ?? []).map((key) => resolveTranslation(key)).filter(Boolean),
    ...(config.excluded ?? []),
  ];
  const shortLabel = translateWithFallback(config.shortLabelKey, config.shortLabel ?? config.title);
  return {
    ...config,
    title: translateWithFallback(config.titleKey, config.title),
    subtitle: translateWithFallback(config.subtitleKey, config.subtitle),
    description: translateWithFallback(config.descriptionKey, config.description),
    headings,
    excluded: excludedPhrases.length ? excludedPhrases : undefined,
    shortLabel,
  };
}

async function handleExportRequest(targetId, button) {
  if (!targetId || !exportRegistry[targetId]) {
    console.warn('Export target não mapeado', targetId);
    return;
  }
  const section = document.getElementById(targetId);
  if (!section) {
    console.warn('Seção de exportação não encontrada', targetId);
    return;
  }
  const baseConfig = exportRegistry[targetId];
  const localizedConfig = prepareExportConfig(baseConfig);
  const shortLabel = localizedConfig.shortLabel ?? baseConfig.shortLabel ?? baseConfig.title;
  showExportFeedback(
    'loading',
    translateWithFallback('export.feedback.loading', `Preparando exportação de ${shortLabel}…`, {
      label: shortLabel,
    }),
  );
  setExportButtonLoading(button, true);
  try {
    const { exportDate, shared } = await exportSection(section, localizedConfig);
    const registeredTimestamp = registerExportAudit(baseConfig, exportDate);
    const feedbackKey = shared ? 'export.feedback.shared' : 'export.feedback.success';
    showExportFeedback(
      'success',
      translateWithFallback(feedbackKey, `Exportação gerada para ${shortLabel}.`, {
        label: shortLabel,
      }),
    );
    if (storedConfig && storedSession && storedBackup) {
      storedBackup.lastExport = registeredTimestamp;
      updateAccountDetails(storedConfig, storedSession, storedBackup);
    }
  } catch (error) {
    console.error('Erro ao exportar seção', error);
    showExportFeedback('error', translateWithFallback('export.feedback.error', 'Não foi possível gerar o PDF desta seção.'));
    tryPrintFallback(section, targetId);
  } finally {
    setExportButtonLoading(button, false);
  }
}

function setExportButtonLoading(button, isLoading) {
  if (!button) {
    return;
  }
  if (isLoading) {
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent?.trim() ?? '';
    }
    button.dataset.exporting = 'true';
    button.disabled = true;
    button.textContent = translateWithFallback('export.feedback.loadingShort', 'Exportando');
    return;
  }
  button.disabled = false;
  button.removeAttribute('data-exporting');
  const originalLabel = button.dataset.originalLabel;
  if (typeof originalLabel === 'string') {
    button.textContent = originalLabel;
    delete button.dataset.originalLabel;
  }
}

function showExportFeedback(state, message) {
  if (!exportFeedbackElement) {
    return;
  }
  exportFeedbackElement.dataset.state = state;
  exportFeedbackElement.hidden = false;
  if (exportFeedbackMessage) {
    exportFeedbackMessage.textContent = message;
  }
  if (exportFeedbackIcon) {
    exportFeedbackIcon.textContent = state === 'loading' ? '⏳' : state === 'success' ? '✅' : '⚠️';
  }
  if (hideFeedbackTimeout) {
    window.clearTimeout(hideFeedbackTimeout);
    hideFeedbackTimeout = null;
  }
  if (state !== 'loading') {
    hideFeedbackTimeout = window.setTimeout(() => {
      exportFeedbackElement.hidden = true;
      exportFeedbackElement.removeAttribute('data-state');
    }, 4000);
  }
}

export function updateMiniAppSummary(count) {
  const countRef = document.querySelector('[data-ref="miniapp-count"]');
  if (countRef) {
    countRef.textContent = count;
  }
  const tenantSummary = document.querySelector('[data-ref="summary-tenant"]');
  if (tenantSummary) {
    const tenantId = storedConfig?.tenantId ?? AppBase.getConfig()?.tenantId ?? '—';
    tenantSummary.textContent = tenantId;
  }
}

export function bindBackToHome() {
  document.querySelectorAll('[data-action="home"]').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      activateView('tela-principal');
    });
  });
}

function rerenderDynamicContent() {
  if (storedConfig && storedSession) {
    updateHeaderSession(storedConfig, storedSession);
  }
  if (storedDashboard) {
    updateHomeSnapshot(storedDashboard);
  }
  if (storedConfig && storedSession && storedBackup) {
    updateAccountDetails(storedConfig, storedSession, storedBackup);
  }
  if (storedObservability) {
    buildObservabilityTable(storedObservability);
  }
  renderMiniAppGrid();
  if (storedCatalog) {
    buildMarketplace(storedCatalog);
  }
}
