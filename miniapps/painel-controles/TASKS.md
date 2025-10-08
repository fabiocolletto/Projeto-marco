# Painel de Controles — Próximos passos

## Checklist de implantação obrigatória
- [x] `docs/01-04` preenchidos conforme `manuals/entregaveis-miniapp.md`, com responsáveis, datas e seções padronizadas.
- [x] Dicionários alinhados (`src/i18n/pt-BR.json`, `en-US.json`, `es-ES.json`).
- [x] Manifesto exportando `miniappId`, `supportedLocales`, `dictionaries`, `localeOwner` e `releaseNotesPath`.
- [x] `docs/changelog.md` referenciado por `releaseNotesPath`.

## Roadmap funcional
1. Instrumentar o miniapp com dados reais de sessão, sincronização e backup usando o bus do AppBase.
2. Expandir os tiles de sincronização e backup com histórico em tempo real e estados de erro detalhados.
3. Implementar exportação de eventos unificada para CSV/JSON diretamente do painel.
4. Conectar os botões de ações rápidas (⋯) a menus contextuais com relatórios e atalhos relevantes.
5. Construir testes end-to-end adicionais cobrindo exportação e auditoria.

## Como acionar o serviço de idiomas
- Responsável: Laura Ribeiro (`localization@marco.app`).
- Solicitar novas chaves abrindo ticket em "Experiência Multilíngue" e anexando diff do arquivo em português.
- Atualizações entram no `docs/changelog.md` com autoria e data.
