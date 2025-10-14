# Briefing funcional do MiniApp gestor-tarefas

## 1. Contexto e problema a resolver
- Squads do AppBase distribuem atividades em planilhas isoladas, o que dificulta acompanhar entregas e identificar atrasos.
- A liderança precisa de uma visão leve dentro do AppBase para validar o andamento das tarefas sem abrir ferramentas externas.

## 2. Objetivos e métricas de sucesso
- Disponibilizar um painel simples que concentre cadastro, prazos e situação das tarefas.
- Métricas: adoção por squads internos (>= 3 equipes utilizando), redução de tarefas atrasadas sem registro (-30%) e feedback positivo sobre clareza de status (>80%).

## 3. Público-alvo e personas
- Product Owners e líderes de squad que já utilizam o AppBase no dia a dia.
- Analistas operacionais que precisam atualizar rapidamente o estado das entregas.

## 4. Escopo funcional
- Criar tarefas com título, prazo opcional e status inicial.
- Visualizar tarefas em uma tabela com alerta de prazo vencido e marcador para entregas do dia.
- Atualizar status diretamente pela listagem e remover tarefas concluídas ou canceladas.
- Persistir dados no `localStorage` seguindo o namespace do AppBase.
- Fora de escopo: atribuição por responsável, comentários, anexos e sincronização com APIs externas.

## 5. Integrações externas
- Não há integrações externas na versão beta. Persistência local apenas.
- Futuras integrações (fora de escopo atual) podem utilizar o serviço `_base/sync` após validação de PCM.

## 6. Riscos e dependências
- Necessidade de manter consistência visual com o painel principal — mitigado seguindo o gabarito oficial.
- Crescimento do volume de tarefas pode exigir paginação ou filtros em versões futuras.
- Dependência do manual de novo idioma para ampliar suporte além de pt-BR, en-US e es-ES.
