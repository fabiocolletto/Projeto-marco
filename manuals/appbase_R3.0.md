---
Versão: R3.0
Data: 2025-10-08
Status: aprovado
Escopo: Shell do AppBase, boot, registry e contratos de carregamento
---
# AppBase v3.0 — Especificação Operacional

## Objetivo
Definir a arquitetura do **shell** (entrada única) e o **boot order** do AppBase, garantindo carregamento do *Pacote Base de MiniApps* antes dos miniapps verticais.

## Entradas e estrutura
- **Entrada única:** `appbase/index.html`
- **Redirecionador opcional:** `index.html` (raiz → `/appbase/`)
- **Pastas relevantes:** `miniapps/_base/*`, `miniapps/<nome>/`

## Boot order (determinístico)
1. `_base/theme` → aplica tokens globais e emite `themeChanged`
2. `_base/i18n` → define idioma, carrega bundles, emite `languageChanged`
3. `_base/security` → estado de sessão; `sessionLocked/Unlocked`
4. `_base/sync` → estados: `desconectado|autenticando|conectado`
5. `_base/logs` → telemetria mínima (load, erros, ações)
6. `miniapps/marketplace` (placeholder visível)
7. Demais `miniapps/*` conforme `manifest.json`

## Registry de MiniApps
- O AppBase varre `miniapps/**/manifest.json`.
- Respeita `dependsOn`, `loadOrder`, `permissions`.
- MiniApp incompatível: **não carrega**; loga e sinaliza na UI.

## Contratos (MarcoBus/MarcoStore)
- **MarcoBus**: eventos comuns (`themeChanged`, `languageChanged`, `sessionLocked/Unlocked`).
- **MarcoStore**: chaves mínimas
  - `ui.theme`, `user.language`, `session.state`, `sync.state`

## Acessibilidade
- Foco visível, rotulagem, `aria-live` para feedbacks de status.

## Critérios de aceite
- App abre por `appbase/index.html` (Pages/Local).
- `_base/*` carrega **antes** dos miniapps.
- Registry recusa miniapp incompatível com mensagem clara.
- Testes de smoke E2E passam em CI.



## Changelog
- O0.1: Estrutura v3.0 definida (boot order, registry, critérios).
