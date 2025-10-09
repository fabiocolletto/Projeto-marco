# Sistema Operacional Marco

Protótipo navegável do **AppBase Marco** pronto para ser aberto diretamente em um
navegador moderno sem build. A versão R1.4 mantém o shell completo com AppBar,
rail lateral, palco central e miniapps ativos escritos em HTML, CSS e JavaScript
vanilla na pasta `appbase/`, seguindo as diretrizes do blueprint visual.

## Arquitetura

- **Entrada única:** [`appbase/index.html`](appbase/index.html).
- **Pacote Base v3.0 (obrigatório):** `_base/theme`, `_base/i18n`, `_base/security`, `_base/sync` e `_base/logs`;
  consumido pelo [Marketplace R1.0 (placeholder)](manuals/marketplace_R1.0.md).
- **Governança:** [`manuals/`](manuals/index_R3.0.md) é **N1**; divergências exigem abertura de
  [`modelo_pcm_R1.0.md`](manuals/modelo_pcm_R1.0.md).
- **Como criar um MiniApp:** siga o modelo
  [`modelo_miniapp_R3.0.md`](manuals/modelo_miniapp_R3.0.md).

## Estrutura do repositório

```
.
├── appbase/
│   ├── index.html            # Shell do AppBase + MiniApp “Painel de controle”
│   ├── app.css               # Tokens `--ac-*`, grid responsivo e overlays
│   ├── app.js                # Controle do painel e integrações vanilla
│   ├── runtime/              # Núcleo AppBase (AppBase + event bus)
│   └── storage/              # Persistência local (IndexedDB + fallback)
├── catalog/ui-extensions.json# Catálogo atual de miniapps carregado no runtime
├── miniapps/
│   ├── boas-vindas/          # MiniApp estabilizado (versão ativa)
│   └── control_panel/        # MiniApp visual Painel de Controle R1.10
├── scripts/                  # Manifestos de dependências + utilitário de montagem
├── tests/                    # Suíte Playwright (inclui `trace-deps`)
├── manuals/                  # Manuais N1 (fluxos operacionais oficiais)
├── api/                      # Placeholder para integrações futuras
├── archive/
│   ├── 2025-10-08/           # Arquivo da limpeza R1.4 (ativos e documentação legado)
│   └── src-r0/               # Versão modular arquivada do protótipo (somente consulta)
├── .github/workflows/        # Workflows de governança e auditoria
├── index.html                # Redirecionamento (GitHub Pages)
├── MARCO_BLUEPRINT.md        # Blueprint consolidado do AppBase
├── README.md                 # Este documento
└── agent.md                  # Diretrizes operacionais para contribuições
```

> **Entrada oficial:** `appbase/index.html`

**Guia oficial de criação/execução de MiniApps: seguir [`manuals/index_R3.0.md`](manuals/index_R3.0.md).**

## Como o repositório permanece limpo

- `scripts/scan-static-deps.mjs` gera `scripts/used-static-deps.json` com todas as
  dependências estáticas referenciadas a partir de `appbase/index.html`.
- `tests/tools/trace-deps.spec.ts` roda via Playwright e exporta
  `scripts/used-runtime-deps.txt` com tudo que o AppBase baixa em runtime
  (miniapps, catálogos e dicionários).
- `scripts/build-used-deps.sh` consolida os manifests anteriores, diretórios de
  governança e arquivos obrigatórios em `scripts/used-deps.txt`. Qualquer ativo
  fora dessa lista deve ir para `archive/2025-10-08/` ou ser removido.
- `archive/2025-10-08/` registra o conteúdo deslocado na limpeza R1.4
  (miniapps legacy, assets antigos, documentação auxiliar). Pastas anteriores
  permanecem disponíveis apenas para consulta histórica.
- Workflows adicionados na R1.4:
  - `md-link-check.yml`: valida links internos de Markdown com a configuração de
    `.markdown-link-check.json`.
  - `tree-dump.yml`: publica um `TREE.txt` com a árvore de arquivos até a 3ª
    profundidade em cada push.
  - `deps-audit.yml`: reconstrói os manifests de dependências e falha se houver
    desvios não registrados em `scripts/used-*.txt`.

A pasta `appbase/` concentra a implementação atual do shell R1.4 com o novo
MiniApp “Painel de controle”. O protótipo modular legado foi movido para
`archive/src-r0/` apenas para referência e não recebe atualizações. MiniApps
ativos permanecem em `miniapps/`; versões anteriores devem ser transferidas
para `archive/miniapps/` junto com o registro em `docs/changelog.md`.

## Como executar

1. Clone ou baixe este repositório.
2. Abra `appbase/index.html` em um navegador (Chrome, Edge, Firefox ou Safari).
   - O `index.html` na raiz redireciona automaticamente para essa versão.
   - Para consultar o protótipo modular arquivado, abra
     `archive/src-r0/index.html` diretamente.
3. Ao abrir, o palco permanece vazio até que um usuário seja cadastrado. Use o
   botão “Começar cadastro” ou o atalho de usuário na AppBar (ícone 👤) para
   abrir o painel detalhado e preencher o formulário diretamente no palco.
