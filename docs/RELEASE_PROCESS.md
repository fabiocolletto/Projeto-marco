# Processo de Release

1. Confirme que todas as issues vinculadas ao milestone estão concluídas.
2. Atualize `CHANGELOG.md` com as entradas de features/fixes seguindo Keep a Changelog.
3. Ajuste `package.json` com o novo número SemVer (`major.minor.patch`).
4. Rode localmente: `npm run lint`, `npm run schema:check`, `npm run test:e2e`, `npm run lighthouse:ci`.
5. Abra PR `chore(release): vX.Y.Z` usando o template padrão e peça aprovação dos CODEOWNERS.
6. Após merge, dispare o workflow `release.yml` via `workflow_dispatch` selecionando o tipo (patch/minor/major).
7. O workflow criará tag anotada `vX.Y.Z` e atualizará `CHANGELOG.md`. Não force push após a tag.
8. Monitorar `pages.yml` e `lighthouse.yml` para garantir publicação e métricas saudáveis.
