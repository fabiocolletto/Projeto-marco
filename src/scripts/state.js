export const dashboardSnapshot = {
  taskFlow: 82,
  capacity: 92,
  alerts: 3,
  approvals: 12,
  fieldTeams: 9,
  priorityTasks: 4,
};

export const sessionState = {
  network: 'Online',
  deviceName: 'Marco Tablet Kiosk',
  lastSync: '12/03/2025 17:42',
  timeToReady: '1,4s',
  kioskModeKey: 'account.identity.kioskOwner',
  kioskMode: 'Device Owner • Single-App Kiosk',
  devices: [
    {
      id: 'device-01',
      label: 'Marco Tablet Kiosk',
      type: 'Tablet',
      typeKey: 'account.devices.type.tablet',
      lastActivity: { value: 2, unit: 'minute' },
      status: 'Sessão atual',
      statusKey: 'account.devices.status.current',
    },
    {
      id: 'device-02',
      label: 'iPhone 15 — Operações',
      type: 'Celular',
      typeKey: 'account.devices.type.phone',
      lastActivity: { value: 1, unit: 'hour' },
      status: 'Login via Passkey',
      statusKey: 'account.devices.status.passkey',
    },
    {
      id: 'device-03',
      label: 'Desktop Backoffice',
      type: 'Desktop',
      typeKey: 'account.devices.type.desktop',
      lastActivity: { value: 3, unit: 'hour' },
      status: 'Sessão ativa',
      statusKey: 'account.devices.status.active',
    },
  ],
  auditTrail: [
    {
      event: 'export_completed',
      descriptionKey: 'audit.exportCompleted',
      timestamp: '12/03 17:21',
    },
    {
      event: 'erasure_requested',
      descriptionKey: 'audit.erasureScheduled',
      timestamp: '12/03 14:02',
    },
    {
      event: 'consent_logged',
      descriptionKey: 'audit.consentLogged',
      timestamp: '11/03 18:45',
    },
  ],
};

export const backupSnapshot = {
  enabled: true,
  filesSynced: 128,
  lastExport: '12/03 17:21',
  storageStatus: {
    drive: {
      name: 'Google Drive',
      status: 'Operacional',
      statusKey: 'account.backup.status.operational',
      lastSync: { value: 5, unit: 'minute' },
    },
    onedrive: {
      name: 'Microsoft OneDrive',
      status: 'Operacional',
      statusKey: 'account.backup.status.operational',
      lastSync: { value: 8, unit: 'minute' },
    },
  },
};

export const marketCatalog = [
  {
    key: 'operations',
    title: 'Painel de Operações',
    titleKey: 'market.catalog.operations.title',
    description: 'KPIs, dados mestres e status unificado do tenant.',
    descriptionKey: 'market.catalog.operations.description',
    capabilities: ['KPIs', 'Alertas', 'Workflow'],
    capabilityKeys: [
      'market.catalog.operations.capability1',
      'market.catalog.operations.capability2',
      'market.catalog.operations.capability3',
    ],
    license: 'Base',
    licenseKey: 'market.catalog.operations.license',
  },
  {
    key: 'tasks',
    title: 'Gestor de Tarefas',
    titleKey: 'market.catalog.tasks.title',
    description: 'Cronogramas, responsáveis e dependências críticas.',
    descriptionKey: 'market.catalog.tasks.description',
    capabilities: ['Quadro', 'Alertas', 'Exportação'],
    capabilityKeys: [
      'market.catalog.tasks.capability1',
      'market.catalog.tasks.capability2',
      'market.catalog.tasks.capability3',
    ],
    license: 'Base',
    licenseKey: 'market.catalog.tasks.license',
  },
  {
    key: 'account',
    title: 'Conta & Backup',
    titleKey: 'market.catalog.account.title',
    description: 'Identidade, dispositivos, direitos do titular e backups.',
    descriptionKey: 'market.catalog.account.description',
    capabilities: ['LGPD', 'Backup', 'Passkeys'],
    capabilityKeys: [
      'market.catalog.account.capability1',
      'market.catalog.account.capability2',
      'market.catalog.account.capability3',
    ],
    license: 'Premium',
    licenseKey: 'market.catalog.account.license',
  },
  {
    key: 'market',
    title: 'Marketplace',
    titleKey: 'market.catalog.market.title',
    description: 'Gestão de catálogos, licenças e habilitação de MiniApps.',
    descriptionKey: 'market.catalog.market.description',
    capabilities: ['Catálogo', 'Licenças', 'Provisionamento'],
    capabilityKeys: [
      'market.catalog.market.capability1',
      'market.catalog.market.capability2',
      'market.catalog.market.capability3',
    ],
    license: 'Base',
    licenseKey: 'market.catalog.market.license',
  },
  {
    key: 'settings',
    title: 'Configuração & Operação',
    titleKey: 'market.catalog.settings.title',
    description: 'Parâmetros do AppBase, observabilidade e auditoria.',
    descriptionKey: 'market.catalog.settings.description',
    capabilities: ['Schemas', 'Observabilidade', 'LGPD'],
    capabilityKeys: [
      'market.catalog.settings.capability1',
      'market.catalog.settings.capability2',
      'market.catalog.settings.capability3',
    ],
    license: 'Base',
    licenseKey: 'market.catalog.settings.license',
  },
  {
    key: 'analytics',
    title: 'Insights Avançados',
    titleKey: 'market.catalog.analytics.title',
    description: 'Visualizações analíticas e previsões operacionais.',
    descriptionKey: 'market.catalog.analytics.description',
    capabilities: ['Forecast', 'Análises', 'Dashboards'],
    capabilityKeys: [
      'market.catalog.analytics.capability1',
      'market.catalog.analytics.capability2',
      'market.catalog.analytics.capability3',
    ],
    license: 'Add-on',
    licenseKey: 'market.catalog.analytics.license',
    comingSoon: true,
    comingSoonKey: 'market.catalog.analytics.soon',
  },
];


