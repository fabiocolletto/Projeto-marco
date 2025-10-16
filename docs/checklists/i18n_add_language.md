# Checklist — Adicionar idioma

- [ ] Criar `appbase/i18n/<lang>.json` seguindo `i18n.schema.json`.
- [ ] Atualizar `docs/README_appbase.md` (tabela de idiomas).
- [ ] Atualizar matriz de testes (`tests/src-localization.spec.js`).
- [ ] Rodar `npm run schema:check`.
- [ ] Rodar `npm run i18n:parity`.
- [ ] Atualizar `CHANGELOG.md`.
- [ ] PR `feat(i18n): add <lang>` aprovado por **Schema Owner**.
