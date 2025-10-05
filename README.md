# Sistema Operacional Marco

Protótipo navegável do **AppBase Marco** com mini-apps habilitados via configuração
local. A interface agora vive dentro de `src/index.html`, com estilos, scripts e
traduções organizados em subpastas dedicadas, mantendo uma experiência leve com
HTML estático e JavaScript vanilla.

## Estrutura do repositório

```
.
├── assets/                    # Logos e imagens utilizadas pelo protótipo
├── index.html                 # Redirecionamento para `src/index.html` (GitHub Pages)
├── src/
│   ├── index.html             # Página principal do AppBase + mini-apps
│   ├── locales/               # Arquivos de tradução (JSON)
│   ├── scripts/               # AppBase, mocks, UI e módulos de exportação
│   ├── miniapps/              # Manifestos declarativos dos mini-apps
│   └── styles/                # Tokens de design e estilos de componentes
├── MARCO_BLUEPRINT.md         # Blueprint consolidado do AppBase
├── README.md                  # Este documento
└── agent.md                   # Diretrizes operacionais para contribuições
```

## Como executar

1. Clone ou baixe este repositório.
2. Abra `src/index.html` em um navegador moderno (Chrome, Edge, Firefox ou Safari).
   - Quem utilizar GitHub Pages pode apontar para a raiz do repositório: o
     `index.html` na raiz redireciona automaticamente para `src/index.html`.
3. Interaja com os cartões dos mini-apps para navegar entre a Home e os painéis
   detalhados ou utilize o menu de três pontos para abrir o MiniAppPanel dentro
   da Home.

## Funcionalidades principais

- **AppBase modular** (`src/scripts/app-base.js`): registra mini-apps, controla
  toggles e expõe a configuração resolvida.
- **Mocks e snapshots** (`src/scripts/state.js`): simula KPIs, sessão, catálogo
  de marketplace, observabilidade e auditoria com suporte a traduções e expõe o
  contrato `bootConfig` com a lista `miniApps`.
- **Manifestos de mini-app** (`src/miniapps/*.json`): definem metadados, painéis
  e dados de marketplace consumidos dinamicamente no boot.
- **Camada de UI** (`src/scripts/ui.js`): renderiza cards, conecta eventos,
  atualiza métricas e aplica traduções dinâmicas (incluindo time relative e
  textos do marketplace).
- **Motor de exportação** (`src/scripts/exporter.js`): gera PDFs simples em
  JavaScript puro, com fallback de impressão e compatibilidade com Web Share
  quando disponível.
- **Internacionalização pronta**: dropdown no cabeçalho alterna entre `pt-BR` e
  `en-US`. Textos declarativos usam `data-i18n` em `src/index.html`, abastecidos
  pelos JSON em `src/locales/`.
- **Tema claro/escuro**: toggle persiste a preferência no `localStorage`
  (`marco-ui-theme`) e sincroniza ícone/aria-labels em ambos os idiomas.

## Exportação de relatórios

Os mini-apps **Painel de Operações**, **Gestor de Tarefas**, **Conta & Backup** e
**Configuração & Operação** possuem botões de exportação. Cada ação:

1. Monta um PDF textual com o conteúdo visível da seção, agora respeitando as
   traduções ativas e ocultando botões/links irrelevantes.
2. Faz o download automático do arquivo (`File`/`Blob`).
3. Aciona o fluxo do [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share#sharing_files)
   quando disponível; caso contrário o download é preservado.
4. Registra o evento no livro-razão exibido em Conta & Backup, com rótulos
   traduzidos conforme o idioma corrente.

Se o PDF não puder ser gerado, a interface alterna para o modo de impressão para
permitir salvar via diálogo nativo (`Ctrl/Cmd + P`).

## Adicionando novos idiomas

1. Crie um arquivo `src/locales/<locale>.json` com as mesmas chaves existentes em
   `pt-BR.json`/`en-US.json`.
2. Atualize o seletor de idiomas em `src/index.html` adicionando uma `<option>`
   com `value` e `data-i18n` apropriados.
3. Registre o novo locale na função `initLocalization` (chamada em
   `src/scripts/main.js`) caso deseje alterá-lo como padrão.
4. Utilize `translateWithFallback`/`translate` em `ui.js` para qualquer novo
   texto dinâmico, garantindo suporte às chaves criadas.

## Publicação no GitHub Pages

- Configure o GitHub Pages para servir a partir do branch principal na pasta
  raiz. O arquivo `index.html` redireciona para `src/index.html`, mantendo a
  estrutura de subpastas intacta sem build adicional.
- Assets permanecem em `assets/`, portanto certifique-se de que o domínio do
  Pages preserve caminhos relativos (`/Projeto-marco/assets/...`).

## Próximos passos sugeridos

- Introduzir novos mini-apps no catálogo mockado seguindo os contratos do
  blueprint.
- Enriquecer os masters com gráficos, formulários ou integrações reais sem
  dependências externas.
- Expandir a cobertura de traduções (auditoria, dispositivos, observabilidade)
  para cenários adicionais ou novos idiomas.
