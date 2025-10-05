import { AppBase } from './app-base.js';
import {
  dashboardSnapshot,
  sessionState,
  backupSnapshot,
  marketCatalog,
  observabilitySnapshot,
  bootConfig,
  moduleDefinitions,
} from './state.js';
import {
  initLocalization,
  initThemeControls,
  updateHeaderSession,
  updateHomeSnapshot,
  updateAccountDetails,
  buildObservabilityTable,
  renderMiniAppGrid,
  buildMarketplace,
  connectMiniAppTriggers,
  initExportActions,
  bindBackToHome,
} from './ui.js';

async function bootstrap() {
  moduleDefinitions.forEach((definition) => {
    AppBase.register(definition.key, definition);
  });

  await initLocalization('pt-BR');
  initThemeControls();

  AppBase.boot(bootConfig);

  renderMiniAppGrid();
  buildMarketplace(marketCatalog);
  updateHeaderSession(bootConfig, sessionState);
  updateHomeSnapshot(dashboardSnapshot);
  updateAccountDetails(bootConfig, sessionState, backupSnapshot);
  buildObservabilityTable(observabilitySnapshot);
  connectMiniAppTriggers();
  initExportActions();
  bindBackToHome();

  AppBase.onChange(() => {
    renderMiniAppGrid();
    buildMarketplace(marketCatalog);
  });
}

bootstrap().catch((error) => {
  console.error('Falha ao iniciar a interface Marco', error);
});
