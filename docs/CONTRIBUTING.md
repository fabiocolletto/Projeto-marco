# Contribuindo para miniApp-base

Obrigado por colaborar! Para garantir releases previsíveis siga as diretrizes abaixo.

## Fluxo de trabalho

1. Crie branch `feature/<escopo>-<slug>` partindo de `miniApp-base`.
2. Use o template de PR (`.github/pull_request_template.md`). Todos os checkboxes precisam de evidência nos comentários.
3. Aguarde 1+ aprovação de CODEOWNER e a suite de CI verde.

## Commits

Adotamos [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Exemplos válidos:

- `feat(i18n): add it locale`
- `fix(registry): ensure sandbox permissions`
- `docs(operations): add migration guide`

Commits `fixup!` ou `squash!` não entram no histórico principal; faça squash antes do merge.

## Versionamento

- Seguimos [SemVer](https://semver.org/spec/v2.0.0.html).
- Alterações em schemas que quebram compatibilidade exigem major bump e guia de migração.
- O `release.yml` gera PR automático de release. Não edite `CHANGELOG.md` manualmente nesse PR.

## Testes obrigatórios

Antes do PR rode localmente:

- `npm run lint`
- `npm run schema:check`
- `npm run i18n:parity`
- `npm run test:e2e:smoke`
- `npm run lighthouse:ci`

Documente exceções e limitação de ambiente no PR.
