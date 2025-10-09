# Manual operacional do AppBase Marco (R1.1)

> Este manual descreve o comportamento obrigatório do AppBase Marco que deve ser
> preservado em qualquer evolução ou criação de MiniApps. Use-o junto com o
> `agent.md`, o [manual de criação de MiniApp](./novo-miniapp.md) e o checklist
> de entregáveis para garantir que novos módulos respeitem a carenagem e o motor
> fornecidos pelo host.

## 1. Estrutura fixa do host

- **Shell completo em `appbase/index.html`** — a página reúne AppBar, rail de
  MiniApps, palco (stage) e rodapé responsivo. Qualquer MiniApp deve conviver
  com esse layout sem remover seções ou alterar a hierarquia de classes `ac-*`.
- **Arquivos dedicados** — mantenha marcação, estilos e scripts separados em
  `index.html`, `app.css` e `app.js`. Ajustes de comportamento ocorrem apenas em
  `app.js`, utilizando JavaScript vanilla.
- **Tokens de design** — todos os estilos reutilizam as variáveis `--ac-*`
  definidas em `app.css`. É proibido introduzir novos esquemas de cor ou
  tipografia fora do blueprint oficial.

## 2. Funcionalidades obrigatórias

- **Tema claro/escuro persistente** — o botão circular da AppBar alterna os
  temas `light`/`dark`, atualiza rótulos acessíveis, troca ícones (☀️/🌙) e
  persiste a preferência em `localStorage` (`marco-appbase:theme`). Qualquer
  alteração deve manter esses comportamentos e atualizar testes.
- **Modo tela cheia** — o atalho `data-fullscreen-toggle` usa a Fullscreen API
  nativa. O botão exibe mensagens de indisponibilidade quando o navegador não
  suporta o recurso e registra avisos acessíveis (`aria-label`, `title`).
- **Login com IndexedDB** — o formulário do painel salva nome, e-mail, telefone
  (formatação brasileira) e senha em IndexedDB com fallback automático para
  `localStorage`. Retrofits não podem quebrar a migração `localStorage →
  IndexedDB` documentada em `appbase/storage/indexeddb.js`.
- **Histórico e indicadores** — o painel mantém histórico auditável (login,
  logout, troca de idioma), contador de eventos e resumo com status de sync e
  backup. MiniApps adicionais não devem interferir nessas métricas sem atualizar
  o plano de QA (`04-plano-qa.md`).
- **Menu global de idiomas** — o seletor da AppBar lista sempre `pt-BR`,
  `en-US`, `es-ES` com bandeiras. Mudanças acionam `window.AppBaseI18n` e
  registram o evento `app:i18n:locale_changed` no histórico.
- **Rail acessível** — cartões de MiniApp utilizam `.ac-miniapp-card`, respondem
  a teclado (`Enter`/`Espaço`) e exibem fallback local quando o manifest remoto
  falha. Estados vazios, de carregamento ou erro devem seguir os helpers
  existentes em `app.js`.

## 3. Internacionalização

- O AppBase mantém dicionários base em `appbase/i18n/{pt-BR,en-US,es-ES}.json`.
  Toda nova string precisa ser registrada nas três línguas simultaneamente.
- Metadados e traduções de MiniApps são carregados a partir do manifesto
  (`supportedLocales`, `dictionaries`). Antes de publicar novos MiniApps verifique
  se o manifesto expõe esses campos e se o `releaseNotesPath` aponta para
  `docs/changelog.md`.
- Alterações nos idiomas devem seguir o [manual rígido de novo
  idioma](./novo-idioma.md) para manter automações compatíveis.

## 4. Persistência e estado

- **IndexedDB como fonte de verdade** — o estado global (`usuario`, indicadores
  e histórico) é salvo no object store `marco-appbase/state`. Falhas caem no
  fallback `localStorage` sem perder dados. Antes de refatorar revise
  `appbase/storage/indexeddb.js`.
- **Módulos registrados via `AppBase.register`** — cada MiniApp expõe uma função
  `init(container)` que recebe o palco atual. Instâncias devem implementar
  `destroy()` para liberar listeners quando o módulo for descarregado.
- **Boot configurável** — `MINIAPP_BOOT_CONFIG` em `appbase/app.js` lista
  MiniApps habilitados por padrão e fallback local. Ajustes devem ser refletidos
  nos testes de Playwright.

## 5. QA obrigatório

- Executar `npm test` (suíte Playwright) em qualquer alteração de UI ou idioma.
  A suíte cobre tema, rail, cadastro e internacionalização; novos cenários devem
  ser adicionados ao atualizar o plano de QA.
- Validar manualmente o comportamento descrito acima (tema, idiomas,
  fullscreen, login/persistência) em navegadores desktop responsivos (≥320 px).
  Se alguma funcionalidade estiver indisponível, registre a limitação no plano
  de QA do MiniApp afetado.

## 6. Referências

- `appbase/app.js` — lógica do host, boot de MiniApps e gestão do painel.
- `appbase/storage/indexeddb.js` — persistência com fallback.

## Log de revisões

| Data       | Alteração | Responsável |
|------------|-----------|-------------|
| 2025-01-16 | Criação do manual operacional do AppBase consolidando requisitos obrigatórios. | Codex |
