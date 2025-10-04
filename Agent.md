# Agent.md

## Propósito
Este documento fornece um rápido resumo para quem automatiza tarefas neste repositório, descrevendo práticas recomendadas e pontos de atenção ao modificar os módulos compartilhados do projeto.

## Diretrizes Gerais
- Utilize módulos ES (ESM) em todos os arquivos JavaScript da pasta `shared`. Os imports e exports devem ser sempre nomeados.
- Prefira funções puras e reutilizáveis; evite acoplamento com o DOM dentro de utilitários compartilhados.
- Atualize os arquivos `shared/LOG.md` e `shared/README.md` sempre que criar novos utilitários que possam ser reutilizados por outros módulos.
- Antes de abrir um PR, execute testes ou validações manuais relevantes e documente-os na seção de testes.

## Convenções de Estilo
- Mantenha indentação de dois espaços em arquivos JavaScript e Markdown.
- Use nomes descritivos em inglês para funções e constantes. Comentários podem ser escritos em português quando necessário para o contexto do produto.

## Checklist Rápido
1. Verifique se os imports relativos continuam corretos após mover ou renomear arquivos.
2. Garanta que novas funções exportadas tenham cobertura básica (manual ou automatizada).
3. Atualize a documentação quando adicionar APIs públicas.
4. Execute `npm test` ou a validação indicada no README antes de finalizar a contribuição.

Seguir estas orientações ajuda a manter o código consistente e facilita o trabalho colaborativo entre agentes e desenvolvedores humanos.
