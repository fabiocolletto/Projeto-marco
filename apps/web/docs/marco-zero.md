# Marco zero — AppBase sem mini-app

## Contexto atual

- O widget exportado representa apenas o shell institucional (header, navegação lateral e canvas vazio).
- Nenhum mini-app é carregado por padrão; o host permanece no estado de boas-vindas e exibe a mensagem "Selecione um mini-app para continuar.".
- Os eventos `app-base:register-manifest` e `app-base:request-module` estão disponíveis para futuras integrações, mas a `manifestRegistry` inicia vazia.

## Dependências obrigatórias

1. **Build do widget** — `npm run build:widget` gera `dist/app-base-widget.html`, `apps/web/dist/app-base-widget.css` e `apps/web/dist/app-base-widget.js`.
2. **WordPress com Elementor** — necessário para inserir o trecho HTML em uma página ou template.
3. **Permissão para scripts personalizados** — o Elementor precisa aceitar `<script type="module">` dentro do widget HTML (verificar política de segurança do site). Caso contrário, incorporar via `<iframe src=".../app-base-widget.html">`.

## Checklist de carregamento no WordPress

1. **Gerar o HTML** — executar `npm run build:widget` e garantir que `dist/app-base-widget.html` foi atualizado na branch atual.
2. **Incorporar no Elementor** — colar o conteúdo entre `<body>...</body>` em um widget HTML ou apontar um `<iframe>` para o arquivo hospedado.
3. **Carregamento do shell** — publicar a página, recarregar no navegador limpo e confirmar:
   - Header e navegação institucional renderizados sem mensagens de erro no console.
   - Placeholder do canvas exibindo o texto padrão do AppHost.
   - Ausência de solicitações de rede 404 para `manifest/active.json` (nenhum mini-app ativo).
4. **Evidência visual** — capturar uma screenshot manual ou via Playwright apontando para a URL do WordPress. Validar que o layout ocupa 100% da largura disponível e que o canvas está vazio.
5. **Logs futuros** — documentar qualquer script extra adicionado para registrar manifests quando mini-apps forem liberados.
