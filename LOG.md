# Histórico do Projeto

## 2024-04-08
- Adicionados arquivos de README e log para facilitar a documentação das atividades.
- Estabelecidas convenções de importação local prioritária com fallback para CDNs nos widgets.

## 2024-10-15
- Documentado o procedimento completo para preparar o Playwright (`npm install` + `npx playwright install --with-deps`) e garantir que `npm test` execute com sucesso.

## 2024-10-16
- Criado o registro de revisões do MiniApp Base e linkado o documento diretamente no rodapé da interface.
- Validado o MiniApp Base com smoke test Playwright e inspeção visual em tela cheia para confirmar o novo rodapé.

## 2025-10-15
- Preparação do shell para suportar mini-apps assinados, incluindo menu dedicado e skeletons de carregamento.
- Removido o botão redundante de colapso da sidebar e validado visualmente a interação apenas pelo controle do header.

## 2025-10-17
- Restaurados fallbacks de i18n no shell base para evitar que chaves brutas sobrescrevam textos e placeholders originais.
- Sincronizados comportamentos dos menus do usuário e de navegação para evitar conflitos de foco e eventos de clique.
- Validado fluxo de abertura via suíte Playwright (`npm test -- --reporter=line`) para garantir carregamento das telas de autenticação.
- Registrado passo a passo alternativo para baixar navegadores e dependências do Playwright em ambientes com proxy restritivo.

## 2025-10-18
- Documentado o fluxo de detecção automática de idioma no shell base, garantindo fallback consistente para inglês quando o navegador não oferece uma opção suportada.
- Simulados navegadores com `navigator.languages` variados via DevTools (`Object.defineProperty(window.navigator, 'languages', { value: [...] })`) e recarga da página para validar seleção automática em pt-BR, en-US e es-419, além do fallback para en-US quando apenas `['fr-FR', 'de-DE']` estava disponível.
- Registrada verificação manual do atributo `document.documentElement.lang` após a inicialização para assegurar que reflete o idioma efetivo carregado pelo i18n.

## 2025-10-19
- Arquivadas as pastas `Assistentes/`, `docs/`, `reports/`, `scripts/`, `shared/`, `tools/`, `unique/` e os mini-apps `miniapps/mini_app_1` e `miniapps/mini_app_2` em `archive/`, seguindo a política de preservar apenas o shell base ativo.
- Atualizado o fallback do catálogo em `apps/web/app.js` e o `appbase/registry.json` para refletirem a remoção dos mini-apps temporários.
- Registrados os itens movidos no `archive/MANIFEST.json` e adicionadas instruções de restauração nos READMEs dos mini-apps arquivados.

## 2025-10-20
- Atualizado `appbase/shell` para reaproveitar o miniapp base atual, evitando divergências de código e garantindo acesso imediato às práticas vigentes do shell.
- Documentada a nova abordagem no `appbase/shell/README.md` para orientar validações e variações futuras.
