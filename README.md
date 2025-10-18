# Projeto Marco — Plataforma AppBase (R1)

Infraestrutura inicial para o Recorte 1 (R1) da plataforma AppBase, responsável por consolidar a shell compartilhada, catálogo único de MiniApps e preferências essenciais de idioma/tema.

## Objetivos deste recorte

- Detectar idioma e tema no primeiro boot, aplicando fallback global `pt-BR` e registrando oportunidades de tradução (`idioma_nao_suportado`).
- Persistir preferências (idioma, tema, seguir sistema) no perfil principal, com suporte a sincronização futura.
- Organizar o catálogo (`registry.json`) com visibilidade diferenciada entre administradores e usuários finais.
- Preparar telemetria local para alimentar o MiniApp Administrativo.

## Estrutura do pacote

```
src/
  core/          # Tipos compartilhados (perfil, manifestos, telemetria)
  localization/  # Detecção de idioma, fallback e tradução
  theme/         # Gestão de tema claro/escuro e observers do SO
  storage/       # Persistência local (memória, localStorage)
  telemetry/     # Cliente em memória para eventos
  registry/      # Utilidades do catálogo único de MiniApps
```

## Scripts disponíveis

- `npm run build` — compila os módulos TypeScript para `dist/`.
- `npm test` — executa a suíte de testes (`vitest`).
- `npm run test:watch` — executa os testes em modo observação.

## Próximos incrementos

1. Integrar IndexedDB e rotina de backup `.json` reaproveitando `ProfileStore`.
2. Implementar sync opcional (Google Drive / OneDrive) a partir de `SyncSettings`.
3. Expor camada de auto-save (debounce + fila offline) conectando com as `capabilities` globais do AppBase.
4. Criar scaffold para MiniApps registrando automaticamente entradas no `registry.json`.
