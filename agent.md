# Agent.md

## Propósito
Este documento fornece um rápido resumo para quem automatiza tarefas neste repositório, descrevendo práticas recomendadas e pontos de atenção ao modificar os módulos compartilhados do projeto.

## Objetivos do AppBase
- Estabelecer um AppBase único que sirva de fundação para qualquer aplicativo desenvolvido pela 5 Horas, garantindo evolução consistente e reaproveitamento de componentes.
- Padronizar um header institucional e um footer permanentes, com os mesmos menus, atalhos e links globais em todas as implementações derivadas.
- Definir o body como um container vazio preparado para receber o conteúdo específico de cada aplicativo, preservando a estrutura base.
- Centralizar a gestão de documentos, fontes e demais ativos compartilhados para facilitar a escalabilidade e a manutenção contínua da plataforma.
- Garantir que 100% do estilo seja herdado do arquivo CSS único localizado na pasta Shared, assegurando consistência visual entre todos os aplicativos derivados.

## Diretrizes Gerais
-

## Convenções de Estilo
-

## Checklist Rápido
1. Antes de finalizar qualquer alteração que afete a interface, execute `npm run test:visual` para garantir que os cenários visuais continuam funcionando.

Seguir estas orientações ajuda a manter o código consistente e facilita o trabalho colaborativo entre agentes e desenvolvedores humanos.
