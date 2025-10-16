# Governança miniApp-base

## Papéis

- **Owner** — Define roadmap, aprova majors e releases.
- **Schema Owner** — Responsável por contratos (`appbase/schemas`), deprecações e migrações.
- **QA Owner** — Mantém Playwright e Lighthouse, aprova resultados de CI.
- **Docs Owner** — Garante consistência de `docs/`, checklists e release notes.

## Fluxo de revisão

1. Todo PR deve ter ao menos 1 aprovação do CODEOWNER afetado.
2. Alterações de schema exigem aprovação adicional do **Schema Owner**.
3. Breaking changes precisam de plano de migração documentado (`OPERATIONS.md`).
4. Releases são coordenadas pelo **Owner** via workflow `release.yml`.

## Branches

- `miniApp-base` — branch estável; apenas merges via PR.
- `feature/<escopo>-<slug>` — branches de desenvolvimento.
- Tags `vX.Y.Z` — publicadas pelo workflow `release.yml`.

## Deprecações

Registrar APIs/miniapps em deprecação neste documento incluindo prazo e substituição.

| Item | Data de anúncio | Remoção planejada | Substituição |
| ---- | --------------- | ----------------- | ------------ |
| _N/A_ | - | - | - |

## Reuniões de governança

- **Mensal**: Revisão de roadmap e riscos.
- **A cada release**: Retro breve sobre execução dos checklists.
