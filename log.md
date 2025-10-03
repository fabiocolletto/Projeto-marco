# Histórico do Projeto

## 2025-10-11
- Loader do shared agora aceita configuração de branch durante implantações (query string, variável global ou `configureSharedRuntime`). Documentação geral, guia arquitetural, agent e README do catálogo foram atualizados com o passo a passo para apontar o app de Eventos ao branch em homologação.

## 2025-10-10
- Unificação do CSS compartilhado em `styles/app.css`, substituindo as três folhas anteriores. `apps/eventos.html` agora carrega uma única folha via `ensureSharedStyle('styles/app.css')`, e a documentação (README, arquitetura, agent, catálogo de shared) foi atualizada para orientar novos miniapps a reutilizar essa base responsiva.

## 2025-10-09
- Consolidada a camada de estilos compartilhados: loader passou a expor `ensureSharedStyles`, `apps/eventos.html` carrega `miniapps.css`, `eventos-dashboard.css` e `convidados.css`, e os miniapps de tarefas/fornecedores foram atualizados para consumir classes comuns, eliminando `<style>` inline.

## 2025-10-08
- Consolidada a documentação operacional: README principal agora inclui passo a passo para plugar novos miniapps no app de Eventos, `docs/arquitetura.md` detalha o fluxo no HTML e o checklist pós-entrega, `agent.md` orienta automações futuras e os READMEs de `shared`/`unique` explicam quando e como utilizar cada catálogo.

## 2025-10-07
- Estruturado `tools/shared/` em camadas (`core/`, `miniapps/`, `utils/`, `runtime/`), extraindo utilitários de formatação/DOM e incorporando o `core/miniAppSync.mjs` ao app de eventos. Atualizados README, guia de arquitetura e histórico para refletir a base comum.

## 2025-10-06
- Reorganização do código base: promoção dos miniapps de eventos, tarefas, fornecedores, convidados e mensagens para `tools/shared/`, criação do loader comum `runtimeLoader.mjs` e ajuste do app de eventos para consumir a nova infraestrutura.

## 2025-10-05
- Documentada a metodologia de UX e construção de miniapps (padrão do painel de edição, sequência de eventos e checklist de entrega) para orientar futuras integrações.

## 2025-10-04
- Esclarecida a separação entre `tools/shared/` (catálogo público) e `tools/unique/` (módulos pontuais), reforçando diretrizes na documentação arquitetural.

## 2025-10-03
- Documentação expandida para orientar a evolução rumo à versão 3.0 executiva: README revisado, guia de arquitetura com ciclo de vida `mount…MiniApp` e diretrizes de estilo.

## 2025-10-02
- Adicionados arquivos de README e log para facilitar a documentação das atividades.
