# Mini-app 1

Esqueleto mínimo do primeiro mini-app. Ele será carregado pelo shell base e usa os recursos compartilhados
para manter a identidade visual e os textos exibidos nas traduções já disponíveis.

## Propósito

1. Demonstrar como um mini-app pode ser descrito pelo `manifest.json`.
2. Fornecer uma página estática simples para testes de roteamento enquanto o desenvolvimento real não começa.

## Orquestração pelo shell

- O `manifest.json` registra o identificador `mini-app-1`, a rota `/miniapps/mini_app_1/` e as dependências básicas
  (`base.shell`, `base.theme`, `base.i18n`).
- O shell base lê o registro e adiciona este mini-app ao menu lateral, apresentando os textos definidos no dicionário.
- Ao navegar pelo shell, esta página serve de placeholder até que componentes dinâmicos sejam implementados.
