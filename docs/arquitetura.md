# Arquitetura do Projeto Marco

## Ciclo de Vida `mount…MiniApp`
1. **Bootstrap**: o app orquestrador carrega o layout base, resolve permissões via `ac` (Access Control) e registra listeners globais no `marcoBus`.
2. **Inicialização do estado**: o `projectStore` é instanciado com o `getCurrentId`, garantindo que o contexto do evento/cliente atual esteja disponível antes do render.
3. **Montagem de widgets**: a função `mount<Evento>MiniApp` (ou variações equivalentes) injeta dependências (`ac`, `store`, `bus`) e monta widgets compartilhados conforme a configuração do fluxo.
4. **Execução ativa**: durante o uso, os widgets publicam e escutam eventos via `bus`, sincronizando persistência e UI. O `store` reage a cada atualização e mantém o snapshot coeso.
5. **Desmontagem/cleanup**: ao trocar de contexto, o app cancela subscriptions do `bus`, persiste alterações pendentes e libera referências do `store` para evitar vazamentos.

## Dependências Necessárias
- **`ac`**: módulo de controle de acesso, responsável por liberar ou bloquear funcionalidades a partir do perfil do executivo.
- **`store` (`projectStore`)**: fonte da verdade, provê `getState`, `setState` e eventos de mudança para widgets.
- **`bus` (`marcoBus`)**: barramento de eventos baseado em publish/subscribe usado para comunicação cross-widget.
- **`getCurrentId`**: utilitário que retorna o identificador ativo (evento, convidado ou equipe), garantindo consistência na inicialização.

Todos os miniapps devem receber essas dependências como parâmetros explícitos para facilitar testes e permitir mocks durante pipelines de QA.

## Metodologia de UX Executiva
1. **Ponto de entrada consistente**: o ícone de lápis abre sempre o mesmo painel lateral (`EditorPanel`) a partir de um evento `editor:open`. Os apps publicam o payload `{ id: getCurrentId(), source: <miniapp> }`, permitindo que widgets compartilhem a experiência de edição.
2. **Layout previsível**: o painel lateral possui largura fixa de 420px, com header contendo breadcrumbs (`ac.getCurrentRole() → evento atual`) e botões `Salvar`/`Cancelar`. Campos obrigatórios aparecem com label alinhada à esquerda e descrição auxiliar de 12px logo abaixo.
3. **Sequência de interação**:
   - O app orquestrador dispara `miniapp:ready` após montar os widgets.
   - Ao clicar no lápis, um widget publica `editor:open`; o painel consome esse evento e solicita ao `store` o snapshot atual via `getState`.
   - Alterações são mantidas em um `draftState` local até que o usuário clique em `Salvar`, quando então emitimos `editor:commit` e atualizamos o `projectStore`.
   - O fechamento do painel emite `editor:close`, que deve limpar listeners e restaurar foco para o card original.
4. **Posicionamento e espaçamento**: cards principais utilizam grid de 12 colunas com gutters de 16px. Ações primárias permanecem no canto inferior direito do card, enquanto ações secundárias ficam no menu `…` ou ao lado do título. Use a paleta `MarcoBlue 600` para CTA primário e `MarcoGray 400` para textos auxiliares.

## Diretrizes para `shared` e `unique`
- **`tools/shared/`**: catálogo público com widgets e integrações reutilizáveis. Concentre aqui componentes que espelham capacidades comuns (Google Calendar, Marco Banzo, notificações padrão) e que possam ser versionados sem depender de um app específico.
- **`tools/unique/`**: espaço controlado para módulos pontuais ou confidenciais. Utilize-o para conectores raros, fluxos de clientes específicos ou funcionalidades que não devem poluir o catálogo compartilhado.
- Sempre que uma implementação em `unique` demonstrar valor recorrente, promova-a para `shared`, garantindo documentação de migração e redução de duplicidades.

### Organização de `tools/shared/`
- **`core/`**: infraestrutura de runtime (IndexedDB `projectStore`, `marcoBus`, utilitários `eventsCore`, `miniAppSync`).
- **`miniapps/`**: widgets executivos versionados por domínio (`tarefas/v1.mjs`, `fornecedores/v1.mjs`, `convidados/v1.mjs`, `mensagens/v1.mjs`).
- **`styles/`**: camada visual unificada (`app.css`) que cobre layout do app de Eventos, utilitários de miniapps e catálogo de convites.
- **`utils/`**: utilitários comuns (DOM, IDs, formatação BR, parsing de listas/convites).
- **`runtime/`**: loader público que resolve módulos locais ou das CDNs oficiais.

