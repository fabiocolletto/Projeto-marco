# Manual rígido de criação de novo MiniApp

> **Este manual está em evolução.** Até que novas seções sejam publicadas, a
> automação deve seguir à risca as instruções abaixo sobre idiomas e checklist de
> entregáveis. Nenhuma etapa pode ser pulada ou adaptada.

## Checklist de documentação obrigatória

Antes do primeiro commit do MiniApp, crie os quatro artefatos descritos no
[checklist rígido de entregáveis](./entregaveis-miniapp.md) e armazene-os em
`miniapps/<id>/docs/`. Sem esse pacote o Codex não deve abrir PRs nem executar
pipelines de homologação.

## Fluxo operacional do Codex para gerar a versão beta

1. **Receber o briefing aprovado**: confirme que os arquivos `01` a `04`
   descritos no checklist foram anexados, revisados e estão completos. Se
   qualquer campo estiver pendente, interrompa o fluxo e solicite correções no
   documento correspondente.
2. **Planejar a implementação**: derive as tarefas técnicas diretamente do
   briefing e do pacote visual. Mapas de rota, componentes necessários e estados
   previstos devem ser copiados do gabarito visual e das tabelas do pacote de
   conteúdo sem adaptações criativas.
3. **Montar a estrutura inicial**: crie a árvore `miniapps/<id>/` já contemplando
   `src/`, `src/i18n/`, `docs/` (com os entregáveis) e pastas de assets listadas
   no pacote visual. Estruturas divergentes só podem ser adotadas se o briefing
   as exigir explicitamente.
4. **Construir telas e interações**: implemente o layout fielmente ao
   [`manuals/gabarito_visual.html`](./gabarito_visual.html), reutilizando classes,
   tokens e componentes homologados. Cada trecho de UI deve estar ancorado nos
   componentes catalogados no pacote visual para acelerar revisões.
5. **Preencher conteúdo e traduções**: use o pacote de conteúdo como fonte
   única para strings, chaves i18n e regras contextuais. Toda nova string deve
   ser registrada simultaneamente nos três arquivos JSON obrigatórios.
6. **Configurar testes e QA**: converta o plano de QA em testes automatizados e
   checklists de validação. Caso algum cenário ainda não possa ser automatizado,
   registre a pendência em `04-plano-qa.md` com uma justificativa temporária.
7. **Registrar pendências**: qualquer ajuste solicitado durante revisões deve
   apontar explicitamente para a seção relevante de `01` a `04`, atualizando o
   documento antes de modificar o código. O Codex não deve aceitar mudanças que
   não estejam refletidas nos entregáveis.

Este fluxo garante que o Codex sempre parta de insumos consolidados e produza um
beta fiel à intenção de produto antes das iterações finas com o time humano.

## Idiomas (obrigatório desde a criação)

### Estrutura mínima de diretórios

1. Crie o diretório `miniapps/<id>/src/i18n/`.
2. Dentro dele, inicialize obrigatoriamente os três dicionários base:
   - `miniapps/<id>/src/i18n/pt-BR.json`
   - `miniapps/<id>/src/i18n/en-US.json`
   - `miniapps/<id>/src/i18n/es-ES.json`
3. Garanta que os três arquivos compartilham exatamente as mesmas chaves e que os
   valores estão alinhados conceitualmente (tradução por sentido, não literal).

### Manutenção das strings base

- Use o conteúdo aprovado do AppBase como referência semântica para cada chave.
- Sempre revise as três línguas lado a lado antes de criar novas entradas.
- Não deixe placeholders (`TODO`, strings vazias ou duplicadas). O MiniApp deve
  estar pronto para uso público apenas com esses três idiomas.

### Registro com o serviço de "Novo idioma"

Para permitir que o manual de novo idioma consiga automatizar futuras
traduções, cada MiniApp recém-criado deve disponibilizar as seguintes
informações no manifesto ou arquivo de configuração consumido pelo serviço:

1. **`miniappId`**: identificador único que corresponde ao diretório dentro de
   `miniapps/`.
2. **`supportedLocales`**: lista iniciada com `["pt-BR", "en-US", "es-ES"]`.
3. **`dictionaries`**: caminhos absolutos relativos (ex.:
   `src/i18n/<locale>.json`) para que a automação saiba onde escrever os novos
   dicionários.
4. **`localeOwner`**: contato responsável (e-mail ou Slack) para validações das
   traduções e resposta a dúvidas do serviço automatizado.
5. **`releaseNotesPath`**: arquivo Markdown onde o serviço registrará futuras
   inclusões de idiomas (ex.: `docs/changelog.md`).

Sem esses campos o serviço de novo idioma não deve ser acionado para o MiniApp.
A automação deve falhar explicitamente orientando a corrigir a configuração.

### Sincronização com o manual de novo idioma

- Cite explicitamente o [manual rígido de instalação de novo idioma](./novo-idioma.md)
  em qualquer issue ou comentário que dispare a criação do MiniApp.
- Sempre que uma nova língua for adicionada via automação de idiomas, execute
  novamente os testes do MiniApp e atualize os arquivos mencionados acima.

O cumprimento integral desta seção garante que cada MiniApp nasce pronto para
participar da política de idiomas do Projeto Marco.

## Gabarito visual obrigatório (R1.3)

