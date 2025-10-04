# Agent.md

## Propósito
Este documento orienta automações e agentes que atuam neste repositório, garantindo que tarefas críticas sejam executadas com evidências claras e verificações mínimas antes de qualquer entrega.

## Diretrizes Gerais
- Priorize a coleta de evidências (capturas de tela, logs e hashes de build) durante cada execução.
- Registre todas as ações relevantes no `log.md` sempre que uma política operacional for alterada ou reafirmada.

## Convenções de Estilo
- Utilize português claro e objetivo ao atualizar documentação.
- Quando descrever comandos, envolva-os em crases para facilitar a leitura em markdown.

## Checklist Rápido
1. Gerar e arquivar uma captura de tela do cabeçalho nos estados `chipReady`, `chipDirty` e `chipSaving` durante o fluxo automatizado.
2. Executar `projectStore.ping()` e `projectStore.backupAll()` para verificar conectividade e backups, anexando as saídas ao relatório da automação.
3. Confirmar que o processo de bootstrap cria um documento local válido antes de prosseguir com outras etapas (verificar a presença do arquivo e o identificador associado).
4. Atualizar o relatório de execução com links para as evidências coletadas e o status final da rotina.

Seguir estas orientações ajuda a manter o código consistente e facilita o trabalho colaborativo entre agentes e desenvolvedores humanos.
