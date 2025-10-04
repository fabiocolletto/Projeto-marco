# Projeto Marco

Este repositório...

## Metodologia de Entrega e Experiência

### Build e Testes
- Antes de cada release, capturar e anexar prints do cabeçalho exibindo os chips `chipReady`, `chipDirty` e `chipSaving`, garantindo que os três estados estejam registrados.
- Validar manualmente os botões de ação (ícone `✎`, menus contextuais e opções principais), confirmando que respondem conforme esperado em ambiente de staging.
- Executar e registrar os resultados de `projectStore.ping()` e `projectStore.backupAll()` imediatamente antes do release, assegurando que ambos concluam sem erros.

## Testes visuais

Execute os cenários automatizados de interface com:

```bash
npm run test:visual
```

O script inicia um servidor estático para `apps/eventos.html`, faz a instrumentação necessária para carregar os módulos locais e captura os estados **Pronto**, **Edição** e **Salvando** da aplicação. As imagens ficam anexadas ao relatório do Playwright em `test-results/` (ignorado pelo Git), evitando binários no repositório.
