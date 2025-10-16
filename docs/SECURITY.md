# Política de Segurança

## Relatar vulnerabilidades

Envie reportes para `security@miniapp-base.local` com detalhes do impacto, passos de reprodução e mitigação sugerida. Não abra issues públicas com dados sensíveis.

## SLAs

| Severidade | Tempo de triagem | Tempo para correção |
| ---------- | ---------------- | ------------------- |
| Crítica    | 24h              | 72h                 |
| Alta       | 48h              | 5 dias úteis        |
| Média      | 5 dias úteis     | 10 dias úteis       |
| Baixa      | 10 dias úteis    | 20 dias úteis       |

## Boas práticas

- Seguir o checklist [`checklists/release.md`](checklists/release.md) antes de releases.
- Nunca compartilhar tokens ou segredos em PRs/Issues.
- Atualizar dependências críticas via PR separado com revisão de segurança.

## Escalonamento

1. Notifique o **Owner** do projeto.
2. Abra canal dedicado (Slack/Teams) apenas com participantes necessários.
3. Planeje hotfix seguindo `OPERATIONS.md` e documente no `CHANGELOG.md`.
