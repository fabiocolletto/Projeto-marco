# Projeto Marco

Este repositório...

## Testes visuais

Execute os cenários automatizados de interface com:

```bash
npm run test:visual
```

O script inicia um servidor estático para `apps/eventos.html`, faz a instrumentação necessária para carregar os módulos locais e captura os estados **Pronto**, **Edição** e **Salvando** da aplicação. As imagens ficam anexadas ao relatório do Playwright em `test-results/` (ignorado pelo Git), evitando binários no repositório.
