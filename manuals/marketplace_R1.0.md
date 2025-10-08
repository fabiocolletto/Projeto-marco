---
Versão: R1.0
Data: 2025-10-08
Status: em revisão
Escopo: MiniApp de catálogo/ativação (placeholder)
---
# MiniApp Marketplace — Placeholder R1.0

## Papel
Listar miniapps, permitir trial/compra/ativação e registrar licenças. **Esta versão é um placeholder**: somente presença no menu e tela “Em breve”, sem fluxo de cobrança ainda.

## Dependências obrigatórias
`_base/theme`, `_base/i18n`, `_base/security`, `_base/sync`, `_base/logs`

## Estrutura (repo)
```
miniapps/marketplace/
  manifest.json
  index.js       # placeholder
  assets/
```

## Próximos passos (fora deste placeholder)
- Fonte de catálogo (local/Make)
- Checkout PIX (Make) + webhook de confirmação
- Licenças e expiração
- Telemetria de funil (view → add → checkout → paid)



## Changelog
- O0.1: Placeholder criado e listado como miniapp essencial (sem compra).