Todos os fluxos e telas criados para novos MiniApps devem seguir o
[`manuals/gabarito_visual.html`](./gabarito_visual.html), que consolida os blocos
visuais oficiais do AppBase Marco. O documento é estático, porém define a
composição de layouts, identidade e tokens de interface que a automação deve
respeitar ao montar painéis, listas e interações.【F:manuals/gabarito_visual.html†L1-L568】

### Grade e ritmo de layout

- Utilize a grade de 12 colunas com espaçamento fixo de 14 px, aplicando as
  classes de apoio `.span-12`, `.span-6`, `.span-4` e `.span-3` para criar
  variações de largura em seções de 1, 2, 3 ou 4 colunas sem alterar o ritmo do
  AppBase.【F:manuals/gabarito_visual.html†L25-L59】【F:manuals/gabarito_visual.html†L150-L214】
- Cards de gráficos e tabelas mantêm altura aproximada de 220 px, com rolagem
  interna sombreada quando necessário; bordas principais são de 1 px com cantos
  arredondados entre 14 px e 18 px.【F:manuals/gabarito_visual.html†L40-L119】【F:manuals/gabarito_visual.html†L330-L401】【F:manuals/gabarito_visual.html†L430-L488】

### Modelos de conteúdo reutilizáveis

- Ao exibir métricas ou dados históricos, escolha entre os modelos de gráfico
  (rosca, linha, barras, área ou colunas) e aplique legendas, eixos e legendas
  inferiores exatamente como demonstrado para preservar consistência visual.
  Todos os placeholders do gabarito devem ser substituídos por dados reais sem
  alterar estrutura ou posicionamento dos elementos auxiliares.【F:manuals/gabarito_visual.html†L150-L214】
- Cards textuais, métricos e listas seguem tipografia e hierarquia apresentadas
  nos modelos de conteúdo; mantenha títulos em destaque azul, divisores (`.divider`)
  quando necessários e pílulas/indicadores nas posições previstas para sinalizar
  estados ou agrupamentos.【F:manuals/gabarito_visual.html†L216-L324】
- Tabelas devem usar cabeçalho fixo com fundo neutro, linhas com separadores e
  rolagem em container `.table-wrap`, evitando customizações fora do padrão.
  Ajustes como colunas adicionais devem respeitar o espaçamento interno de 10–12 px
  e o comportamento sticky do `<thead>`.【F:manuals/gabarito_visual.html†L326-L401】

### Identidade, componentes e tokens

- Tipografia padrão: Inter/system-ui para textos, com títulos `H1/H2/H3`
  alinhados às cores primárias. A paleta oficial deve ser aplicada conforme o
  catálogo (primária `#1f3a8a`, borda `#0b2a6b`, acento `#f97316`, etc.), sem
  introduzir novas cores fora do manual.【F:manuals/gabarito_visual.html†L403-L462】
- Botões, switches, pílulas e indicadores reutilizam os componentes demonstrados
  no gabarito, preservando estilos, raios e pesos de fonte originais.【F:manuals/gabarito_visual.html†L403-L488】
- Ícones de ação devem ser renderizados por meio dos tokens `data-ic` listados
  (`menu`, `close`, `chev-down`, `chev-right`, `sort`, `add`, `remove`, `check`,
  `info`, `warn`, `refresh`, `download`, `upload`, `search`, `settings`, `share`,
  `back`, `next`). Nunca usar bibliotecas externas para ícones do sistema.【F:manuals/gabarito_visual.html†L403-L488】

### MiniCards e listas de MiniApps

- A listagem de MiniApps deve utilizar os modelos `.minicard` em tamanhos
  `sm`, `md` ou `lg`, todos ocupando uma coluna de grade (`.span-4`). O estado
  ativo é indicado exclusivamente pela borda laranja `--ac-accent`, sem ícones
  adicionais.【F:manuals/gabarito_visual.html†L489-L534】
- Sinais de status usam clusters de pontos (`.dot-s`) com cores padrão para ok,
  alerta e erro; pílulas de classificação permanecem dentro do título ou corpo
  conforme exemplificado no gabarito.【F:manuals/gabarito_visual.html†L489-L534】

### Logos e materiais oficiais

- Sempre que o MiniApp exigir logotipos ou ícones corporativos, reutilize os
  assets indicados na seção de identidade visual. Respeite recomendações de uso
  (fundos claros/escuros) e formatos (`PNG` ou `WEBP`) conforme descrito para
  cada arquivo oficial fornecido.【F:manuals/gabarito_visual.html†L462-L488】

## Aplicando o padrão a MiniApps existentes

- Antes de atualizar MiniApps já publicados (ex.: "Painel de Controles"),
  replique localmente o fluxo operacional descrito acima: revise os entregáveis
  `01` a `04`, atualize o gabarito visual necessário e apenas depois submeta as
  mudanças de código.
- Retrofits devem alinhar layout, conteúdo e testes ao estado atual do manual,
  mesmo que isso implique refatoração completa de seções antigas. Documente no
  briefing quais partes foram revisitadas e por qual motivo.
- O Codex deve rejeitar ajustes rápidos que não tenham passado pelos entregáveis
  e pelo gabarito visual. Registre qualquer exceção com aval explícito da
  liderança do produto.

## Log de revisões

| Data       | Alteração | Responsável |
|------------|-----------|-------------|
| 2024-06-07 | Inclusão do fluxo operacional do Codex e orientações para retrofits. | Codex |
| 2024-06-06 | Inclusão do gabarito visual obrigatório para layouts e identidade. | Codex |
| 2024-05-27 | Criação inicial da seção de idiomas obrigatória. | Codex |
