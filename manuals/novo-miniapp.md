# Manual rígido de criação de novo MiniApp

> **Este manual está em evolução.** Até que novas seções sejam publicadas, a
> automação deve seguir à risca as instruções abaixo sobre idiomas. Nenhuma etapa
> pode ser pulada ou adaptada.

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

## Referência visual obrigatória

- Abra o [gabarito visual oficial](./gabarito_visual.html) antes de qualquer
  decisão de layout ou escolha de componentes. Ele concentra a grade 12 colunas
  (variações 1/2/3/4 colunas), modelos de gráficos, tabelas, cartões, botões e
  tokens de identidade que **devem** ser reutilizados sem alterações de
  proporção, paleta ou tipografia.
- Ao compor telas do MiniApp:
  - selecione blocos existentes do gabarito (por exemplo, tiles métricos,
    modelos de gráfico ou minicards) e apenas ajuste textos e dados;
  - mantenha a hierarquia de bordas, sombras e espaçamentos documentada, evitando
    criar novos componentes visuais sem aprovação explícita;
  - use exclusivamente os tokens de cor `--ac-*` e os ícones declarados via
    `data-ic` no gabarito; novos tokens devem ser vetados durante a revisão.
- Quando for necessário combinar múltiplos blocos, respeite a grade descrita no
  gabarito, garantindo alinhamento responsivo entre 1140px e telas menores.
- Qualquer desvio visual identificado na revisão deve bloquear o merge até que
  o layout esteja idêntico ao gabarito.

## Log de revisões

| Data       | Alteração | Responsável |
|------------|-----------|-------------|
| 2024-05-27 | Criação inicial da seção de idiomas obrigatória. | Codex |
| 2024-05-28 | Inclusão da referência visual obrigatória para novos MiniApps. | Codex |
