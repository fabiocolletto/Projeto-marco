# Catálogo `tools/shared/`

Este diretório concentra os módulos reutilizáveis do Projeto Marco, organizados em cinco camadas:

- **`core/`** – infraestrutura compartilhada: `projectStore` (IndexedDB), `marcoBus` (event bus), `eventsCore` (helpers de domínio) e `miniAppSync` (montagem única de miniapps).
- **`miniapps/`** – widgets executivos versionados. Cada subpasta contém um módulo `vN.mjs` com a função `mount…MiniApp` correspondente.
- **`styles/`** – folha de estilo unificada `app.css` cobrindo layout do orquestrador, utilitários de miniapps e catálogo de convites.
- **`utils/`** – funções utilitárias independentes (DOM, IDs, formatação BR, parsing de convites/listas).
- **`runtime/`** – loader padrão (`runtime/loader.mjs`) consumido pelos apps orquestradores via `loadSharedModule('<subpasta/arquivo>')`.

## Convenções rápidas
- Prefira `loadSharedModule('core/projectStore.js')` (ou caminhos equivalentes) para resolver dependências. O loader tenta caminhos locais e, em fallback, as CDNs oficiais (`rawcdn.githack`, `jsDelivr`).
- Miniapps devem depender apenas de `ac`, `store`, `bus` e `getCurrentId`, recebidos como parâmetros de `mount…MiniApp`.
- Use `core/miniAppSync.mjs` (`createMiniAppSync` / `ensureMiniApp`) para evitar flags manuais (`dataset.mounted`) ao montar widgets a partir dos apps em `apps/`.
- Qualquer duplicação encontrada em novos miniapps deve ser extraída para `utils/` e reaproveitada.
- Registre no cabeçalho do módulo (`/** Miniapp Eventos v1 */`) o motivo da existência e o contexto de uso para facilitar futuras promoções ou refactors.

## Como consumir a partir de `apps/eventos.html`
1. Carregue o loader: `const { loadSharedModules } = await import('../tools/shared/runtime/loader.mjs');` (ou caminho equivalente quando servido via CDN).
2. Resolva as dependências necessárias `const [{ createMiniAppSync }, { mountTarefasMiniApp }] = await loadSharedModules(['core/miniAppSync.mjs', 'miniapps/tarefas/v1.mjs']);` (troque o domínio conforme o miniapp desejado).
3. Instancie o sincronizador `const sync = createMiniAppSync({ ac, store, bus, getCurrentId });` e monte `sync.ensureMiniApp('tarefas', () => mountTarefasMiniApp({ ac, store, bus, getCurrentId }));`.
4. Caso precise da base visual, importe-a via loader (`ensureSharedStyle('styles/app.css')`) e mantenha a chamada declarada na documentação do miniapp.

Sempre que um novo miniapp for conectado, atualize este arquivo com links para sua subpasta e descreva quais utilitários do catálogo ele utiliza.
