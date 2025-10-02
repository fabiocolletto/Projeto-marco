# Módulos Compartilhados

Esta pasta contém os módulos compartilhados utilizados pelos widgets da ferramenta de gestão de convidados.

## Conteúdo
- `marcoBus.js`: barramento de eventos para comunicação entre widgets.
- `projectStore.js`: camada de persistência e sincronização de projetos.
- `inviteUtils.js`: utilitários usados por múltiplos widgets.
- `gestaoEventosApp.css`: estilos globais reutilizados.

## Boas práticas
- Exporte sempre funções puras e side-effects controlados.
- Atualize os consumidores ao alterar APIs públicas.
- Documente mudanças relevantes em `LOG.md`.
