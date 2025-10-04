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

## Testes visuais

Execute os cenários automatizados de interface com:

```bash
npm run test:visual
```

O spec principal [`tests/visual/app-base.spec.ts`](tests/visual/app-base.spec.ts) cobre a navegação entre verticais (incluindo mudança de query string), além do subcenário completo da vertical de eventos — capturando estados **Pronto**, **Edição**, **Salvando** e validando KPIs/responsividade. As imagens ficam anexadas ao relatório do Playwright em `test-results/` (ignorado pelo Git), evitando binários no repositório.
