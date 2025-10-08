---
Versão: R1.0
Data: 2025-10-08
Status: aprovado
Escopo: Guia/Modelo para testes (unit/E2E/contrato)
---
# Modelo — Testes (unit/E2E/contrato)

## Estratégia
- Testes unitários para funções puras/utilitários.
- Testes E2E para fluxos críticos (Playwright).
- Testes de contrato para integrações (mocks/fixtures).

## Mínimos obrigatórios
- AppBase abre e carrega `_base/*` (smoke).
- MiniApp novo possui ao menos 1 E2E cobrindo seu happy path.
- Link-check dos manuais sem quebras.

## Estrutura sugerida
```
tests/
  e2e/
    appbase.smoke.spec.ts
    <miniapp>.spec.ts
  unit/
    <area>.spec.ts
  fixtures/
```

## Métricas
- Cobertura mínima a definir por PCM.
- INP/TTFI sob orçamento.



## Changelog
- O0.1: Modelo de testes criado (unit/E2E/contrato).