4. Os dados cadastrados são persistidos primariamente no IndexedDB local
   (`marco-appbase/state`) com fallback automático para `localStorage`. Ao
   salvar, o painel é exibido com o nome, a conta derivada do e-mail e a data do
   último acesso, e essas informações permanecem disponíveis em visitas
   futuras.
5. Utilize o atalho de usuário na AppBar para recolher/exibir o painel quando
   houver um cadastro ativo. A edição do cadastro acontece no mesmo painel,
   bastando atualizar os campos e salvar.
6. Dentro do painel do miniapp, utilize os botões “Encerrar sessão” e “Encerrar e
   remover dados” para registrar logoff preservando ou eliminando as
   informações. O histórico de acessos exibe os eventos mais recentes de login e
   logoff logo abaixo do formulário, sinalizando a ausência de registros tanto
   na tabela quanto no estado vazio do palco.
7. Para rodar os testes de regressão, execute `npm install` seguido de `npm test`
   (a suíte Playwright valida cadastro, persistência e o comportamento do atalho
   na AppBar).

### Alternância de tema na AppBar

A AppBar inclui um botão circular sem texto responsável por alternar entre os
temas claro e escuro. O controle expõe um tooltip que indica a ação disponível,
enquanto o rótulo acessível oscila entre “Ativar modo claro” e “Ativar modo
escuro”. O ícone ☀️/🌙 muda junto com o tema ativo e a área de marca alterna os
logotipos hospedados pelo domínio oficial do projeto. O estado escolhido fica
registrado no `localStorage` na chave `marco-appbase:theme`, permitindo que a
preferência seja restaurada automaticamente na próxima visita.

## MiniApp “Painel de controle” — destaques

- **Atalho na AppBar** concentra o acesso ao painel principal, alternando o
  estado expandido, gerenciando foco automaticamente e habilitando a abertura
  mesmo quando não há cadastro salvo.
- **Painel unificado** organiza indicadores, resumo do cadastro, formulário e
  histórico em cards empilhados no mesmo plano, eliminando pop-ups e reforçando
  a leitura sequencial.
- **Cadastro direto no palco**, com campos pré-preenchidos, feedback inline e
  controles de sessão (encerrar ou limpar dados) na mesma seção.
- **Validações reforçadas** exigem senha para concluir o cadastro, formatam
  automaticamente números brasileiros de telefone (10 ou 11 dígitos) e
  oferecem alternância de visibilidade no campo de senha.
- **Alternância de tema persistente**: a AppBar traz o mesmo botão circular sem
  texto, com ícones ☀️/🌙 alinhados ao tema ativo, tooltip contextual e rótulos
  acessíveis que descrevem a ação disponível. A marca alterna entre as versões
  clara/escura hospedadas no domínio oficial do projeto. A chave
  `marco-appbase:theme` no `localStorage` garante que a preferência retorne em
  novas sessões.
- **Persistência local leve**: os dados são gravados no IndexedDB com fallback
  transparente para `localStorage`, reaplicados automaticamente na próxima
  visita e podem ser editados a qualquer momento sem dependências de sync/backup.
- **Histórico de acessos e controles de sessão**: o painel detalhado lista os
  registros de login/logoff com rolagem a partir de cinco eventos. Os botões de
  encerrar sessão permanecem ao lado do formulário, permitindo manter os dados
  salvos para um retorno futuro ou limpar tudo do navegador.
- **Indicadores contextuais** desativam a sinalização de sincronização enquanto
  a sessão está desconectada, evitando falsa impressão de estado atualizado.

## Tecnologias adotadas e compatibilidade

- **HTML + CSS + JavaScript vanilla**: toda a experiência roda como arquivos
  estáticos, mantendo compatibilidade total com GitHub Pages e dispensando
  bundlers ou frameworks. O shell segue os tokens `--ac-*` e classes `ac-*`
  definidos no blueprint visual.
- **Persistência via IndexedDB + fallback**: garante que o cadastro funcione
  offline com o object store `marco-appbase/state`, migrando dados legados do
  `localStorage` quando necessário. A normalização de dados cuida de nomes,
  contas e datas para manter a UI consistente.
- **Acessibilidade nativa**: o formulário e os controles compartilham rótulos,
  `aria-live` para feedback e foco gerenciado ao abrir o painel, garantindo uma
  experiência compatível com leitores de tela sem depender de bibliotecas
  externas.
- **Testes Playwright**: a suíte end-to-end roda com Node.js apenas em
  desenvolvimento, validando o fluxo principal. Como as dependências ficam em
  `devDependencies`, o deploy estático permanece leve.

Esta combinação evita conflitos entre tecnologias, atende ao objetivo atual de
cadastro simples e pode ser expandida gradualmente (por exemplo, com APIs reais
de autenticação ou módulos adicionais) sem reescrever a base.

## Próximos passos sugeridos

- Reintroduzir gradualmente os módulos de sincronização, backup e eventos a
  partir deste núcleo enxuto, validando compatibilidade antes de expandir o
  escopo.
- Avaliar a integração com um backend real de autenticação quando o fluxo de
  cadastro estiver validado com usuários.
- Ampliar a suíte de testes end-to-end cobrindo cenários de edição contínua,
  múltiplos cadastros e comportamento em navegadores móveis.
