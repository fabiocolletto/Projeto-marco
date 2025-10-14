# Plano de QA do MiniApp gestor-tarefas

## 1. Critérios de aceite
- Permitir criar tarefas apenas com título obrigatório, armazenando dados localmente.
- Exibir tabela com tarefas ordenadas por prazo (mais próximos primeiro) e destaque para atrasos/entregas do dia.
- Possibilitar atualização de status via seletor inline e refletir contagem no resumo superior.
- Remover tarefa deve atualizar a listagem e o resumo imediatamente.

## 2. Matriz de cenários
| Cenário | Caminho feliz | Exceções | Resultado esperado |
|---------|---------------|----------|---------------------|
| 01 | Criar três tarefas com prazos diferentes | Falha de armazenamento local | Tarefas exibidas em ordem, resumo atualizado com contagens corretas |
| 02 | Alterar status de tarefa pendente para concluída | Tentativa com status inválido | Badge de status atualizado, contagem de concluídas incrementada |
| 03 | Remover tarefa concluída | Nenhuma | Linha removida e resumo recalculado |
| 04 | Criar tarefa sem prazo | Nenhuma | Linha mostra texto "Sem prazo" e permanece ordenada após itens com data |

## 3. Automação obrigatória
- Playwright: fluxo end-to-end cobrindo criação, atualização de status e remoção (`tests/miniapp-task-manager.spec.js`).
- Fixture de tarefas em memória para validar ordenação e marcação de atraso via manipulação de `localStorage`.

## 4. Checklist pré-homologação
- Validar acessibilidade dos controles (labels associados e leitura de badges por leitores de tela).
- Garantir limpeza do `localStorage` ao encerrar testes automatizados.
- Revisar textos em pt-BR/en-US/es-ES e conferir placeholders.
