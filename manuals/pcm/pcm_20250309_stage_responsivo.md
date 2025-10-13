---
Versão: R1.0
Data: 2025-03-09
Status: em execução
Escopo: Ajuste do breakpoint do Stage para tablets em modo paisagem
---
# PCM — Layout do Stage em tablets

## 1) Contexto
Relatos de usuários indicam que tablets em modo paisagem estavam recebendo o layout móvel, com o painel do stage iniciado em modo "card" compacto. Isso prejudica a produtividade porque a largura útil é suficiente para a experiência desktop.

## 2) Proposta
- Remover as exceções baseadas em orientação nas media queries do `appbase/app.css`.
- Manter o layout mobile apenas para larguras até 900/960/920 px, garantindo que tablets ≥ 1024 px permaneçam com a experiência desktop.

## 3) Impactos
- UX/UI: experiência desktop restaurada em tablets paisagem, mantendo mobile em telefones.
- Dados/compatibilidade: sem impacto; não há mudanças em armazenamento.
- Integrações/segurança: nenhum efeito.
- Desempenho/custos: invariável, apenas regras CSS.

## 4) Decisão (texto final para o RAP)
Unificar a lógica de breakpoint por largura, removendo condicionais por orientação para evitar que tablets em modo paisagem recebam o layout móvel.

## 5) Trigger de reversão
- Feedback apontando regressão em smartphones onde o layout desktop reaparece.
- Métricas de usabilidade indicando queda de engajamento em telas menores.

## 6) Testes/QA (critérios de aceite)
- Verificar no Chrome DevTools os breakpoints 768 px, 900 px e 1280 px, validando que apenas o primeiro ativa o layout mobile.
- Confirmar no iPad (landscape) via simulador que o stage abre com o grid desktop.
- Rodar `npm test` para garantir que a suíte E2E continua estável.

## 7) Docs afetados
- `appbase/app.css`
- Este PCM arquivado em `manuals/pcm/`

## Changelog
- O0.1: Atividade planejada para corrigir layout do stage em tablets.
- O0.2: Execução iniciada com atualização do breakpoint no CSS do Stage.
