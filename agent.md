# Agent.md

## Propósito
Este documento orienta futuras automações a evoluir o AppBase Marco mantendo-o
navegável em navegadores modernos, com HTML, CSS e JavaScript vanilla
organizados em arquivos dedicados. A versão atual foca exclusivamente no fluxo
de cadastro local, etiqueta do rail e painel principal.

## Diretrizes
- Trabalhe dentro do diretório `appbase/`, que concentra `index.html`,
  `app.css` e `app.js`. A raiz mantém apenas o redirecionamento.
- Preserve a estrutura shell + rail + palco + rodapé conforme especificação
  R1.0, reaproveitando classes prefixadas `ac-` para novos elementos.
- Estilos permanecem centralizados em `app.css`, usando os tokens `--ac-*`
  existentes. Evite bibliotecas externas e mantenha compatibilidade com o tema
  atual e com GitHub Pages.
- Interações em `app.js` devem seguir JavaScript vanilla, sem dependências
  externas, utilizando seletores por `data-*`, classes `js-*` ou IDs já
  definidos. Foque em login, persistência via `localStorage`, etiqueta e painel.
- Atualize o `README.md` sempre que o fluxo de cadastro ou a arquitetura
  simplificada mudarem, incluindo instruções para abrir o AppBase diretamente via
  `appbase/` e executar os testes.
- Mantenha a suíte Playwright em `tests/` alinhada ao comportamento visível.
  Atualize ou adicione cenários quando alterar a interação da etiqueta, painel
  ou overlay de login.
- Antes de iniciar qualquer fluxo operacional consulte o
  [catálogo de manuais](manuals/README.md) e siga integralmente o procedimento
  indicado. Em particular:
  - `manuals/novo-idioma.md` para inclusão ou manutenção de idiomas.
  - `manuals/novo-miniapp.md` para criação de MiniApps, garantindo a estrutura
    multilíngue obrigatória desde o primeiro commit e o fluxo operacional de
    montagem do beta.
  - `manuals/entregaveis-miniapp.md` para gerar o pacote de documentação
    (briefing, conteúdo, visual e QA) antes de abrir PRs e para orientar
    atualizações futuras dos MiniApps já publicados.

## Checklist rápido
1. Abrir `appbase/index.html` após alterações para garantir que o layout 100vh,
   o rail e o painel funcionam corretamente.
2. Validar acessibilidade básica do overlay de login (foco, `aria-*`, fechamento
   por Esc/backdrop) e o comportamento de abertura/fechamento da etiqueta.
3. Executar `npm test` para rodar a suíte Playwright e confirmar que cadastro,
   persistência e toggles continuam estáveis.
4. Verificar que nenhum asset ou dependência supérflua foi adicionado.
