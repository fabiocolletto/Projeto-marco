---
Versão: R3.0
Data: 2025-10-08
Status: aprovado
Escopo: Pacote Base obrigatório (_base/*)
---
# Pacote Base de MiniApps v3.0 (obrigatório)

## Objetivo
Fornecer runtime universal: **tema, idioma, sessão, sincronização e logs**, disponível a todos os MiniApps.

## Módulos e APIs

### 1) `_base/theme`
- Estado: `MarcoStore.ui.theme = 'light'|'dark'`
- Evento: `MarcoBus.emit('themeChanged', { theme })`

### 2) `_base/i18n`
- Estado: `MarcoStore.user.language = 'pt'|'en'|'es'|...`
- Evento: `MarcoBus.emit('languageChanged', { language })`
- Bundles: JSON por idioma; fallback para `pt`

### 3) `_base/security`
- Estados: `locked|unlocked`
- Eventos: `sessionLocked`, `sessionUnlocked`
- Políticas: PIN/senha, auto-lock por inatividade

### 4) `_base/sync`
- Conectores: Google Drive / OneDrive
- Estados: `desconectado|autenticando|conectado`
- APIs: `sync.backup()`, `sync.restore()`

### 5) `_base/logs`
- Eventos coletados: `appLoaded`, `error`, `action`
- Sink: endpoint Make → Sheets/Looker
- Privacidade: sem PII sensível

## Ordem de carregamento
Carregados **antes** de qualquer miniapp vertical.

## QA (mínimo)
- Troca de tema reflete tokens visuais.
- Troca de idioma afeta rótulos de UI.
- Lock/unlock bloqueia interação como esperado.
- Sync alterna estados e sinaliza conectores.
- Logs com pelo menos 1 evento de cada tipo na sessão.



## Changelog
- O0.1: Definição dos 5 módulos do Pacote Base v3.0, APIs e QA.
