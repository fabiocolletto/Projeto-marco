# Marco zero — AppBase sem mini-app

> ⚠️ **Atenção:** [`apps/web/src/app.html`](../src/app.html) é apenas o template do SvelteKit e não deve ser embutido diretamente no WordPress/Elementor. Use o snippet publicado em [`docs/embed/app-base-snippet.html`](../../../docs/embed/app-base-snippet.html), que aponta para `widgets/app-base/latest/` no CDN institucional. Qualquer 404 para `app-base-widget.{css,js}` indica problema de permissão ou caminho incorreto.

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
4. **Evidência visual** — capturar uma screenshot manual ou via Playwright apontando para a URL do WordPress. Validar que o layout ocupa 100% da largura disponível e que o canvas está vazio.
5. **Logs futuros** — documentar qualquer script extra adicionado para registrar manifests quando mini-apps forem liberados.
