# Arquitetura do Projeto

## QA antes da entrega
- **Estados do cabeçalho**: capturar screenshots ou gravações dos chips nos estados de pronto (`chipReady`), em edição (`chipDirty`) e salvando (`chipSaving`). Cada captura deve ser arquivada com referência ao build.
- **Confirmação de backup**: executar `projectStore.ping()` para validar conectividade e `projectStore.backupAll()` para garantir persistência. Registrar evidências (logs ou capturas) das execuções bem-sucedidas.
- **Registro dos resultados**: documentar as verificações no diário de QA compartilhado (pasta `docs/qa/diario.md` ou ferramenta equivalente), mencionando data, responsável e links para as evidências.
