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
