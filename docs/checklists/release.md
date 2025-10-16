# Checklist — Release

- [ ] Confirmar milestone concluído.
- [ ] Atualizar versão em `package.json` e `CHANGELOG.md`.
- [ ] Validar CI local (`lint`, `schema:check`, `test:e2e`, `lighthouse:ci`).
- [ ] Revisar segurança (dependências críticas) com **Security Champion**.
- [ ] Garantir documentação atualizada (`docs/`, checklists, runbooks).
- [ ] Executar workflow `release.yml`.
- [ ] Validar publicação (`pages.yml`) e comunicar stakeholders.
