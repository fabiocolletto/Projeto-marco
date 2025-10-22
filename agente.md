# Guia do agente — Projeto Marco

## Contexto obrigatório
1. Antes de iniciar qualquer análise, **leia o [`CHANGELOG.md`](CHANGELOG.md)** para entender o histórico recente e confirmar a
   versão alvo (`v0.x.y`).
2. Consulte este arquivo sempre que for preparar um PR.

## Objetivo
Garantir que o shell PWA permaneça instalável, acessível e pronto para evoluções. O foco imediato é a Fase PWA — Android/iOS são
placeholders até a Fase 2.

## Checklist por PR
1. **Manifest e Service Worker:** valide `apps/web/manifest.json`, `apps/web/register-sw.js` e `apps/web/sw.js` (escopo, ícones e
   cache offline).
2. **Layout:** confirme que header e footer não sobrepõem o conteúdo (`apps/web/styles.css`).
3. **Políticas:** teste os links do rodapé (`policies/privacy.pt-BR.md` e `policies/terms.pt-BR.md`).
4. **Lighthouse:** execute a auditoria PWA (meta ≥ 90) e anexe o resultado ao PR.
5. **CHANGELOG:** incremente a versão SemVer adequada (`v0.x.y`) e registre o que foi alterado.

## Versionamento
- `v0.x.y` durante a Fase PWA.
- Incrementos **minor** para novas features, **patch** para correções.

## Estrutura a preservar
- `apps/web`: único alvo de build na Fase PWA.
- `apps/android` e `apps/ios`: mantenha como placeholders.
- `shared/` e `policies/`: centralizam assets comuns e documentos públicos.

Manter essas práticas garante que o repositório continue pronto para o deploy contínuo via GitHub Pages e prepara o terreno para
as integrações nativas na próxima fase.
