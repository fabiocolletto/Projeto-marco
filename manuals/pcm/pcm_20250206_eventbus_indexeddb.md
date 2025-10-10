---
Versão: O0.1
Data: 2025-02-06
Status: proposto
Escopo: Auditoria da instalação do EventBus e persistência IndexedDB no MiniApp Base
---
# PCM — Verificação do EventBus e IndexedDB no AppBase

## 1) Contexto
- Relato de usuário aponta que, após login e recarregamento da página, os dados persistidos não reapareceram.
- Há dúvida se o EventBus exposto pelo AppBase e a camada de persistência IndexedDB estão instalados corretamente no miniapp Base.
- Falta plano de validação explícito que cubra a reexecução do boot após refresh e a migração `localStorage → IndexedDB`.

## 2) Proposta
- Realizar auditoria do fluxo de boot em `appbase/app.js`, garantindo que o EventBus exportado em `appbase/runtime/bus.js` esteja registrado e disponível para os miniapps.
- Revisar `appbase/storage/indexeddb.js` para confirmar criação do object store `marco-appbase/state`, fallback e replay de estado ao recarregar o shell.
- Criar checklist de QA e testes automatizados (Playwright) que validem persistência pós-refresh e publicação de eventos essenciais (`app:boot:ready`, `app:user:updated`).
- Documentar as dependências na seção de persistência do manual operacional, destacando passos de diagnóstico em caso de falha.

## 3) Impactos
- **UX/UI:** Garante que o painel retome dados do usuário após reload, evitando formulário vazio.
- **Dados/compatibilidade:** Verifica migração transparente entre IndexedDB e `localStorage`, prevenindo perda de estado.
- **Integrações/segurança:** Sem impacto externo; reforça isolamento local.
- **Desempenho/custos:** Impacto mínimo; auditoria e testes adicionam passos de QA, sem novos serviços.

## 4) Decisão (texto final para o RAP)
Agendar auditoria da persistência IndexedDB e do EventBus do AppBase, com reforço de testes Playwright e atualização da documentação operacional para cobrir diagnóstico pós-refresh.

## 5) Trigger de reversão
- Persistência ou boot passam a falhar em navegadores suportados (Chrome/Firefox/Edge) após as alterações.
- Regressão em login, histórico ou contadores auditáveis do painel.

## 6) Testes/QA (critérios de aceite)
- Executar `npm test` garantindo cenários de login e refresh com dados reaparecendo.
- Validar manualmente em desktop: login, reload e verificação do histórico de eventos via painel.
- Confirmar no DevTools que o object store `marco-appbase/state` contém o registro do usuário após refresh.

## 7) Docs afetados
- `manuals/appbase-operacional.md` — seção de persistência e diagnóstico.
- Plano de testes (`manuals/modelo_testes_R1.0.md` como referência) caso novos cenários sejam formalizados.

## Changelog
- O0.1: Proposta inicial da auditoria do EventBus e IndexedDB.
