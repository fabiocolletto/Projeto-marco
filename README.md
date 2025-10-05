# Sistema Operacional Marco

Protótipo navegável do **AppBase Marco** pronto para ser aberto diretamente em um
navegador moderno sem build. A versão R1.0 consolida o shell completo com AppBar,
rail de etiquetas, palco de painéis e overlay de login, agora organizado em
arquivos dedicados dentro de `appbase/`.

## Estrutura do repositório

```
.
├── appbase/
│   ├── index.html            # Shell do AppBase + painel de controle
│   ├── app.css               # Tokens `--ac-*` e componentes visuais
│   └── app.js                # Interações (painéis, toggles, overlay, exportação)
├── assets/                   # Logos e imagens utilizadas pelo protótipo
├── index.html                # Redirecionamento (GitHub Pages)
├── src/                      # Versão anterior do protótipo modular
├── MARCO_BLUEPRINT.md        # Blueprint consolidado do AppBase
├── README.md                 # Este documento
└── agent.md                  # Diretrizes operacionais para contribuições
```

A pasta `src/` preserva o protótipo completo com mini-apps dinâmicos utilizado
nas versões anteriores. A nova pasta `appbase/` foca no shell estático de
referência descrito na especificação Visual & Interação — R1.0.

## Como executar

1. Clone ou baixe este repositório.
2. Abra `appbase/index.html` em um navegador (Chrome, Edge, Firefox ou Safari).
   - O `index.html` na raiz redireciona automaticamente para essa versão.
   - Se precisar da versão legada modular, abra `src/index.html` diretamente.
3. Interaja com as etiquetas no rail para alternar os painéis do palco.
4. Utilize os toggles de Sync/Backup, exporte a tabela de eventos em CSV e abra o
   overlay de login para testar o fluxo completo.

## Destaques da versão AppBase R1.0

- **Layout 100vh** com AppBar fixa, rail de 280px e palco central rolável.
- **Toggles coloridos** (verde/vermelho) sincronizados com os indicadores do
  rail, registrando stubs `sync/toggle` e `backup/toggle`.
- **Tabela de eventos** com header sticky, ordenação por coluna e exportação CSV
  (`eventos.csv`).
- **Overlay de login** com campos Nome/E-mail/Telefone, lista de dispositivos e
  ações que disparam os stubs (`auth/login/open`, `auth/login/save`,
  `auth/session/logout`, `devices/disconnect`).
- **Acessibilidade**: botões reais, `aria-pressed` nos toggles, overlay com
  `role="dialog"`, foco gerenciado e fechamento via `Esc` ou backdrop.

## Próximos passos sugeridos

- Integrar dados reais ao painel de controle utilizando os stubs definidos.
- Expandir os placeholders de Marketplace e Configurações com mini-apps reais.
- Harmonizar o visual do protótipo completo (`src/`) com os novos tokens `ac-*`
  para facilitar a evolução unificada.
