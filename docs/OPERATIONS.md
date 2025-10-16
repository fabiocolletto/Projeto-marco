# Operações miniApp-base

Este runbook descreve fluxos repetíveis para manter o host miniApp-base. Cada seção referencia checklists formais localizadas em `docs/checklists`.

## A) Adicionar novo idioma

1. Gere o arquivo `appbase/i18n/<lang>.json` tomando como base `pt-BR`.
2. Atualize a matriz de testes Playwright (`tests/src-localization.spec.js`) adicionando o idioma.
3. Rode `npm run schema:check` e `npm run i18n:parity`.
4. Atualize `docs/README_appbase.md` com a linha da tabela de idiomas.
5. Preencha a checklist [`checklists/i18n_add_language.md`](checklists/i18n_add_language.md).
6. Crie PR com título `feat(i18n): add <lang>`.

## B) Adicionar miniapp ao menu

1. Edite `appbase/registry/miniapps.json` adicionando o novo miniapp com intents de evento.
2. Garanta que o objeto atende a [`miniapps.schema.json`](../appbase/schemas/miniapps.schema.json).
3. Rode `npm run schema:check`.
4. Execute `npm run test:e2e:smoke` validando handshake, sandbox e intents.
5. Inclua ícone em `assets/brand/<miniapp>.svg` quando aplicável.
6. Atualize [`checklists/registry_add_miniapp.md`](checklists/registry_add_miniapp.md) marcando as etapas.
7. Abra PR com título `feat(registry): add <miniapp-id>`.

## C) Evoluir contrato (schema major)

1. Crie nova versão do schema em `appbase/schemas` com `$id` e `$schema` atualizados.
2. Escreva guia de migração em `docs/CHANGELOG.md` e `docs/GOVERNANCE.md` (seção Deprecações).
3. Prover camada de compatibilidade em `tooling` (scripts `migrate-*`).
4. Execute `npm run schema:check`, `npm run test:e2e` e `npm run lighthouse:ci`.
5. Solicite aprovação do **Schema Owner** e **Owner**.
6. Faça PR `feat(schema): vX -> vY (breaking)` marcando a opção de breaking change no template.
7. Execute o checklist [`checklists/schema_evolution.md`](checklists/schema_evolution.md).

## D) Processo de release

1. Atualize versão no `package.json` e docs relevantes seguindo [`RELEASE_PROCESS.md`](RELEASE_PROCESS.md).
2. Garanta que o `CHANGELOG.md` está atualizado.
3. Rode toda a suíte de workflows localmente quando possível.
4. Acione `release.yml` via `workflow_dispatch` selecionando `patch|minor|major`.
5. Após a tag, valide Pages (`pages.yml`) e comunique canais internos.
