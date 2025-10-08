# Briefing funcional do MiniApp Painel de Controles

> Atualizado em 2025-01-15 · Responsável: Laura Ribeiro (Product Owner) · Contexto: primeira entrega alinhada ao manual rígido de MiniApps.

## 1. Contexto e problema a resolver
- O AppBase Marco precisa de um miniapp obrigatório que habilite o cadastro inicial de operadores e monitore sincronização e backups do tenant.
- A ausência de um fluxo unificado gera cadastros manuais dispersos, perda de visibilidade sobre integrações críticas e falhas de auditoria.

## 2. Objetivos e métricas de sucesso
- Permitir cadastro e atualização de credenciais locais diretamente no host sem dependência de ferramentas externas.
- Exibir, em tempo real, o status das integrações de sincronização e backup com indicação clara de disponibilidade.
- Registrar histórico auditável de eventos relevantes (login, logout, mudança de idioma, exportações) com rastreabilidade completa.
- Métricas alvo:
  - Tempo médio de ativação de uma estação Marco < 2 minutos.
  - 0 incidentes de exportação sem registro auditável no período de lançamento.
  - 100% de aderência ao manual rígido (docs, i18n completo, manifesto enriquecido e testes derivados do plano de QA).

## 3. Público-alvo e personas
- Operadores de campo responsáveis por provisionar estações Marco em clientes corporativos.
- Times de Suporte/Customer Success que acompanham a saúde de sincronização do tenant.
- Analistas de Compliance encarregados de auditorias de exportação e políticas LGPD.

## 4. Escopo funcional
- **Cadastro de operador** com validações de telefone nacional e senha forte, persistido em IndexedDB/localStorage.
- **Indicadores de sessão** exibindo status atual, último login, contagem de eventos e estado das integrações críticas.
- **Controles de sincronização e backup** com switches mestre, feedback imediato e registro de horário da última execução.
- **Histórico auditável** em tabela cronológica cobrindo login/logout, alteração de idioma e eventos de exportação.
- **Ação de exportação** conectada ao serviço de auditoria do AppBase, registrada no histórico local.
- Fora de escopo nesta versão: provisionamento de múltiplos usuários do tenant e gráficos analíticos avançados.

## 5. Integrações externas
- Utiliza utilitários existentes do host (`storage/indexeddb.js`) para persistência local; não há chamadas a APIs externas nesta fase.
- Publica e consome eventos no bus interno do AppBase para manter sincronização com outros módulos.
- Registro de exportações integrado ao serviço de auditoria do AppBase (mockado durante a fase beta).

## 6. Riscos e dependências
- Dependência do runtime do AppBase para emitir `app:i18n:locale_changed`; falhas impedem atualização do histórico de idioma.
- Interrupções em storage local podem impedir restauração de sessão — mitigar com verificações de disponibilidade e fallback seguro.
- Necessidade de ampliar cobertura Playwright para validar fluxo completo antes da homologação pública.
