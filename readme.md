# Projeto Marco

Este repositório concentra utilitários internos e documentação operacional do Projeto Marco. A organização está focada em facilitar entregas consistentes e reprodutíveis, com ênfase em processos claros de QA antes de cada release.

## Metodologia de Entrega e Experiência
A metodologia de entrega prioriza visibilidade e rastreabilidade de cada etapa. Toda release deve ser documentada com evidências visuais e validações manuais dos fluxos críticos do editor.

### Build e Testes
- **Capturas de tela obrigatórias:** registre o cabeçalho da aplicação nos três estados do indicador (`chipReady`, `chipDirty`, `chipSaving`) durante o ciclo de validação.
- **Validação manual do cabeçalho:** exercite e confirme o funcionamento do botão `✎`, dos menus contextuais e de qualquer atalho relevante exposto no cabeçalho.
- **Execução de rotinas internas:** execute `projectStore.ping()` e `projectStore.backupAll()` na console antes de liberar a build, registrando a saída como evidência de que os serviços estão responsivos.

Documente as evidências no relatório de entrega e vincule-as à versão publicada.
