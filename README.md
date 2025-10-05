# Sistema Operacional Marco

Este repositório contém o protótipo navegável do **AppBase Marco** executando mini-apps
habilitados via configuração local. Toda a experiência continua em um único arquivo
`index.html`, reunindo HTML, CSS e JavaScript vanilla conforme as diretrizes do projeto.

## Funcionalidades principais

- **Tela principal alinhada ao esboço** com coluna vertical de resumos de mini-apps
  e dois masters centrais: Painel cliente e MiniAppPanel.
- **Masters vazios definidos** para KPIs, dados, outros painéis e área de expansão,
  preparando a inclusão posterior dos subcards.
- **Etiquetas com menu de três pontos** em cada mini-app habilitado, carregando o
  MiniAppPanel correspondente no centro apenas quando solicitado, com botão de
  fechar e destaque do mini-app ativo.
- **Camada visual preservada** com paleta clara, tipografia Inter e superfícies
  translúcidas conforme o print de referência compartilhado.
- **Rodapé com branding 5horas** incorporando o logo oficial ao lado dos
  metadados do protótipo.
- **Espaçamentos unificados** definindo variáveis de layout para cards, colunas e
  laterais, garantindo consistência visual nas resoluções do Galaxy Tab S9 em
  modo retrato e paisagem.
- **AppBase em JavaScript** simulando o contrato de boot (`register`, merge de
  `enabledMiniApps`, bloqueio de defaults e controle de licenças).
- **Mini-apps prontos**:
  - Painel de Operações
  - Gestor de Tarefas
  - Conta & Backup (identidade, dispositivos e direitos LGPD)
  - Marketplace (habilitação de mini-apps e licenças)
  - Configuração & Operação (config resolvida, observabilidade e checklist)
- **Marketplace interativo** com toggles para ativar/desativar mini-apps opcionais e
  cartões bloqueados para itens obrigatórios.
- **Dados dinâmicos simulados** para sessão, dispositivos, storage, auditoria e KPIs.

## Tema claro/escuro

- O `AppBase.boot` define `document.documentElement.dataset.theme` com o valor
  informado em `config.ui.theme` (ou `light` como padrão). Em seguida, a
  preferência persistida no `localStorage` (`marco-ui-theme`) é reaplicada antes
  de qualquer interação.
- Um toggle na barra superior alterna entre claro/escuro, atualiza o dataset e
  grava a escolha, garantindo que o tema se mantenha nas próximas visitas.

### Forçando um tema para testes

- A forma mais rápida é usar o próprio toggle na interface.
- Via console do navegador: `localStorage.setItem('marco-ui-theme', 'dark')` ou
  `localStorage.setItem('marco-ui-theme', 'light')` seguido de `location.reload()`.
- Para retornar ao comportamento padrão do boot, execute
  `localStorage.removeItem('marco-ui-theme')` e recarregue a página.

## Como executar

1. Baixe ou clone este repositório.
2. Abra o arquivo `index.html` em um navegador moderno (Chrome, Edge, Firefox, Safari).
3. Utilize os cartões para abrir a visão completa ou acione o botão de três pontos
   em cada mini-app para mostrar o MiniAppPanel dentro da Home.
4. No mini-app Marketplace, clique em **Habilitar/Desabilitar** para simular a
   alteração da lista de mini-apps ativos (mini-apps padrão permanecem bloqueados).

## Exportação de relatórios

- Os mini-apps **Painel de Operações**, **Gestor de Tarefas**, **Conta & Backup** e
  **Configuração & Operação** possuem botões "Exportar" no cabeçalho. Cada ação gera
  um PDF textual com o conteúdo visível da seção e faz o download automaticamente.
- Sempre que o dispositivo oferecer suporte ao [Web Share API com arquivos], o Marco
  também abre o fluxo de compartilhamento após gerar o PDF (Chrome/Edge no Android,
  Safari 16.4+ no iOS/iPadOS com contexto seguro). Em navegadores sem suporte, o
  download local continua funcionando normalmente.
- Caso o PDF não possa ser montado, a interface ativa um modo de impressão dedicado
  (atalho `Ctrl/Cmd + P`) graças às regras `@media print`, permitindo salvar o mesmo
  conteúdo em PDF via diálogo do navegador.

[Web Share API com arquivos]: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share#sharing_files

## Estrutura

```
.
├── README.md
├── agent.md
├── index.html
└── MARCO_BLUEPRINT.md
```

- `index.html`: implementa todo o aplicativo (layout, estilos, AppBase e mini-apps).
- `agent.md`: instruções operacionais para evoluções futuras do protótipo.
- `MARCO_BLUEPRINT.md`: blueprint consolidado do AppBase e gadget Marco.

## Próximos passos sugeridos

- Adicionar novos mini-apps ao catálogo simulando contratos reais do blueprint.
- Introduzir componentes responsivos adicionais (gráficos, formulários ou modais).
- Conectar o protótipo a dados reais ou mocks externos mantendo a abordagem
  single-file.
