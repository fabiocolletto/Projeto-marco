# Changelog — Painel de Controles

## 1.0.0 — 2025-01-15
### Novo
- Primeira versão do miniapp obrigatório com rail dinâmico no AppBase.
- Manifesto enriquecido com campos `supportedLocales`, `dictionaries`, `localeOwner` e `releaseNotesPath`.
- Dicionários pt-BR, en-US e es-ES alinhados com manual rígido.
- Documentação funcional, visual, de conteúdo e QA publicada na pasta `docs/`.

### Ajustado
- Painel passou a reagir ao evento `app:i18n:locale_changed`, registrando histórico de idioma.

### Corrigido
- Tratamento de fallback para manifest indisponível, evitando falha de carregamento do host.

> Responsável pelos idiomas: Laura Ribeiro — localization@marco.app (Experiência Multilíngue).
