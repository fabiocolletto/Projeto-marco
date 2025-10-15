# MiniApp Base Shell

Shell responsivo com cabeçalho, barra lateral recolhível e painel central expansível. Entrega recursos fundamentais para miniaplicativos: internacionalização triádica (pt-BR, en-US, es-419), troca de tema (claro/escuro/sistema) e autenticação local multiusuário.

## Estrutura
- **app.js** – inicia o shell, carrega i18n/tema, sincroniza usuário atual e trata menus.
- **i18n/** – dicionários de idioma.
- **auth/** – páginas de login, registro e perfil reutilizando o layout base.
- **styles.css** – layout geral, cartões de autenticação e responsividade.

## Uso
1. Abra `index.html` em um servidor estático.
2. Registre ou faça login; a sessão fica em `localStorage` (`miniapp.base.session`).
3. Use o menu de idioma para alternar entre Português, Inglês e Espanhol. A escolha é persistida.
4. Troque tema claro/escuro ou siga o sistema. Logos são atualizados automaticamente.
5. Use o menu de usuário para acessar o perfil ou alternar entre contas registradas.

## Pacotes base
- `packages/base.i18n`: resolve textos (`t`) e persiste o idioma.
- `packages/base.theme`: aplica tokens de tema e respeita `prefers-color-scheme`.
- `packages/base.security`: autenticação local com múltiplos usuários e perfis `owner`/`member`.

## Testes
Execute `npx playwright test` para rodar o smoke test em `tests/e2e/miniapp_base_shell.spec.ts`.
