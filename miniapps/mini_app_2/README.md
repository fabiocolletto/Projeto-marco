# Mini-app 2

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
