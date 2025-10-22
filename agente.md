# agente.md — Projeto Marco (R1, simplificado)

Princípios:
- Branches: `main` (produção/Pages), `staging` (preview).
- Sem segredos no repo; integrações via Make.com.
- AppBase centraliza **i18n** e **CSS**.
- MiniApps **não** podem ter CSS próprio.

Tarefas do Codex:
1) Proteger `main` e `staging` com checks (`ci` e `pages/preview`).
2) Garantir estrutura no repo igual a este pacote.
3) Ativar Pages em `main` (diretório `/`) e executar workflows.
4) Confirmar que o CI passa (proíbe CSS em MiniApps).
5) Abrir PR `staging` → `main` e reportar a URL do Pages.

Contrato de MiniApps:
- Entregar: `manifest.json`, `i18n-snippet.json`, `app.html` (HTML puro).
- Namespace i18n: `miniapps.<id>.*` (PT/EN/ES).
- CSS: usar utilitários/componentes do AppBase e tokens `--ac-*` (sem CSS próprio).
