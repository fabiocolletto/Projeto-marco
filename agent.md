# Agent.md

## Propósito
Este documento fornece um rápido resumo para quem automatiza tarefas neste repositório, descrevendo práticas recomendadas e pontos de atenção ao modificar os módulos compartilhados do projeto.

## Diretrizes Gerais
- Priorize o reaproveitamento de módulos em `tools/shared/`. Promova qualquer lógica recorrente encontrada em `tools/unique/` e documente a migração.
- Ao modificar `apps/eventos.html`, garanta que o carregamento use `loadSharedModule`/`loadSharedModules` e que novos widgets sejam registrados via `miniAppSync`.
- Sempre que criar ou alterar miniapps, atualize `docs/arquitetura.md`, `readme.md` e `log.md` com o motivo, uso futuro e instruções de montagem.
- Evite `<style>` inline: carregue a base visual com `ensureSharedStyle('styles/app.css')` e promova utilitários visuais para `tools/shared/styles/`.

## Convenções de Estilo
- Nomeie arquivos JavaScript em `tools/shared/miniapps/` como `vN.mjs`, mantendo versionamento explícito.
- Prefira imports relativos ao loader (`loadSharedModule('core/projectStore.js')`) em vez de caminhos absolutos.
- Documente funções exportadas com comentários focados no *porquê* da decisão.

## Checklist Rápido
1. Revisar `apps/eventos.html` para confirmar que o miniapp desejado está registrado com `ensureMiniApp`.
2. Atualizar README(s) relevantes com instruções de uso e dependências.
3. Registrar a alteração em `log.md`, incluindo objetivo, impacto e próximos passos.
4. Validar manualmente o fluxo "clique no lápis → painel → persistência" após qualquer mudança em miniapps.

Seguir estas orientações ajuda a manter o código consistente e facilita o trabalho colaborativo entre agentes e desenvolvedores humanos.
