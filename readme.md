# Projeto Marco

Este repositório...

## Testes visuais

Execute os cenários automatizados de interface com:

```bash
npm run test:visual
```

O spec único `tests/visual/eventos.spec.ts` já sobe um servidor estático interno apontando para `apps/eventos.html`, cobre o fluxo completo (cadastro com o fixture de casamento, interações de cabeçalho, responsividade e validação do `sharedStore`) e captura estados **Pronto**, **Edição** e **Salvando** sem depender de `npx serve`. As imagens ficam anexadas ao relatório do Playwright em `test-results/` (ignorado pelo Git), evitando binários no repositório.
