# Agent.md

## Propósito
Este documento orienta futuras automações a manter o repositório focado no protótipo navegável do Sistema Operacional Marco. O objetivo é evoluir a mesma página HTML de forma incremental, sem reintroduzir toolchains ou estruturas desnecessárias.

## Diretrizes
- Preserve a experiência single-file: todo HTML, CSS e JavaScript residem em `index.html`.
- Novos componentes ou mini-apps devem ser adicionados como seções dentro do próprio arquivo, reutilizando o padrão de navegação existente.
- Utilize estilos consistentes com a paleta atual (tons de azul escuro, ciano e lilás) e mantenha o visual translúcido sugerido nos esboços.
- Prefira interações simples com JavaScript vanilla; só crie novas dependências se absolutamente indispensáveis.
- Documente qualquer alteração relevante no `README.md` para facilitar o entendimento de humanos e agentes.

## Checklist rápido
1. Visualizar o arquivo `index.html` localmente para garantir que a navegação entre a tela principal e os mini-apps continua funcional.
2. Confirmar que nenhum artefato ou dependência supérflua foi adicionada ao repositório.
