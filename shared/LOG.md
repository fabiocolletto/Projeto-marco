# Log dos módulos compartilhados

## 2024-04-08
- Documentação adicionada detalhando a finalidade de cada módulo.
- Reforçada a necessidade de manter compatibilidade ao alterar APIs públicas.

## 2024-04-09
- Extraído utilitários de normalização de nomes para `listUtils.js` para consumo compartilhado.

## 2025-10-04
- Reimplementadas `normalizeName` e `stripNumbersFromName` em `listUtils.js` usando exports ESM nomeados.
- Adicionada camada de compatibilidade `higienizarLista.mjs` reexportando os novos utilitários e expondo `deriveTelefone`.
