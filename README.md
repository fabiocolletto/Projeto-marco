# Sistema Operacional Marco

Protótipo navegável do **AppBase Marco** pronto para ser aberto diretamente em um
navegador moderno sem build. A versão R1.0 consolida o shell completo com AppBar,
rail de etiquetas, palco central e miniapps carregados por vanilla JS dentro da
pasta `appbase/`, seguindo as diretrizes do blueprint visual.

## Estrutura do repositório

```
.
├── appbase/
│   ├── index.html            # Shell do AppBase + MiniApp “Painel de controle”
│   ├── app.css               # Tokens `--ac-*`, grid responsivo e overlays
│   └── app.js                # Store reativa, serviços mock, toggles e exportação
├── assets/                   # Logos e imagens utilizadas pelo protótipo
├── index.html                # Redirecionamento (GitHub Pages)
├── src/                      # Versão anterior do protótipo modular
├── MARCO_BLUEPRINT.md        # Blueprint consolidado do AppBase
├── README.md                 # Este documento
└── agent.md                  # Diretrizes operacionais para contribuições
```

A pasta `src/` preserva o protótipo modular utilizado nas primeiras iterações.
A pasta `appbase/` concentra a implementação atual do shell R1.0 com o novo
MiniApp “Painel de controle”.

## Como executar

1. Clone ou baixe este repositório.
2. Abra `appbase/index.html` em um navegador (Chrome, Edge, Firefox ou Safari).
   - O `index.html` na raiz redireciona automaticamente para essa versão.
   - Para consultar a versão legada modular, abra `src/index.html` diretamente.
3. Se nenhuma etiqueta estiver ativa o palco permanece vazio. Clique na etiqueta
   “Painel de controle” (ou use o kebab para expandir/recolher) para carregar o
   painel completo.
4. Ao iniciar, o AppBase consulta o IndexedDB local. Caso não exista um backup,
   o overlay de Login abre automaticamente para cadastrar o usuário e liberar o
   painel. Os dados salvos permanecem disponíveis entre visitas.
5. Utilize a toolbar do painel para alternar Sync/Backup e exportar a tabela de
   eventos filtrada. Abra os overlays de Login, Sync ou Backup pelos botões ⋯
   dos tiles para testar os fluxos de gerenciamento.

## MiniApp “Painel de controle” — destaques

- **Etiqueta dinâmica** com metadados opcionais (último login/sync/backup) e dots
  conectados ao estado global (`syncOn`, `backupOn`, `conexao`).
- **Palco em tela cheia** sem painel direito, com cabeçalho azul, subtítulo e
  toolbar de pills coloridas (verde ON, vermelho OFF) sincronizadas entre o rail
  e os overlays.
- **Grid responsivo** (12 colunas quebrando para 1 coluna < 900px) com os tiles:
  Login, Sincronização, Backup, Conectividade, Segurança e Eventos, todos em
  pt-BR e sem placeholders quando o valor é vazio.
- **Tabela de eventos** com filtro live, filtro por tipo, ordenação por coluna,
  cabeçalho sticky, hover, rolagem vertical e exportação CSV baseada no DOM
  filtrado.
- **Overlays acessíveis** (`role="dialog"`, `aria-modal`, foco gerenciado,
  fechamento por Esc/backdrop) para Login, Sync e Backup, cada um refletindo o
  estado atual do store (toggles, dispositivos, histórico) e disparando eventos
  na telemetria local.
- **Backup local persistente** gravado no IndexedDB: cadastro de usuário,
  configurações de sync/backup e histórico são reaplicados ao reabrir o
  aplicativo, que também sinaliza quando ainda não existe documento salvo.
- **Camada de serviço mock** que expõe os contratos REST (GET/PUT/DELETE)
  esperados. As ações retornam Promises, atualizam a store e registram eventos
  (`Sync`, `Backup`, `Login`) com timestamps em `pt-BR`.
- **Arquitetura montável**: o miniapp exporta `window.PainelMiniApp.mount` e
  `unmount`, permitindo que o shell principal carregue/descadastre o módulo sem
  vazamentos de listener.
- **Acessibilidade**: `aria-current` na etiqueta ativa, `aria-pressed` nas pills,
  foco visível e navegação por teclado em rail, painel, tabelas e overlays.

## Próximos passos sugeridos

- Conectar os serviços mock aos endpoints reais descritos na especificação.
- Persistir os eventos exportados no backend para rastreabilidade completa.
- Expandir o shell para carregar múltiplos miniapps montando/desmontando via
  `window.PainelMiniApp` conforme o rail evoluir.
