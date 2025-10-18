# Mini-app 2 (Arquivado)

> Arquivado em 2025-10-19 durante a limpeza do repositório para manter apenas o shell base ativo.

## Motivo do arquivamento

- O catálogo atual do shell não prevê mais entradas placeholder além do painel principal.
- Os fluxos de demonstração migraram para o histórico em `archive/2025-10/`.

## Como restaurar

1. Execute `npm run archive:restore -- --path=miniapps/mini_app_2`.
2. Reative o registro correspondente em `appbase/registry.json` se desejar expor novamente o atalho na navegação.

---

Estrutura básica do segundo mini-app, preparada para integração via shell base.

## Propósito

1. Servir como ponto de partida para os fluxos específicos deste mini-app.
2. Validar o roteamento e as traduções já previstas na navegação do shell.

## Orquestração pelo shell

- O `manifest.json` informa o identificador `mini-app-2` e a rota `/miniapps/mini_app_2/`, permitindo que o shell reconheça
  o destino ao montar o menu.
- As dependências `base.shell`, `base.theme` e `base.i18n` garantem que os estilos, strings e controles compartilhados sejam
  carregados antes deste módulo.
- Enquanto não houver funcionalidades definitivas, o shell apresenta esta tela estática como placeholder dentro do painel.
