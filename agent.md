# Agent.md

Este repositório está em modo **Clean v3.0**. Toda evolução deve se concentrar
na pasta `appbase/`, mantendo HTML, CSS e JavaScript simples, sem frameworks.

- `appbase/index.html` carrega o shell Clean e referencia `app.css` e `app.js`.
- O CSS deve permanecer em `appbase/app.css`, reutilizando o prefixo `ac-`.
- A lógica do shell (login local, overlay desktop, billing) fica em
  `appbase/app.js` e módulos em `appbase/modules/`.
- Atualize o `README.md` para qualquer mudança de fluxo.
- Para testar, sirva o diretório estático (`npx serve .`) e abra `appbase/` em
  viewport mobile (≤ 800 px).
