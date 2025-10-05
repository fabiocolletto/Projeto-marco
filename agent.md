# Agent.md

## Propósito
Este documento orienta futuras automações a evoluir o AppBase Marco mantendo-o
navegável em navegadores modernos, com HTML, CSS e JavaScript vanilla
organizados em arquivos dedicados.

## Diretrizes
- Trabalhe dentro do diretório `appbase/`, que contém `index.html`, `app.css` e
  `app.js`. A raiz continua com `index.html` apenas para redirecionamento.
- Preserve a estrutura shell + rail + palco + rodapé conforme especificação
  R1.0, expandindo ou ajustando componentes reutilizando classes prefixadas
  `ac-`.
- Estilos devem ser centralizados em `app.css`, usando os tokens `--ac-*` já
  definidos. Evite bibliotecas externas e mantenha compatibilidade com o tema
  atual.
- Interações em `app.js` devem permanecer em JavaScript vanilla, sem
  dependências externas, utilizando listeners declarados por classes `js-*` e
  IDs existentes.
- Atualize o `README.md` sempre que a estrutura ou fluxo de uso do protótipo
  mudar, incluindo instruções para abrir o AppBase diretamente via `appbase/`.

## Checklist rápido
1. Abrir `appbase/index.html` após alterações para garantir que o layout 100vh,
   o rail e os painéis funcionam corretamente.
2. Confirmar que o overlay de login, toggles e exportação CSV seguem as regras
   de acessibilidade e os stubs de eventos registram mensagens no console.
3. Verificar que nenhum asset ou dependência supérflua foi adicionada.
