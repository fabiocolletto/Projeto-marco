# Agent.md

## Propósito
Este documento fornece um rápido resumo para quem automatiza tarefas neste repositório, descrevendo práticas recomendadas e pontos de atenção ao modificar os módulos compartilhados do projeto.

## Diretrizes Gerais
- Leia `docs/registro-log.md` antes de planejar ou executar qualquer tarefa para compreender o contexto recente e a versão atual do sistema.
- Utilize módulos ES (ESM) em todos os arquivos JavaScript da pasta `shared`. Os imports e exports devem ser sempre nomeados.
- Prefira funções puras e reutilizáveis; evite acoplamento com o DOM dentro de utilitários compartilhados.
- Atualize os arquivos `shared/LOG.md` e `shared/README.md` sempre que criar novos utilitários que possam ser reutilizados por outros módulos.
- Registre toda entrega no `docs/registro-log.md`, incluindo data, descrição e número de versão sequencial, e sincronize o valor em `VERSION` com a última entrada. Garanta que a tabela `release_log` (Supabase) receba o mesmo conteúdo através de migrações/seed quando aplicável.
- Antes de abrir um PR, execute testes ou validações manuais relevantes e documente-os na seção de testes.

## Convenções de Estilo
- Mantenha indentação de dois espaços em arquivos JavaScript e Markdown.
- Use nomes descritivos em inglês para funções e constantes. Comentários podem ser escritos em português quando necessário para o contexto do produto.

## Checklist Rápido
1. Consulte `docs/registro-log.md` antes de iniciar qualquer planejamento ou execução.
2. Verifique se os imports relativos continuam corretos após mover ou renomear arquivos.
3. Garanta que novas funções exportadas tenham cobertura básica (manual ou automatizada).
4. Atualize a documentação quando adicionar APIs públicas.
5. Execute `npm test` ou a validação indicada no README antes de finalizar a contribuição.
6. Adicione uma nova linha ao `docs/registro-log.md` descrevendo o trabalho entregue, incrementando o número de versão e atualizando o arquivo `VERSION`.

Seguir estas orientações ajuda a manter o código consistente e facilita o trabalho colaborativo entre agentes e desenvolvedores humanos.
