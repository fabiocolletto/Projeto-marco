# Marco zero — AppBase sem mini-app

> ⚠️ **Atenção:** [`apps/web/src/app.html`](../src/app.html) é apenas o template do SvelteKit e não deve ser embutido diretamente no WordPress/Elementor. Somente o snippet hospedado em [`docs/embed/app-base-snippet.html`](../../../docs/embed/app-base-snippet.html) é suportado; ele aponta para `widgets/app-base/latest/` no CDN institucional. Qualquer 404 para `app-base-widget.{css,js}` indica problema de permissão ou caminho incorreto.

### Fluxo contínuo de publicação

1. **Merge na `main`** — integre suas alterações na branch principal para acionar o workflow `Deploy AppBase`.
2. **Workflow automático** — o GitHub Actions empacota o host e publica `app-base-widget.{css,js}` no caminho `widgets/app-base/latest/` do CDN.
3. **Snippet hospedado** — como o Elementor carrega [`app-base-snippet.html`](../../../docs/embed/app-base-snippet.html) diretamente do repositório/CDN, a página atualiza sozinha assim que o deploy finaliza, sem colar `app.html`.

Checklist rápido antes de publicar:

- [ ] Confirme que o HTML embutido corresponde ao snippet oficial e contém o `<link rel="stylesheet">`, o `<div id="app-base-widget-root">` e o `<script type="module">` apontando para o CDN.


## Contexto atual

- O widget exportado representa apenas o shell institucional (header, navegação lateral e canvas vazio).
- Nenhum mini-app é carregado por padrão; o host permanece no estado de boas-vindas e exibe a mensagem "Selecione um mini-app para continuar.".
- Os eventos `app-base:register-manifest` e `app-base:request-module` estão disponíveis para futuras integrações, mas a `manifestRegistry` inicia vazia.

## Dependências obrigatórias

1. **Snippet CDN ativo** — garantir acesso ao endpoint `https://cdn.5horas.app/widgets/app-base/latest/` (ou domínio equivalente usado pelo time).
2. **WordPress com Elementor** — necessário para inserir o trecho HTML em uma página ou template.
3. **Permissão para scripts personalizados** — o Elementor precisa aceitar `<script type="module">` dentro do widget HTML (verificar política de segurança do site). Caso contrário, incorporar via `<iframe src=".../app-base-widget.html">`.

## Checklist de carregamento no WordPress

1. **Selecionar o snippet** — copie [`docs/embed/app-base-snippet.html`](../../../docs/embed/app-base-snippet.html) ou referencie-o diretamente no Elementor.
2. **Incorporar no Elementor** — adicione um widget HTML personalizado e cole o snippet. Verifique se o WordPress permite `<script type="module">`.
3. **Carregamento do shell** — publicar a página, recarregar no navegador limpo e confirmar:
   - Header e navegação institucional renderizados sem mensagens de erro no console.
   - Placeholder do canvas exibindo o texto padrão do AppHost.
   - Ausência de solicitações de rede 404 para `app-base-widget.{css,js}` e `manifest/active.json` (nenhum mini-app ativo).
4. **Checklist pós-deploy** — após o merge e o workflow, abra a página Elementor publicada, inspecione o console (sem erros 404) e capture uma screenshot para anexar ao ticket/PR.
5. **Validação Playwright** — assim que o comando dedicado estiver disponível (planejado como `npm run test:marco-zero`), execute-o para capturar evidências automatizadas do "marco 0".
6. **Logs futuros** — documentar qualquer script extra adicionado para registrar manifests quando mini-apps forem liberados.
