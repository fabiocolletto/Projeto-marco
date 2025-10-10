# Guia de implantação do MiniApp "Painel de Controles"

Este guia resume os passos necessários para que o MiniApp atenda às diretrizes
vigentes do Projeto Marco antes de um pedido de homologação ou publicação. Use-o
como checklist operacional sempre que houver alterações de escopo ou retrofits
no painel.

## 1. Pacote de documentação obrigatório

- Crie ou atualize os quatro entregáveis definidos no checklist rígido
  (`01-briefing-funcional.md`, `02-pacote-conteudo.md`, `03-pacote-visual.md`,
  `04-plano-qa.md`) dentro de `miniapps/painel-controles/docs/`.
- Garanta que cada documento esteja preenchido com conteúdo real, revisado e
  assinado pelas áreas responsáveis antes de iniciar qualquer alteração de
  código.
- Registre no topo dos arquivos a data, a pessoa responsável e um resumo do que
  mudou em cada rodada.【F:manuals/entregaveis-miniapp.md†L1-L135】【F:manuals/entregaveis-miniapp.md†L137-L198】

## 2. Preparação técnica do MiniApp

- Planeje a implementação diretamente a partir do briefing e do pacote visual,
  reutilizando os componentes homologados pelo gabarito oficial.
- Monte a estrutura `miniapps/painel-controles/src/` com arquivos de layout,
  lógica e internacionalização desde o primeiro commit, reaproveitando tokens e
  classes padronizadas pelo AppBase.
- Atualize o manifesto (`src/manifest.ts`) com o identificador, capacidades e
  metadados aprovados pelo produto. A seção `capabilities.i18n` deve listar os
  idiomas suportados, o locale padrão e os caminhos para os dicionários.
- Mantenha os testes end-to-end alinhados ao plano de QA e registre qualquer
  pendência diretamente em `04-plano-qa.md` antes de pedir homologação.【F:manuals/novo-miniapp.md†L1-L120】【F:manuals/novo-miniapp.md†L122-L190】

## 3. Regras de idiomas

- Crie e mantenha sincronizados os arquivos `pt-BR.json`, `en-US.json` e
  `es-ES.json` em `miniapps/painel-controles/src/i18n/`, garantindo que todos
  compartilhem as mesmas chaves e traduções aprovadas.
- Preencha o manifesto com `supportedLocales` contendo os três idiomas e o
  `defaultLocale` definido pelo produto. Registre também no documento de
  entregáveis o contato responsável por futuras revisões de idioma.
- Valide novas strings comparando com o pacote de conteúdo e atualize os três
  dicionários simultaneamente sempre que surgir texto novo.【F:manuals/novo-miniapp.md†L122-L190】

## 4. Sincronização com o gabarito visual

- Aplique o layout, grade de 12 colunas, tokens `--ac-*` e componentes descritos
  no gabarito visual (`manuals/gabarito_visual.html`) para todos os cards, listas
  e indicadores do painel.
- Utilize as variações oficiais de minicards, botões, tabelas e gráficos. Ajustes
  só são permitidos quando documentados no pacote visual e aprovados pelo Design
  System.【F:manuals/novo-miniapp.md†L192-L279】【F:manuals/gabarito_visual.html†L25-L462】

## 5. Processo de submissão

- Antes de abrir um PR, confirme que os quatro entregáveis estão atualizados e
  anexados ao repositório, cite os manuais relevantes na descrição e solicite
  aprovação explícita de Produto, Conteúdo, Design e QA.
- Execute os testes Playwright definidos, documente resultados e garanta que
  qualquer pendência esteja registrada nos entregáveis.
- Em caso de retrofits, atualize primeiro os documentos e somente depois ajuste o
  código, mantendo o histórico das mudanças no topo de cada arquivo.【F:manuals/entregaveis-miniapp.md†L137-L198】【F:manuals/novo-miniapp.md†L192-L263】

Seguindo este guia, o MiniApp "Painel de Controles" permanece aderente às regras
operacionais de implantação do Projeto Marco e pronto para evoluções futuras com
rastreamento completo das decisões de produto.
