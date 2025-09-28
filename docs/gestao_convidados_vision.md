# Visão Técnica para o Aplicativo "Assistente Cerimonial"

## Objetivo
Entregar uma aplicação web modular que permita ao cerimonialista gerir eventos, convidados, convites, mensagens, agenda e relatórios em um fluxo coerente e responsivo, com suporte a operação offline parcial quando embutida no Elementor.

## Stack Recomendada
- **Base**: Aplicação front-end SPA em JavaScript moderno (ESM) hospedada em CDN.
- **Framework**: Preact + Signals (leve e compatível com ambientes com restrições como Elementor) ou Lit para componentes Web nativos. Optar por Preact para melhor ecossistema.
- **Estado**: Zustand ou Signals para store reativo. Persistência em `localStorage` com sincronização opcional via API REST (quando disponível).
- **Build**: Vite para bundling, geração de módulos ESM e versão standalone (single HTML com assets embutidos via Rollup plugins).
- **Estilização**: Tailwind (modo JIT) para agilidade + tokens customizados, gerando CSS purgado e inline no standalone.

## Estrutura de Módulos
1. **Shell Principal**
   - Header com identificação do evento ativo e usuário.
   - Tabs: Evento, Convidados, Convites, Mensagens & Agenda, Relatórios.
   - Drawer lateral para navegação secundária e configurações.

2. **Evento (Primeira Aba)**
   - Formulário completo de dados do evento (nome, data, local, orçamento).
   - Botão "Criar primeiro evento" exibido quando não houver eventos; cria rascunho e direciona ao formulário.
   - Suporte a múltiplos eventos com seletor no header.

3. **Convidados**
   - Tabela com importação CSV e status.
   - Filtros rápidos, bulk actions, status tracking.

4. **Convites**
   - Geração automática de convites (PDF/WhatsApp) com templates.
   - Controle de envios e confirmações.

5. **Mensagens & Agenda**
   - Timeline de atividades com integração a notificações.
   - Templates de mensagens reutilizáveis.

6. **Relatórios**
   - Dashboards com métricas (RSVP, orçamento, logística).
   - Exportação para PDF.

## Integrações e Persistência
- **Shared Functions**: manter em `/shared` utilitários consumidos tanto pela versão CDN quanto pela standalone.
- **API**: Interface REST (`/api/events`, `/api/guests`, etc.) opcional; fallback local garante funcionamento offline.
- **Storage**: Estratégia `IndexedDB` (Dexie) para dados volumosos e sincronização quando online.

## Fluxo de Desenvolvimento
1. **Refactor** atual para módulos Preact + stores.
2. **Implementar Estado Global**: eventos -> convidados -> convites.
3. **Criar Seeds**: evento em branco ao iniciar; wizard para onboarding.
4. **Testes**:
   - Unitários com Vitest (stores, helpers).
   - Componentes com Testing Library.
   - E2E com Playwright em modo standalone.
5. **Build Targets**:
   - `standalone.html` com assets inline.
   - `elementor.bundle.js` para embed (carrega via script único).
6. **Automação**: GitHub Actions rodando lint, testes e build.

## Plano de Entrega
- **Sprint 1**: Setup build/tooling, conversão shell + aba Evento com criação inicial.
- **Sprint 2**: Módulos Convidados/Convites com integração ao store.
- **Sprint 3**: Mensagens & Agenda + Relatórios + exportações.
- **Sprint 4**: Refinos UX, performance, acessibilidade, testes E2E completos.

## Métricas de Sucesso
- Carregamento inicial < 2s em conexão 4G.
- Score Lighthouse > 90 em Performance, Accessibility, Best Practices.
- 100% das ações críticas funcionais no modo offline (evento, convidado, convite).

