# Projeto Marco

O Projeto Marco entrou na Fase PWA. Nesta etapa o foco está em manter o shell web instalável, acessível e pronto para evoluir
para os aplicativos nativos planejados para a Fase 2.

## Visão geral
- Shell web servindo como hub de miniapps, com suporte offline via Service Worker e manifest.
- Estrutura unificada que centraliza assets compartilhados, políticas e documentação pública.
- Placeholders para Android/iOS permanecerão até a próxima fase.

## Estrutura de pastas
```
/apps
  /web              # Shell PWA principal
  /android          # Placeholder Fase 2
  /ios              # Placeholder Fase 2
/shared             # Assets compartilhados (ícones, marcas, fontes)
/policies           # Termos e políticas públicos
/docs               # Saída publicada no GitHub Pages
```

Consulte também [`agente.md`](agente.md) para o guia operacional do repositório.

## Executando localmente
1. Instale as dependências se necessário: `npm install`.
2. Inicie um servidor estático apontando para `apps/web`:
   ```bash
   npx serve apps/web
   ```
3. Acesse `http://localhost:3000/apps/web/` (ou a URL exibida) e valide que o PWA é instalável.

## Publicação
O deploy é feito por GitHub Pages utilizando o workflow [`deploy-pages.yml`](.github/workflows/deploy-pages.yml). A pipeline:
1. Copia `apps/web`, `shared` e `policies` para `docs/`.
2. Publica o artefato com `actions/deploy-pages@v4`.

Após o merge na `main`, confirme no painel do repositório que o Pages está configurado como **GitHub Actions** e que a URL está
atualizada neste arquivo.

## Checklist PWA
- Manifest (`apps/web/manifest.json`) referencia ícones locais, tema `#E9C182` e start URL `./`.
- Service Worker (`apps/web/sw.js`) em cache com fallback offline.
- Ícone maskable presente (`apps/web/icons/icon-512-maskable.png`).
- Cabeçalho fixo sem sobrepor o conteúdo principal.
- Links do rodapé apontam para `policies/privacy.pt-BR.md` e `policies/terms.pt-BR.md`.
- Lighthouse PWA ≥ 90 (anexar resultado ao PR).

## CHANGELOG obrigatório
Toda alteração deve atualizar [`CHANGELOG.md`](CHANGELOG.md) seguindo SemVer `v0.x.y`. PRs sem atualização do changelog serão
bloqueados pelo workflow de guarda.

## Roadmap Fase 2
- **Android** (`apps/android`): publicação planejada na Play Store.
- **iOS** (`apps/ios`): publicação planejada na App Store.
- Notificações push, integrações nativas e automações móveis serão detalhadas após a consolidação da Fase PWA.

## Testes automatizados
- Configure o Playwright com `npm install` + `npx playwright install --with-deps`.
- Execute `npm test` para validar a suíte E2E.

## Documentação complementar
- [`agente.md`](agente.md): passo a passo para agentes, incluindo leitura obrigatória do `CHANGELOG` antes de iniciar qualquer
  tarefa.
- [`SECURITY.md`](SECURITY.md) e [`OPERATIONS.md`](OPERATIONS.md) permanecem válidos para integrações e execuções manuais.
