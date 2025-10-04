# Agent.md

## Propósito
Este documento fornece um rápido resumo para quem automatiza tarefas neste repositório, descrevendo práticas recomendadas e pontos de atenção ao modificar os módulos compartilhados do projeto.

## Diretrizes Gerais
- Respeitar os fluxos de QA documentados no `readme.md` e em `docs/arquitetura.md`.
- Registrar evidências de cada automação executada nos canais acordados com a equipe.

## Convenções de Estilo
- Manter mensagens de commit descritivas, utilizando português claro.
- Evitar alterações irrelevantes ou quebrem o formato Markdown existente.

## Checklist Rápido
1. Garantir captura de screenshot dos chips do cabeçalho (`chipReady`, `chipDirty`, `chipSaving`) durante a execução automatizada.
2. Executar `projectStore.ping()` e `projectStore.backupAll()`, salvando logs que comprovem sucesso antes da entrega.
3. Confirmar que o processo de bootstrap cria o documento local esperado e anexar a evidência correspondente.
4. Atualizar o diário de QA com data, responsável e links das evidências coletadas.

Seguir estas orientações ajuda a manter o código consistente e facilita o trabalho colaborativo entre agentes e desenvolvedores humanos.