function createTemplateModule(config) {
  const meta = {
    key: config.key,
    id: config.id,
    card: config.card,
    badges: config.badges ?? [],
    badgeKeys: config.badgeKeys ?? [],
    panel: config.panel ?? {},
  };

  return {
    key: meta.key,
    meta,
    init(container, context = {}) {
      if (!container) {
        return;
      }
      const templateId = meta.panel?.template;
      const uiContext = context.ui ?? {};
      const applyTranslations = typeof uiContext.applyTranslations === 'function' ? uiContext.applyTranslations : null;
      const translateWithFallback =
        typeof uiContext.translateWithFallback === 'function' ? uiContext.translateWithFallback : null;
      const translate = typeof uiContext.translate === 'function' ? uiContext.translate : null;

      if (templateId) {
        const template = document.getElementById(templateId);
        if (template) {
          container.appendChild(template.content.cloneNode(true));
          if (applyTranslations) {
            applyTranslations(container);
          }
        }
      }

      if (!container.hasChildNodes()) {
        const resolvedLabel =
          (translateWithFallback && translateWithFallback(meta.card?.labelKey, meta.card?.label ?? '')) ||
          (translate && meta.card?.labelKey
            ? (() => {
                const value = translate(meta.card.labelKey, {});
                return value !== meta.card.labelKey ? value : null;
              })()
            : null) ||
          meta.card?.label ||
          meta.key;

        const fallbackText =
          (translateWithFallback &&
            translateWithFallback(
              'panel.placeholder.default',
              `Selecione um mini-app para ${resolvedLabel}`,
              { label: resolvedLabel },
            )) ||
          (translate
            ? (() => {
                const value = translate('panel.placeholder.default', { label: resolvedLabel });
                return value !== 'panel.placeholder.default' ? value : null;
              })()
            : null) ||
          `Selecione um mini-app para ${resolvedLabel}`;

        const fallback = document.createElement('p');
        fallback.className = 'panel-note';
        fallback.textContent = fallbackText;
        container.appendChild(fallback);
      }
    },
  };
}

