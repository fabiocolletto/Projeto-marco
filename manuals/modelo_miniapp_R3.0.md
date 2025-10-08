---
Versão: R3.0
Data: 2025-10-08
Status: aprovado
Escopo: Modelo obrigatório para criação de MiniApp
---
# Modelo — MiniApp (R3.0)

> Copie este arquivo para `manuals/<nome>_R3.x.md` ao iniciar um MiniApp.

## 1) Contexto e objetivo
- Problema que resolve, público, resultado esperado.

## 2) Estrutura no repositório
```
miniapps/<nome>/
  manifest.json
  index.js|ts
  index.html|css (se necessário)
  assets/
  tests/
```

## 3) Manifest (exemplo mínimo)
```json
{
  "id": "<org>.<nome>",
  "name": "<Nome do MiniApp>",
  "version": "1.0.0",
  "description": "<descrição curta>",
  "loadOrder": 20,
  "permissions": ["network","storage"],
  "dependsOn": ["base.theme","base.i18n","base.security","base.sync","base.logs"]
}
```

## 4) Contratos (MarcoBus/MarcoStore)
- Eventos públicos que o MiniApp emite/ouve.
- Estrutura de estado persistente (chaves no `MarcoStore`).

## 5) Acessibilidade
- Foco, rótulos, contraste, `aria-live` quando necessário.

## 6) Integrações externas
- Endpoints, auth, limites de taxa, formato de payload.

## 7) Critérios de aceite (QA)
- Fluxo principal funcional (happy path).
- Estados de erro previstos e mensagens úteis.
- Testes E2E cobrindo pelo menos 1 cenário crítico.

## 8) Telemetria
- Eventos mínimos (view, action, error) encaminhados ao `_base/logs`.



## Changelog
- O0.1: Modelo canônico de MiniApp (estrutura, manifest, QA, telemetria).
