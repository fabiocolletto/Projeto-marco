# Sistema Operacional Marco

Protótipo navegável do **AppBase Marco** pronto para ser aberto diretamente em um
navegador moderno sem build. A versão R1.1 consolida o shell completo com AppBar,
rail lateral, palco central e uma miniapp enxuta de cadastro executada com HTML,
CSS e JavaScript vanilla na pasta `appbase/`, seguindo as diretrizes do blueprint
visual.

## Estrutura do repositório

```
.
├── appbase/
│   ├── index.html            # Shell do AppBase + MiniApp “Painel de controle”
│   ├── app.css               # Tokens `--ac-*`, grid responsivo e overlays
│   └── app.js                # Controle do painel, cadastro local e interações vanilla
├── assets/                   # Logos e imagens utilizadas pelo protótipo
├── index.html                # Redirecionamento (GitHub Pages)
├── src/                      # Versão anterior do protótipo modular
├── MARCO_BLUEPRINT.md        # Blueprint consolidado do AppBase
├── README.md                 # Este documento
└── agent.md                  # Diretrizes operacionais para contribuições
```

A pasta `src/` preserva o protótipo modular utilizado nas primeiras iterações.
A pasta `appbase/` concentra a implementação atual do shell R1.1 com o novo
MiniApp “Painel de controle”.

## Como executar

1. Clone ou baixe este repositório.
2. Abra `appbase/index.html` em um navegador (Chrome, Edge, Firefox ou Safari).
   - O `index.html` na raiz redireciona automaticamente para essa versão.
   - Para consultar a versão legada modular, abra `src/index.html` diretamente.
3. Ao abrir, o palco permanece vazio até que um usuário seja cadastrado. Use o
   botão “Começar cadastro” ou o atalho de usuário na AppBar (ícone 👤) para
   abrir o painel detalhado e preencher o formulário diretamente no palco.
4. Os dados cadastrados são guardados apenas no `localStorage` do navegador. Ao
   salvar, o painel é exibido com o nome, a conta derivada do e-mail e a data do
   último acesso, e essas informações permanecem disponíveis em visitas
   futuras.
5. O botão circular com setas na AppBar recolhe ou expande a coluna de
   miniapps. Quando recolhida, o palco ganha largura total para destacar o
   conteúdo do painel principal.
6. Utilize o atalho de usuário na AppBar para recolher/exibir o painel quando
   houver um cadastro ativo. A edição do cadastro acontece no mesmo painel,
   bastando atualizar os campos e salvar.
7. Dentro do painel do miniapp, utilize os botões “Encerrar sessão” e “Encerrar e
   remover dados” para registrar logoff preservando ou eliminando as
   informações. O histórico de acessos exibe os eventos mais recentes de login e
   logoff logo abaixo do formulário, sinalizando a ausência de registros tanto
   na tabela quanto no estado vazio do palco.
8. Para rodar os testes de regressão, execute `npm install` seguido de `npm test`
   (a suíte Playwright valida cadastro, persistência e o comportamento do atalho
   na AppBar). Em ambientes Linux sem bibliotecas gráficas pré-instaladas é
   necessário executar `npx playwright install-deps` (ou instalar manualmente os
   pacotes listados pelo Playwright) antes dos testes.

### Alternância de tema na AppBar

A AppBar inclui um botão circular sem texto responsável por alternar entre os
temas claro e escuro. O controle expõe um tooltip que indica a ação disponível,
enquanto o rótulo acessível oscila entre “Ativar modo claro” e “Ativar modo
escuro”. O ícone ☀️/🌙 muda junto com o tema ativo e o logotipo passa a carregar
a versão correspondente (`icon-light-500.png` ou `icon-dark-500.png`). O estado
escolhido fica registrado no `localStorage` na chave `marco-appbase:theme`,
permitindo que a preferência seja restaurada automaticamente na próxima visita.

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
  acessíveis que descrevem a ação disponível. A marca também alterna entre os
  arquivos `icon-light-500.png` e `icon-dark-500.png`. A chave
  `marco-appbase:theme` no `localStorage` garante que a preferência retorne em
  novas sessões.
- **Persistência local leve**: os dados são gravados no `localStorage`,
  reaplicados automaticamente na próxima visita e podem ser editados a qualquer
  momento sem dependências de sync/backup.
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
- **Persistência via `localStorage`**: garante que o cadastro funcione offline,
  sem dependências de sincronização ou backend. A normalização de dados cuida de
  nomes, contas e datas para manter a UI consistente.
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
