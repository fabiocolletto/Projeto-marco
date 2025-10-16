# Checklist — Adicionar miniapp ao registry

- [ ] Inserir entrada em `appbase/registry/miniapps.json` com intents e metadados obrigatórios.
- [ ] Validar entrada com `npm run schema:check`.
- [ ] Executar `npm run test:e2e:smoke` (handshake + sandbox).
- [ ] Adicionar ícone em `assets/brand/` (se aplicável).
- [ ] Atualizar documentação relevante (`docs/README_appbase.md`, release notes).
- [ ] PR `feat(registry): add <miniapp-id>` revisado pelo **Owner** e **QA Owner**.
