# Checklist — Evolução de schema (breaking)

- [ ] Criar nova versão do schema (`appbase/schemas`) com `$id`/`$schema` atualizados.
- [ ] Documentar breaking change e migração em `docs/GOVERNANCE.md` e `CHANGELOG.md`.
- [ ] Criar camada de compatibilidade/migração (`tooling/migrate-*.js`).
- [ ] Atualizar consumidores internos (runtime, tests).
- [ ] Executar `npm run schema:check` e `npm run test:e2e` completos.
- [ ] Executar `npm run lighthouse:ci` para garantir não regressão.
- [ ] Planejar release major (`release.yml`).
