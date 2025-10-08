export default {
  key: 'operations',
  id: 'painel-controles',
  name: 'Painel de Controles',
  version: '1.0.0',
  kind: 'system',
  meta: {
    card: {
      label: 'Painel de Controles',
      meta: 'Painel unificado de login, sync e backup do sistema',
      cta: 'Abrir painel de controles',
    },
    badges: ['Sistema', 'Sync'],
    panel: {
      meta: 'Visão consolidada do painel de controles com integrações essenciais.',
    },
    marketplace: {
      title: 'Painel de Controles',
      description: 'Sessão, sincronização e backups monitorados em tempo real.',
      capabilities: ['Sync', 'Backup', 'Sessão'],
    },
  },
  capabilities: {
    /* I18N_CAPABILITIES */
    i18n: {
      enabled: false,
      defaultLocale: 'pt-BR',
      supportedLocales: ['pt-BR', 'en-US', 'es-ES']
    }
    /* END I18N_CAPABILITIES */
  }
};
