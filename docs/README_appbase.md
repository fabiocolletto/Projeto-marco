# miniApp-base — Operações do Host

Este documento centraliza os fluxos operacionais recorrentes do host miniApp-base. Ele complementa o `README.md` raiz com detalhes sobre idiomas suportados, registro de miniapps e validações obrigatórias no CI.

## Idiomas suportados

| Código | Nome | Status |
| ------ | ---- | ------ |
| pt-BR  | Português (Brasil) | ✅ Ativo |
| en-US  | English (US) | ✅ Ativo |
| es-ES | Español (España) | ✅ Ativo |

Para adicionar novos idiomas siga o runbook em [`checklists/i18n_add_language.md`](checklists/i18n_add_language.md) e valide com o comando `npm run schema:check`.

## Registro de miniapps

O menu do host é definido em `appbase/registry/miniapps.json`. Cada entrada deve ser compatível com [`miniapps.schema.json`](../appbase/schemas/miniapps.schema.json) e inclui intents de eventos suportados. Antes de criar um PR:

1. Valide o schema com `npm run schema:check`.
2. Execute o smoke test E2E: `npm run test:e2e:smoke`.
3. Atualize a checklist [`checklists/registry_add_miniapp.md`](checklists/registry_add_miniapp.md) marcando o fluxo.

## Contratos e paridade

Os contratos formais residem em `appbase/schemas`. Alterações exigem revisão do **Schema Owner** e atualização do `CHANGELOG.md`. A paridade mínima de chaves i18n é checada automaticamente pelo script `npm run i18n:parity`.

## CI obrigatório

| Workflow | Quando roda | O que valida |
| -------- | ----------- | ------------ |
| `lint.yml` | push/PR | ESLint com regras básicas ES2021. |
| `schema-check.yml` | push/PR que toca schemas/i18n | AJV + paridade de chaves. |
| `e2e-smoke.yml` | push/PR | Playwright com marcação `@smoke`. |
| `lighthouse.yml` | PRs sensíveis + semanal | Checks de performance/acessibilidade via script `lighthouse:ci`. |
| `docs-check.yml` | push/PR de docs | Paridade i18n, ortografia e links internos. |
| `pages.yml` | push/PR de docs | Atualiza artefato publicado no GitHub Pages. |

Todos os PRs devem ter esses jobs em verde antes do merge.

## Referências rápidas

- [`OPERATIONS.md`](OPERATIONS.md) — Runbooks completos.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — Convenções de commits/PRs.
- [`RELEASE_PROCESS.md`](RELEASE_PROCESS.md) — Pipeline de versionamento e publicação.
