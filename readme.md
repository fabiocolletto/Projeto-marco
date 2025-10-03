# Projeto Marco

## Objetivo do Projeto
O Projeto Marco consolida diferentes miniaplicativos executivos em uma plataforma única para planejamento, convites e acompanhamento de eventos corporativos. A proposta é oferecer uma camada comum de serviços (autenticação, agenda compartilhada e notificações) enquanto permite que cada equipe entregue funcionalidades especializadas de forma independente.

## Visão Modular
### Apps como orquestradores
Os diretórios em `apps/` abrigam micro front-ends que atuam como orquestradores da experiência. Cada app carrega widgets, inicializa o estado compartilhado e publica eventos relevantes para o restante do ecossistema.

### Widgets compartilháveis
Componentes reutilizáveis vivem em `tools/shared/`, diretório público que espelha integrações comuns (ex.: conectores com Google, componentes de agenda, notificações) e garante que qualquer app consuma os mesmos blocos sem divergências. Esses widgets expõem APIs leves baseadas em propriedades e eventos, de modo que o mesmo componente possa ser montado em diferentes fluxos sem duplicação de lógica.

```
tools/shared/
  core/        → infraestrutura (projectStore, marcoBus, eventsCore, miniAppSync)
  miniapps/    → widgets executivos versionados (`tarefas/`, `fornecedores/`, `convidados/`, `mensagens/`)
  styles/      → camada visual unificada (`app.css`) que cobre layout geral, KPIs e catálogos
  utils/       → utilitários de DOM, formatação BR, IDs e parsing de listas/convites
  runtime/     → loader responsável por resolver módulos locais ou CDN (`runtime/loader.mjs`)
```

As folhas de estilo são carregadas dinamicamente pelo loader via `ensureSharedStyle('styles/app.css')`, evitando CSS inline nos apps orquestradores. Sempre que um miniapp expuser um layout novo, promova as regras para `tools/shared/styles/` e documente quais arquivos devem ser importados no bootstrap.

> **MiniAppSync** (`core/miniAppSync.mjs`): utilitário que garante montagem única de cada miniapp e concentra regras de sincronização (`ensureMiniApp`, `createMiniAppSync`). Ele evita que apps orquestradores repliquem lógica de dataset/flag manual e mantém a coesão do ecossistema.

### Camada de persistência, event bus e módulos específicos
A infraestrutura de dados é garantida pelo barramento de eventos (`core/marcoBus.js`) e pelo `core/projectStore.js`, enquanto módulos especializados residem em `tools/unique/`. Use `unique` para implementar integrações pontuais ou lógicas que não devam poluir o catálogo compartilhado — por exemplo, fluxos exclusivos de um app parceiro ou credenciais sensíveis. A persistência ocorre via adaptadores que falam com serviços corporativos e armazenam o estado atual no `projectStore`, enquanto o event bus propaga mudanças para manter os apps sincronizados. O carregamento padrão passa por `runtime/loader.mjs`, que resolve qualquer módulo compartilhado via `loadSharedModule('<subpasta/arquivo>')`.

## Metodologia de Entrega e Experiência
1. **Invariantes de UX executiva**: sempre que o usuário clicar no ícone de lápis, abra o painel lateral de edição padrão à direita, com cabeçalho informando o contexto atual (`getCurrentId`) e ações claras de salvar/cancelar. Respeite espaçamentos de 24px entre blocos e textos com tipografia corporativa `MarcoSans`.
2. **Orquestração previsível**: cada app registra no `marcoBus` os mesmos eventos de ciclo de vida (`miniapp:ready`, `editor:open`, `editor:close`). Widgets devem reagir a esses eventos para manter uma experiência consistente mesmo quando são reutilizados em outros fluxos.
3. **Gestão de estado disciplinada**: antes de liberar qualquer ação interativa, recupere o estado do `projectStore` e injete dependências via `mount<Contexto>MiniApp`. Alterações devem ser commitadas no store antes de emitir eventos de confirmação para garantir sincronia entre apps irmãos.
4. **Checklist para novos miniapps**:
   - Mapear os widgets necessários em `tools/shared/`; somente crie itens em `tools/unique/` se a lógica for realmente pontual.
   - Definir quais eventos o miniapp publica/consome e registrá-los na documentação para evitar colisões.
   - Implementar testes manuais cobrindo o fluxo de edição (click no lápis → painel → persistência) antes de solicitar revisão.
   - Documentar no `log.md` a evolução e quaisquer exceções adotadas.

Seguir essa metodologia garante que a equipe replique o mesmo modo de trabalhar ao evoluir o aplicativo atual ou criar novos módulos integrados ao repositório.

## Como plugar um novo miniapp no app de Eventos
1. **Mapeie as dependências**: confirme que o widget a ser criado já possui utilitários em `tools/shared/`. Caso contrário, extraia funções comuns para `utils/` antes de iniciar a implementação.
2. **Configure o bootstrap**: em `apps/eventos.html`, utilize `loadSharedModule` para importar `core/miniAppSync.mjs`, o miniapp desejado em `miniapps/<domínio>/vN.mjs` e quaisquer helpers adicionais.
3. **Monte com `miniAppSync`**: crie um sincronizador via `createMiniAppSync({ bus, store, ac, getCurrentId })` e registre o miniapp com `ensureMiniApp('<domínio>', () => mount<Domínio>MiniApp({ ac, store, bus, getCurrentId }))`. Garanta o carregamento de `ensureSharedStyle('styles/app.css')` antes de montar o widget para eliminar dependências de CSS inline.
4. **Siga o checklist de UX**: valide a abertura do painel de edição via evento `editor:open`, a persistência no `projectStore` e a publicação dos eventos `miniapp:ready` e `editor:close`.
5. **Documente a entrega**: registre no `log.md` o miniapp publicado, atualize `docs/arquitetura.md` com qualquer regra adicional e descreva no PR como o widget reaproveita o catálogo compartilhado.

Para casos excepcionalmente específicos, crie o módulo em `tools/unique/` seguindo as regras descritas naquele README e registre o motivo na documentação.

## Build e Testes
1. **Instalação de dependências**: assegure-se de utilizar Node.js 18+ e execute `npm install` na raiz assim que o `package.json` estiver disponível. Até lá, os protótipos podem ser servidos com `npx serve apps` para desenvolvimento local.
2. **Build**: utilize `npm run build` para gerar artefatos otimizados quando os pipelines forem configurados. Para protótipos estáticos, exporte a pasta `apps/` diretamente.
3. **Testes**: adote `npm test` e `npm run lint` como comandos padrão. Enquanto os testes automatizados não forem implementados, execute validações manuais abrindo `apps/eventos.html` no navegador e verificando os fluxos críticos.

Manter essa rotina garante que as entregas evoluam de protótipos para uma versão 3.0 pronta para consumo executivo.
