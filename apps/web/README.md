# Web — App Host

Interface Svelte que orquestra as verticais de gestão de eventos dentro do AppBase.

## Setup rápido

```bash
npm install
npm run dev
```

O host fica disponível em `http://localhost:5173/` (ou `4173` durante os testes). Utilize a query `?app=<id>` para abrir uma vertical específica.

## Como registrar uma nova vertical

1. **Manifesto**: adicione a entrada em [`src/lib/appHost/manifest.config.json`](src/lib/appHost/manifest.config.json).
2. **Tipos**: inclua o novo identificador na união `AppId` em [`src/lib/appHost/types.ts`](src/lib/appHost/types.ts).
3. **Implementação**:
   - Verticais locais podem viver em `src/lib/appHost/verticals/`. Use `placeholder.svelte` como base quando ainda não houver funcionalidade.
   - Se o loader apontar para um pacote (`@marco/*`), garanta que o workspace correspondente exporte um componente Svelte padrão.
4. **Design-system**:
   - Labels devem seguir Title Case e ícones aprovados pelo time de UI (normalmente emojis até a biblioteca definitiva).
   - Respeite o grid fornecido pelo `AppBaseLayout`; evite redefinir tipografia/cores fora dos tokens globais.
   - Caso a vertical exija loading próprio, mantenha a mensagem principal no componente e deixe o host controlar o skeleton padrão.
5. **Rotas**: confirme que `/?app=<id>` redireciona corretamente e que a navegação lateral mantém o estado ativo.

## Testes

- `npm run test:unit` — cobre utilidades do host (merge de manifesto, fallback de navegação e tratamento de loaders).
- `npm run test:visual` — executa [`tests/visual/app-base.spec.ts`](../../tests/visual/app-base.spec.ts) alternando entre verticais e rodando o fluxo completo da vertical de eventos.

## Empacotamento

`npm run package` gera os artefatos no diretório `artifacts/`:

- `web.tar.gz` com o build completo.
- `web-<id>.tar.gz` para cada vertical, contendo um `manifest/active.json` com os metadados utilizados pelo host.
