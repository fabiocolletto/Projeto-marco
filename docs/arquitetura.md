# Arquitetura do Projeto Marco

Este documento descreve os componentes principais da solução e como eles interagem para entregar a experiência do editor colaborativo do Projeto Marco.

## Componentes Principais
- **Cliente Web:** interface principal de edição e visualização, responsável por exibir o cabeçalho com indicadores de status (`chipReady`, `chipDirty`, `chipSaving`).
- **Project Store:** camada responsável pela persistência local e sincronização dos documentos, expondo utilitários como `ping()` e `backupAll()` para validações operacionais.
- **Serviços de Sincronização:** serviços backend que garantem consistência entre clientes e backups off-line.

## Fluxo de Dados
1. O cliente web registra eventos de interação (edição, salvamento, mudanças de estado do cabeçalho).
2. O Project Store orquestra gravações locais, executa `ping()` para avaliar latência e disponibiliza `backupAll()` para sincronização de snapshots.
3. Os serviços de sincronização persistem alterações definitivas e alimentam o log de auditoria utilizado no QA.

## QA antes da entrega
- **Capturas de tela por estado:** produza três prints do cabeçalho representando: modo pronto (`chipReady` exibindo estado estável), modo de edição (`chipDirty` após modificar o documento) e modo salvando (`chipSaving` enquanto o backend confirma a escrita).
- **Revisão do log de eventos:** consulte o log de eventos do cliente e do backend para confirmar que as transições entre estados ocorreram sem erros ou warnings inesperados.
- **Registro do resultado:** anexe as capturas e um resumo da revisão do log ao relatório de QA, citando explicitamente a hora, o ambiente e o número da build inspecionada.

## Considerações Futuras
- Automatizar a coleta de evidências para reduzir esforço manual nas releases recorrentes.
- Integrar análises de telemetria que antecipem degradações de desempenho antes de impactar o usuário final.