export const moduleDefinitions = [
  createTemplateModule({
    key: 'operations',
    id: 'mini-app-painel',
    card: {
      label: 'Painel de Operações',
      labelKey: 'miniapps.operations.label',
      meta: 'KPIs, dados mestres e status de recursos',
      metaKey: 'miniapps.operations.meta',
      cta: 'Abrir painel detalhado',
      ctaKey: 'miniapps.operations.cta',
    },
    badges: ['KPIs', 'Alertas'],
    badgeKeys: ['miniapps.operations.badge1', 'miniapps.operations.badge2'],
    panel: {
      template: 'panel-template-operations',
      meta: 'Masters do painel operacional prontos para receber subcards.',
      metaKey: 'miniapps.operations.panel',
    },
  }),
  createTemplateModule({
    key: 'tasks',
    id: 'mini-app-tarefas',
    card: {
      label: 'Gestor de Tarefas',
      labelKey: 'miniapps.tasks.label',
      meta: 'Cronogramas, responsáveis e dados consumidos',
      metaKey: 'miniapps.tasks.meta',
      cta: 'Abrir lista de tarefas',
      ctaKey: 'miniapps.tasks.cta',
    },
    badges: ['Workflow', 'Autosave'],
    badgeKeys: ['miniapps.tasks.badge1', 'miniapps.tasks.badge2'],
    panel: {
      template: 'panel-template-tasks',
      meta: 'Masters do gestor focados em filtros e status prioritários.',
      metaKey: 'miniapps.tasks.panel',
    },
  }),
  createTemplateModule({
    key: 'account',
    id: 'mini-app-conta',
    card: {
      label: 'Conta & Backup',
      labelKey: 'miniapps.account.label',
      meta: 'Identidade, dispositivos e direitos LGPD',
      metaKey: 'miniapps.account.meta',
      cta: 'Gerenciar conta',
      ctaKey: 'miniapps.account.cta',
    },
    badges: ['LGPD', 'Backup'],
    badgeKeys: ['miniapps.account.badge1', 'miniapps.account.badge2'],
    panel: {
      template: 'panel-template-account',
      meta: 'Masters para direitos do titular, dispositivos e backups.',
      metaKey: 'miniapps.account.panel',
    },
  }),
  createTemplateModule({
    key: 'market',
    id: 'mini-app-market',
    card: {
      label: 'Marketplace',
      labelKey: 'miniapps.market.label',
      meta: 'Catálogo confiável de mini-apps do tenant',
      metaKey: 'miniapps.market.meta',
      cta: 'Gerenciar licenças',
      ctaKey: 'miniapps.market.cta',
    },
    badges: ['Catálogo', 'Provisionamento'],
    badgeKeys: ['miniapps.market.badge1', 'miniapps.market.badge2'],
    panel: {
      template: 'panel-template-market',
      meta: 'Preview compacto para habilitar ou revogar licenças.',
      metaKey: 'miniapps.market.panel',
    },
  }),
  createTemplateModule({
    key: 'settings',
    id: 'mini-app-config',
    card: {
      label: 'Configuração & Operação',
      labelKey: 'miniapps.settings.label',
      meta: 'Parametros, observabilidade e auditoria',
      metaKey: 'miniapps.settings.meta',
      cta: 'Abrir configurações',
      ctaKey: 'miniapps.settings.cta',
    },
    badges: ['Schemas', 'Logs'],
    badgeKeys: ['miniapps.settings.badge1', 'miniapps.settings.badge2'],
    panel: {
      template: 'panel-template-settings',
      meta: 'Masters de configuração rápida e observabilidade do tenant.',
      metaKey: 'miniapps.settings.panel',
    },
  }),
];

export const observabilitySnapshot = [
  {
    event: 'boot_start',
    eventKey: 'observability.events.bootStart',
    timestamp: '12/03 17:00',
    notes: 'Fluxo nominal',
    notesKey: 'observability.notes.bootStart',
  },
  {
    event: 'config_loaded',
    eventKey: 'observability.events.configLoaded',
    timestamp: '12/03 17:00',
    notes: 'Checksum válido',
    notesKey: 'observability.notes.configLoaded',
  },
  {
    event: 'session_ok',
    eventKey: 'observability.events.sessionOk',
    timestamp: '12/03 17:01',
    notes: 'Token renovado via PKCE',
    notesKey: 'observability.notes.sessionOk',
  },
  {
    event: 'sync_completed',
    eventKey: 'observability.events.syncCompleted',
    timestamp: '12/03 17:42',
    notes: 'Fila zerada',
    notesKey: 'observability.notes.syncCompleted',
  },
  {
    event: 'export_completed',
    eventKey: 'observability.events.exportCompleted',
    timestamp: '12/03 17:21',
    notes: 'Envelope distribuído',
    notesKey: 'observability.notes.exportCompleted',
  },
];

export const bootConfig = {
  tenantId: 'tenant-marco',
  userId: 'ribeiro.l',
  catalogBaseUrl: 'https://cdn.marco.app/catalog',
  defaults: { enabledMiniApps: ['home', 'market', 'settings'] },
  user: {
    enabledMiniApps: ['operations', 'tasks', 'account'],
    entitlements: { backup: true, marketplace: true },
    providers: { login: ['google', 'apple'], storage: ['drive', 'onedrive'] },
  },
  ui: { theme: 'dark', layout: 'tabs' },
  meta: { version: '1.0', signature: 'demo-signature', checksum: 'demo-checksum' },
};

export function registerExportAudit(config, exportDate) {
  const timestamp = formatAuditTimestamp(exportDate);
  sessionState.auditTrail.unshift({
    event: 'export_generated',
    descriptionKey: 'audit.exportGenerated',
    labelKey: config.shortLabelKey ?? config.titleKey,
    labelFallback: config.shortLabel ?? config.title,
    timestamp,
  });
  if (sessionState.auditTrail.length > 20) {
    sessionState.auditTrail.length = 20;
  }
  backupSnapshot.lastExport = timestamp;
  return timestamp;
}

function formatAuditTimestamp(date) {
  const pad = (value) => value.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
