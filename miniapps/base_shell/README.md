# MiniApp Base Shell

Shell responsivo com cabeçalho, barra lateral recolhível e painel central expansível. Entrega recursos fundamentais para miniaplicativos: internacionalização triádica (pt-BR, en-US, es-419), troca de tema (claro/escuro/sistema) e autenticação local multiusuário.

## Estrutura
- **app.js** – inicia o shell, carrega i18n/tema, sincroniza usuário atual e trata menus.
- **REVISION_LOG.md** – registro numerado das revisões do shell, referenciado no rodapé.
- **i18n/** – dicionários de idioma.
- **auth/** – páginas de login, registro e perfil reutilizando o layout base.
- **styles.css** – layout geral, cartões de autenticação e responsividade.

## Uso
1. No diretório raiz do repositório execute `npm run dev` para iniciar um servidor estático apontando para este miniapp.
   - Por padrão o servidor sobe em `http://localhost:4173` e garante acesso aos pacotes compartilhados em `packages/`.
   - Você também pode indicar outro miniapp com `npm run dev -- nome_da_pasta`.
2. Registre ou faça login; a sessão fica em `localStorage` (`miniapp.base.session`).
3. Use o menu de idioma no cabeçalho para alternar entre Português, Inglês e Espanhol. A escolha é persistida.
4. Troque tema claro/escuro pelo mesmo menu e observe a atualização automática das logos.
5. Use o menu de usuário para acessar o painel e gerenciar contas registradas.
6. Acesse o item “Mini-apps” na barra lateral para abrir o catálogo, selecione “Mini-app 1” ou “Mini-app 2” e visualize o skeleton correspondente enquanto o conteúdo é carregado.

### Verificação visual rápida
Após subir o servidor de desenvolvimento, abra `http://localhost:4173/` em um navegador.
Você deve visualizar:

- **Cabeçalho fixo** com logotipo, botão do usuário e dropdown contendo idioma, tema e atalhos da conta.
- **Barra lateral recolhível** contendo os atalhos “Dashboard”, “Autenticação” e “Mini-apps” (catálogo).
- **Painel principal** com cartões de entrada para login/registro, skeleton do catálogo de mini-apps e, após autenticação, o conteúdo da área logada.

Se algum desses elementos não aparecer, confirme se os assets estão sendo servidos a partir do diretório raiz do repositório (especialmente os pacotes em `packages/`).

## Pacotes base
- `packages/base.i18n`: resolve textos (`t`) e persiste o idioma.
- `packages/base.theme`: aplica tokens de tema e respeita `prefers-color-scheme`.
- `packages/base.security`: autenticação local com múltiplos usuários e perfis `owner`/`member`.

## Testes
Execute `npx playwright test` para rodar o smoke test em `tests/e2e/miniapp_base_shell.spec.ts`.

### Validação visual
- Suba o servidor com `npm run dev` e abra `http://localhost:4173/` em tela cheia.
- Confirme que o rodapé exibe a revisão atual e o link para `REVISION_LOG.md`.
- Garanta que o menu do usuário, o alternador de idioma e o alternador de tema respondem a interações com mouse e teclado.
- Abra o item “Mini-apps” e valide que o painel exibe skeletons nomeados “Mini-app 1” e “Mini-app 2” antes de carregar o conteúdo remoto.
- Clique em “Mini-app 1” e “Mini-app 2” para confirmar que o painel central alterna entre os placeholders corretos e mantém a navegação disponível pelo menu lateral.
