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

## Checklist rápido
1. Abrir `appbase/index.html` após alterações para garantir que o layout 100vh,
   o rail e o painel funcionam corretamente.
2. Validar acessibilidade básica do overlay de login (foco, `aria-*`, fechamento
   por Esc/backdrop) e o comportamento de abertura/fechamento da etiqueta.
3. Executar `npm test` para rodar a suíte Playwright e confirmar que cadastro,
   persistência e toggles continuam estáveis.
4. Verificar que nenhum asset ou dependência supérflua foi adicionado.

## Boas práticas de verificação visual
- Sempre gere as prévias da interface via Playwright executando `npm run preview:capture`.
  O script `tests/visual/capture-preview.mjs` abre `appbase/index.html` direto do
  repositório e captura telas nos temas claro e escuro em resolução desktop.
- Utilize as imagens emitidas em `tests/artifacts/previews/` como referência em
  revisões. Evite métodos alternativos de captura; este fluxo é padronizado e
  confiável tanto para validações locais quanto em pipelines.
