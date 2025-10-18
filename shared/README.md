# Módulos Compartilhados

Esta pasta contém os módulos compartilhados utilizados pelos widgets da ferramenta de gestão de convidados.

## Conteúdo
- `marcoBus.js`: barramento de eventos para comunicação entre widgets.
- `projectStore.js`: camada de persistência e sincronização de projetos.
- `inviteUtils.js`: utilitários usados por múltiplos widgets.
- `listUtils.js`: funções `normalizeName` e `stripNumbersFromName` para tratar nomes antes da criação dos convites.
- `higienizarLista.mjs`: camada de compatibilidade que reexporta os utilitários de nomes e provê `deriveTelefone`.
- `auth/register.js`: inicialização do formulário de cadastro, incluindo helpers `formatBrazilPhoneDigits` e `applyPhoneMask` para máscara de telefone brasileiro.
- `gestaoEventosApp.css`: estilos globais reutilizados.

## Boas práticas
- Exporte sempre funções puras e side-effects controlados.
- Atualize os consumidores ao alterar APIs públicas.
- Documente mudanças relevantes em `LOG.md`.
