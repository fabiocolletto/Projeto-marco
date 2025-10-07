# Sistema Operacional Marco

Protótipo navegável do **AppBase Marco** pronto para ser aberto diretamente em um
navegador moderno sem build. A versão R1.0 consolida o shell completo com AppBar,
rail de etiquetas, palco central e uma miniapp enxuta de cadastro executada com
HTML, CSS e JavaScript vanilla na pasta `appbase/`, seguindo as diretrizes do
blueprint visual.

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
A pasta `appbase/` concentra a implementação atual do shell R1.0 com o novo
MiniApp “Painel de controle”.

## Como executar

1. Clone ou baixe este repositório.
2. Abra `appbase/index.html` em um navegador (Chrome, Edge, Firefox ou Safari).
   - O `index.html` na raiz redireciona automaticamente para essa versão.
   - Para consultar a versão legada modular, abra `src/index.html` diretamente.
3. Ao abrir, o palco permanece vazio até que um usuário seja cadastrado. Use o
   botão “Começar cadastro” ou clique na etiqueta “Painel de controle” para
   abrir o formulário de Login.
4. Os dados cadastrados são guardados apenas no `localStorage` do navegador. Ao
   salvar, o painel é exibido com o nome, a conta derivada do e-mail e a data do
   último acesso, e essas informações permanecem disponíveis em visitas
   futuras.
5. Utilize o botão ⋯ da etiqueta para recolher/exibir o painel quando houver um
   cadastro ativo. O overlay de Login pode ser reaberto para editar o usuário a
   qualquer momento.
6. Dentro do painel do miniapp, utilize os botões “Encerrar sessão” e “Encerrar e
   remover dados” para registrar logoff preservando ou eliminando as
   informações. O histórico de acessos exibe os eventos mais recentes de login e
   logoff na mesma área detalhada, sinalizando a ausência de registros tanto na
   tabela quanto no estado vazio do palco.
7. Para rodar os testes de regressão, execute `npm install` seguido de `npm test`
   (a suíte Playwright valida cadastro, persistência e comportamento da etiqueta).

### Alternância de tema na AppBar

A AppBar inclui um botão circular sem texto responsável por alternar entre os
temas claro e escuro. O controle expõe um tooltip que indica a ação disponível,
enquanto o rótulo acessível oscila entre “Ativar modo claro” e “Ativar modo
escuro”. O ícone ☀️/🌙 muda junto com o tema ativo e o estado escolhido fica
registrado no `localStorage` na chave `marco-appbase:theme`, permitindo que a
preferência seja restaurada automaticamente na próxima visita.

## MiniApp “Painel de controle” — destaques

- **Etiqueta simplificada** exibe o primeiro nome cadastrado, o último acesso e
  o status (vermelho quando vazio, verde quando configurado), mantendo o rail
  coerente com o palco.
- **Palco dedicado ao Login**, com tile único que mostra nome completo, conta e
  horário do último acesso. O botão ⋯ recolhe/exibe o painel sem perder o
  cadastro.
- **Overlay de Login acessível** (`role="dialog"`, `aria-modal`, foco gerenciado
  e fechamento por Esc/backdrop) com feedback imediato de sucesso ou erro ao
  salvar.
- **Alternância de tema persistente**: a AppBar traz o mesmo botão circular sem
  texto, com ícones ☀️/🌙 alinhados ao tema ativo, tooltip contextual e rótulos
  acessíveis que descrevem a ação disponível. A chave `marco-appbase:theme` no
  `localStorage` garante que a preferência retorne em novas sessões.
- **Persistência local leve**: os dados são gravados no `localStorage`,
  reaplicados automaticamente na próxima visita e podem ser editados a qualquer
  momento sem dependências de sync/backup.
- **Histórico de acessos e controles de sessão**: o painel detalhado lista os
  registros de login/logoff com rolagem a partir de cinco eventos. Os botões de
  encerrar sessão agora ficam dentro do overlay de cadastro, permitindo manter os
  dados salvos para um retorno futuro ou limpar tudo do navegador.

## Tecnologias adotadas e compatibilidade

- **HTML + CSS + JavaScript vanilla**: toda a experiência roda como arquivos
  estáticos, mantendo compatibilidade total com GitHub Pages e dispensando
  bundlers ou frameworks. O shell segue os tokens `--ac-*` e classes `ac-*`
  definidos no blueprint visual.
- **Persistência via `localStorage`**: garante que o cadastro funcione offline,
  sem dependências de sincronização ou backend. A normalização de dados cuida de
  nomes, contas e datas para manter a UI consistente.
- **Acessibilidade nativa**: o overlay utiliza `role="dialog"`, `aria-modal` e
  gerenciamento de foco em JavaScript puro para oferecer uma experiência
  compatível com leitores de tela sem exigir bibliotecas externas.
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