### Base comum de carregamento
- O arquivo `tools/shared/runtime/loader.mjs` centraliza o algoritmo de import dinâmico. Ele tenta carregar primeiro dos caminhos locais (`../`, `./`, `/tools/shared/`) e, em seguida, das CDNs públicas (`rawcdn.githack` e `jsDelivr`).
- Os orquestradores devem preferir `loadSharedModule('<subpasta/arquivo>')` para resolver dependências compartilhadas, evitando que cada app replique listas de URLs ou tratamentos de fallback.
- O loader exporta também `loadSharedModules([...])`, útil para resolver pacotes em paralelo durante o bootstrap e manter o tempo de montagem previsível, e `ensureSharedStyle('styles/app.css')` para injetar a folha de estilo compartilhada sem duplicar `<style>` inline.
- Ao promover um módulo de `unique` para `shared`, lembre-se de atualizar o README do app orquestrador para apontar para o caminho canônico em `tools/shared/`.
- Para coordenar a montagem única dos widgets, utilize `core/miniAppSync.mjs`, que expõe `ensureMiniApp` e `createMiniAppSync` e substitui flags manuais em `dataset`.

### Fluxo para registrar um miniapp no `apps/eventos.html`
1. **Importação**: adicione no bloco de bootstrap a chamada `await loadSharedModules(['core/miniAppSync.mjs', 'miniapps/<domínio>/vN.mjs'])`.
2. **Sincronizador**: instancie `const { ensureMiniApp, createMiniAppSync } = sharedMiniAppSync;` (ou equivalente) e inicialize `const sync = createMiniAppSync({ ac, store, bus, getCurrentId });`.
3. **Registro**: use `sync.ensureMiniApp('<domínio>', () => mount<Domínio>MiniApp({ ac, store, bus, getCurrentId }));` dentro do `DOMContentLoaded` para garantir montagem única e idempotente.
4. **Eventos**: valide que o miniapp publica `miniapp:ready` após a montagem, dispara `editor:open` ao abrir o painel e consome `editor:close` para limpar o estado temporário.
5. **Telemetria/documentação**: registre o domínio e a versão do miniapp na seção "Miniapps conectados" do README do app e adicione uma linha no `log.md` com a data e o racional da integração.

### Checklist de documentação após cada entrega
- Atualize este guia sempre que surgir uma nova dependência obrigatória ou alteração na sequência de eventos.
- Revise o README raiz com instruções de uso para o novo miniapp e referências às ferramentas em `tools/shared/`.
- Garanta que `agent.md` liste qualquer atenção extra para automação (ex.: scripts de build, padrões de nome).
- Acrescente ao `log.md` uma entrada descrevendo o objetivo, o motivo da mudança e como reutilizar o resultado em futuras entregas.

## Guidelines de Estilo e Nomenclatura
- Prefira nomes de arquivos no formato `kebab-case` para HTML/CSS e `camelCase` para módulos JavaScript.
- Funções de montagem devem seguir o padrão `mount<Contexto>MiniApp`, mantendo o `<Contexto>` alinhado ao domínio (ex.: `mountEventosMiniApp`).
- Widgets compartilhados expõem APIs em português claro, com verbos no infinitivo (`abrirConvite`, `sincronizarAgenda`).
- Comentários devem indicar o motivo da decisão arquitetural, evitando descrever o óbvio.
- Cada novo módulo precisa declarar suas dependências no topo e exportar uma função `setup` quando houver inicialização externa.

## Processo para Novos Miniapps
1. **Descoberta**: alinhar com a equipe de negócios o objetivo do miniapp e mapear quais widgets compartilhados já suprem o fluxo.
2. **Design técnico**: documentar no README da pasta do app quais eventos serão publicados/consumidos e quais dependências (`ac`, `store`, `bus`) são necessárias.
3. **Implementação**: iniciar pelo esqueleto `mount<Contexto>MiniApp`, conectar widgets compartilhados e só então criar módulos `unique` caso ainda existam lacunas.
4. **Validação**: executar o checklist de UX (clique no lápis → painel → salvamento) e registrar testes manuais no `log.md`.
5. **Lançamento**: abrir PR descrevendo o comportamento, dependências e quaisquer ajustes no catálogo compartilhado, mantendo rastreabilidade para evoluções futuras.

Seguir esta metodologia garante que qualquer pessoa consiga replicar a experiência do cliente e expandir o ecossistema rumo à versão 3.0 executiva.
