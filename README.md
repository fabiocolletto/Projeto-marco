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
3. Ao abrir, o palco permanece vazio. Use o botão “Fazer login” na AppBar ou no
   estado vazio do palco para iniciar. No primeiro acesso, o painel é aberto
   diretamente em modo de cadastro, exigindo nome completo, e-mail, telefone
   brasileiro (10 ou 11 dígitos) e um PIN numérico de 4 dígitos informado pelo
   teclado exibido na própria tela.
4. Depois de salvar, o painel exibe o nome, a conta derivada do e-mail, o último
   acesso e o histórico local. A sessão permanece ativa até ser encerrada
   manualmente e os dados ficam preservados no `localStorage` para visitas
   futuras.
5. Para retomar ou alternar entre perfis existentes, clique em “Fazer login”
   para abrir a sobreposição de usuários. Escolha a conta desejada e digite o
   PIN usando o teclado numérico; o painel é exibido apenas após a validação
   bem-sucedida.
6. Dentro do painel, utilize “Encerrar sessão” para bloquear o acesso mantendo
   os dados ou “Encerrar e remover dados” para abrir a confirmação de limpeza.
   A remoção registra o evento no histórico e atualiza a lista de usuários
   disponíveis na sobreposição de login.
7. Para rodar os testes de regressão, execute `npm install` seguido de `npm
   test`. A suíte Playwright cobre o cadastro obrigatório, o teclado de PIN, a
   troca de usuários pela sobreposição e os fluxos de confirmação antes de
   remover dados.

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
- **Login dedicado e multiusuário**: o botão “Fazer login” abre uma sobreposição
  com a lista de contas disponíveis, opção de criar um novo cadastro e controle
  total via teclado numérico. O painel só é exibido após validar o PIN do
  usuário selecionado.
- **Campos obrigatórios com PIN de 4 dígitos**: nome completo, e-mail, telefone
  (10 ou 11 dígitos) e PIN são sempre exigidos tanto na criação quanto na
  edição. A máscara de telefone e o botão de visibilidade do PIN ajudam na
  digitação enquanto o teclado dedicado elimina o uso do teclado do sistema.
- **Confirmação antes de remover dados**: encerrar e limpar abre uma sobreposição
  dedicada com descrição do impacto, exigindo confirmação explícita e
  registrando o evento no histórico do perfil.
- **Alternância de tema persistente**: a AppBar traz o mesmo botão circular sem
  texto, com ícones ☀️/🌙 alinhados ao tema ativo, tooltip contextual e rótulos
  acessíveis que descrevem a ação disponível. A marca também alterna entre os
  arquivos `icon-light-500.png` e `icon-dark-500.png`. A chave
  `marco-appbase:theme` no `localStorage` garante que a preferência retorne em
  novas sessões.
- **Persistência local leve**: o estado multiusuário (lista de perfis, histórico
  e `activeUserId`) é gravado no `localStorage`, reaplicado automaticamente na
  próxima visita e pode ser expandido sem dependências de sync/backup.
- **Histórico de acessos e controles de sessão**: o painel detalhado lista os
  registros de login/logoff por usuário com rolagem a partir de cinco eventos.
  Os botões de encerrar sessão permanecem ao lado do formulário, permitindo
  manter os dados salvos para um retorno futuro ou limpar tudo do navegador.
- **Indicadores contextuais** desativam a sinalização de sincronização enquanto
  a sessão está desconectada, evitando falsa impressão de estado atualizado.

## Fluxo de autenticação e multiusuário

- O estado persistido em `localStorage` guarda a lista de perfis (`users`), o
  identificador ativo (`activeUserId`), o histórico atual e o indicador de
  sessão (`sessionActive`). Cada perfil reúne nome completo, e-mail, telefone,
  hash do PIN, carimbos de criação/atualização e seu próprio histórico.
- O PIN é digitado exclusivamente pelo teclado numérico exibido no formulário e
  na sobreposição. O campo de PIN permanece somente leitura, garantindo que a
  digitação ocorra via interface customizada. Sempre que possível, o valor é
  convertido em SHA-256; navegadores sem suporte recebem um fallback prefixado
  com `plain:` para manter compatibilidade.
- A sobreposição de login permite alternar de usuário, iniciar novos cadastros e
  só libera o painel após validar o PIN informado. Sem sessão ativa, o atalho da
  AppBar direciona automaticamente para essa camada.
- A remoção de dados abre uma confirmação modal. Ao aceitar, o perfil é excluído
  do array persistido, o foco retorna ao atalho na AppBar e o histórico recebe
  um evento `logout_clear`, mantendo rastreabilidade local.

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
- Ampliar a suíte de testes end-to-end explorando cenários de recuperação de PIN,
  bloqueios após tentativas falhas consecutivas e comportamento em navegadores
  móveis.
