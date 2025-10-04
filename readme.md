# Projeto Marco

Plataforma modular para hospedar verticais de gestão de eventos. Este monorepo concentra o host web, mini-apps legados e pacotes compartilhados.

## Registro de novas verticais

1. **Declare a vertical no manifesto** em [`apps/web/src/lib/appHost/manifest.config.json`](apps/web/src/lib/appHost/manifest.config.json). Cada entrada precisa informar:
   - `id`: slug único utilizado na query `?app=<id>`.
   - `label`: texto exibido no menu lateral (use Title Case).
   - `icon`: emoji ou glifo previsto no design-system institucional.
   - `loader`: caminho para o módulo Svelte (ex.: `./verticals/placeholder.svelte` ou um pacote `@marco/*`).
   - `requires`: dependências do host (`projectData`, `bus`, `ac`).
2. **Atualize os tipos** em [`apps/web/src/lib/appHost/types.ts`](apps/web/src/lib/appHost/types.ts) para incluir o novo `AppId`. Isso mantém a checagem estática e evita ids órfãos.
3. **Mantenha a experiência consistente**:
   - O título e subtítulo do host são fixos; apenas adicione conteúdo dentro do container `app-host__canvas`.
   - Verticais que ainda não possuem implementação devem reusar [`verticals/placeholder.svelte`](apps/web/src/lib/appHost/verticals/placeholder.svelte) para seguir a copy padrão.
   - Componentes reais devem respeitar os tokens de layout e spacing herdados do `AppBaseLayout` (tipografia e espaçamentos já configurados).
4. **Rotas e navegação**: o host resolve automaticamente a rota com base na query string. Após registrar a vertical, validar `/?app=<id>` garante que o fallback da navegação esteja funcionando.

## Build e empacotamento

O script `npm run package --workspace web` agora gera:

- `artifacts/web.tar.gz`: build completo do host.
- `artifacts/web-<id>.tar.gz`: um pacote por vertical, cada qual com um `manifest/active.json` descrevendo a entrada correspondente. O processo é orquestrado por [`tools/scripts/package-verticals.mjs`](tools/scripts/package-verticals.mjs).

## AppBase no Elementor

### Copiando o HTML gerado

1. Execute `npm run build:widget` na raiz do repositório. O comando compila o bundle do widget (`apps/web/dist/app-base-widget.{css,js}`) e gera o arquivo consolidado [`dist/app-base-widget.html`](dist/app-base-widget.html).
2. Abra o arquivo HTML em um editor de texto e copie **apenas o conteúdo entre as tags `<body>...</body>`**. Esse trecho contém o container `<div id="app-base-widget-root">`, o estilo injetado e o `<script type="module">` necessário para inicializar o shell.
3. No Elementor, adicione um widget **HTML personalizado** e cole o trecho copiado. Nenhum ajuste adicional é necessário — o bundle já encapsula CSS e JavaScript.

### Arquivos a serem hospedados

- Hospede o próprio [`dist/app-base-widget.html`](dist/app-base-widget.html) em um local acessível (CDN, biblioteca de mídia do WordPress ou servidor estático). Ele é auto contido e pode ser incorporado via `<iframe>` caso a equipe prefira não colar o código manualmente.
- Preserve os artefatos gerados em `artifacts/`. Cada `web-<id>.tar.gz` contém o build da vertical e um `manifest/active.json`; eles serão publicados futuramente para liberar mini-apps individuais.

### Ativação de mini-apps

1. Publique o bundle da vertical desejada (conteúdo de `web-<id>.tar.gz`) em um endpoint público e exponha o caminho do módulo (campo `loader` do manifest) por meio de um evento `app-base:register-manifest`.
2. Ao carregar a página do Elementor, injete um script semelhante ao abaixo para registrar o manifest remoto:

   ```html
   <script>
     window.addEventListener('load', () => {
       window.dispatchEvent(
         new CustomEvent('app-base:register-manifest', {
           detail: {
             id: 'eventos',
             url: 'https://cdn.example.com/web-eventos/manifest/active.json'
           }
         })
       );
     });
   </script>
   ```

3. Sempre que o shell solicitar um módulo (`app-base:request-module`), responda com o manifest apropriado (o host dispara `app-base:module-pending` automaticamente). Assim que o JSON estiver disponível, o AppBase importará a vertical com base no `loader` informado.

## Testes visuais

Execute os cenários automatizados de interface com:

```bash
npm run test:visual
```

O spec principal [`tests/visual/app-base.spec.ts`](tests/visual/app-base.spec.ts) cobre a navegação entre verticais (incluindo mudança de query string), além do subcenário completo da vertical de eventos — capturando estados **Pronto**, **Edição**, **Salvando** e validando KPIs/responsividade. As imagens ficam anexadas ao relatório do Playwright em `test-results/` (ignorado pelo Git), evitando binários no repositório.

### Verificação visual em páginas incorporadas

- Priorize `npm run test:visual` para garantir o baseline do shell antes de exportar o widget.
- Depois de colar o HTML no Elementor, abra a página publicada e capture uma screenshot manual ou via Playwright (por exemplo, apontando o navegador para a URL do WordPress). Confirme que o header institucional, a navegação lateral e o container `app-host__canvas` renderizam sem barras de rolagem inesperadas.
- Armazene a evidência junto ao ticket ou PR correspondente para rastrear regressões de incorporação.
