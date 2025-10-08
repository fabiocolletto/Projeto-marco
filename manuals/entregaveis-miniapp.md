# Checklist rígido de entregáveis para novo MiniApp

> **Este documento complementa o manual rígido de criação de MiniApp** e o gabarito
> visual obrigatório. Utilize-o antes de abrir o primeiro PR para garantir que o
> pacote de documentação esteja completo.

## Visão geral

Cada MiniApp só pode entrar em revisão após anexar os quatro entregáveis abaixo.
Todos devem ser versionados na pasta do MiniApp (`miniapps/<id>/docs/`) com nome
padronizado e revisados por quem lidera o produto antes da submissão ao Codex.

| Documento | Objetivo | Formato | Responsável | Quando anexar |
|-----------|----------|---------|-------------|----------------|
| `01-briefing-funcional.md` | Descrever problema, métricas-alvo, fluxos e integrações previstas para o MiniApp. | Markdown | Product Owner ou solicitante oficial | Antes de iniciar desenvolvimento |
| `02-pacote-conteudo.md` | Consolidar vocabulário, mapa de chaves i18n e regras de tradução obrigatórias. | Markdown + anexos JSON | Pessoa de Conteúdo / Localização | Antes do primeiro commit com strings |
| `03-pacote-visual.md` | Demonstrar wireframes alinhados ao gabarito visual e listar assets homologados. | Markdown + imagens/links | Design System / UI responsável | Antes de construir telas |
| `04-plano-qa.md` | Definir critérios de aceite, cenários de teste e cobertura Playwright esperada. | Markdown | QA líder ou pessoa de qualidade | Antes de solicitar homologação |

> **Não avance para homologação** enquanto os quatro arquivos não estiverem criados
> e aprovados pelos responsáveis listados acima.

## Modelos obrigatórios

Copie os modelos a seguir para a pasta `miniapps/<id>/docs/` e substitua os
placeholders por conteúdo real. O texto entre colchetes deve ser apagado após o
preenchimento.

### 01 — Briefing funcional

```markdown
# Briefing funcional do MiniApp <ID>

## 1. Contexto e problema a resolver
- [Resumo do cenário atual]
- [Dados ou pesquisas que comprovam a necessidade]

## 2. Objetivos e métricas de sucesso
- [Objetivo principal]
- [Métricas quantitativas e qualitativas]

## 3. Público-alvo e personas
- [Persona principal]
- [Canais de descoberta / ativação]

## 4. Escopo funcional
- [Lista priorizada de funcionalidades obrigatórias]
- [Funcionalidades fora de escopo]

## 5. Integrações externas
- [APIs, serviços ou bases de dados requeridos]
- [Responsáveis por cada integração]

## 6. Riscos e dependências
- [Riscos identificados]
- [Planos de mitigação]
```

### 02 — Pacote de conteúdo

```markdown
# Pacote de conteúdo e i18n do MiniApp <ID>

## 1. Vocabulário aprovado
- [Glossário com termos obrigatórios e suas traduções]

## 2. Estrutura das chaves i18n
```json
{
  "<namespace>": {
    "<chave>": {
      "pt-BR": "<valor base>",
      "en-US": "<translation>",
      "es-ES": "<traducción>"
    }
  }
}
```

## 3. Regras de localização
- [Pluralizações e variações de gênero]
- [Links ou tokens dinâmicos permitidos]

## 4. Pendências de conteúdo
- [Itens a validar antes da homologação]
```

> Sempre valide o conteúdo com o [manual rígido de novo idioma](./novo-idioma.md)
> para garantir que os serviços automáticos possam ampliar o suporte de línguas.

### 03 — Pacote visual

```markdown
# Pacote visual do MiniApp <ID>

## 1. Wireframes aprovados
- [Link para Figma ou anexos locais]
- [Notas de interação relevantes]

## 2. Componentes reutilizados
- [Lista de componentes do gabarito visual utilizados]
- [Ajustes autorizados pelo Design System]

## 3. Assets homologados
- Arquivos: `assets/<id>/<nome>.{png,webp,svg}`
- Licença / fonte de cada asset
- Restrições de uso (fundo claro, escuro, etc.)

## 4. Tokens e estilos
- [Tokens `--ac-*` aplicados]
- [Regras tipográficas e de espaçamento]
```

> Compare cada wireframe com o [`manuals/gabarito_visual.html`](./gabarito_visual.html)
> e recuse composições que violem a grade ou os componentes padronizados.

### 04 — Plano de QA

```markdown
# Plano de QA do MiniApp <ID>

## 1. Critérios de aceite
- [Requisitos funcionais mínimos]
- [Critérios de performance e acessibilidade]

## 2. Matriz de cenários
| Cenário | Caminho feliz | Exceções | Resultado esperado |
|---------|---------------|----------|---------------------|
| 01 | [Fluxo principal] | [Erro previsto] | [Comportamento esperado] |

## 3. Automação obrigatória
- Testes Playwright a implementar (`tests/<id>/<arquivo>.spec.ts`)
- Dados de fixture necessários

## 4. Checklist pré-homologação
- [Campos preenchidos, validações de formulário]
- [Logs ou métricas a monitorar]
```

## Processo de submissão

1. Garanta que todos os arquivos foram preenchidos e adicionados ao repositório
   antes do primeiro PR do MiniApp.
2. Mencione este checklist, o [manual rígido de MiniApp](./novo-miniapp.md) e o
   gabarito visual na descrição do PR.
3. Solicite aprovação explícita de Produto, Conteúdo, Design e QA sobre seus
   respectivos documentos.
4. Ao finalizar, atualize o `README.md` interno do MiniApp descrevendo onde os
   entregáveis estão armazenados e quem são os responsáveis.

## Uso contínuo e retrofits

- Sempre que surgir uma nova solicitação de mudança (ex.: ajustes no MiniApp
  Painel de Controles), atualize primeiro os documentos `01` a `04` com o escopo
  aprovado. Somente depois ajuste código, assets ou testes.
- Registre no topo de cada arquivo a data da atualização, a pessoa responsável e
  um resumo das alterações solicitadas. O histórico textual serve como fonte de
  verdade para o Codex planejar as próximas interações.
- Inclua anexos complementares (capturas, planilhas, registros de pesquisa)
  diretamente na pasta `miniapps/<id>/docs/` ou em subpastas nomeadas por data.
  Referencie esses anexos nos modelos Markdown para manter o rastro completo.
- Durante retrofits, mantenha em `04-plano-qa.md` uma seção "Cobertura atual" e
  liste quais cenários automatizados já existem no repositório. Novos casos
  devem ser documentados aqui antes de implementados.

## Log de revisões

| Data       | Alteração | Responsável |
|------------|-----------|-------------|
| 2024-06-07 | Adiciona orientações para retrofits contínuos e controle de histórico dos entregáveis. | Codex |
| 2024-06-06 | Criação do checklist rígido de entregáveis para MiniApps. | Codex |
