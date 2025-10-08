# Arquivo histórico

Este diretório armazena versões anteriores do protótipo e MiniApps do Marco.
Os artefatos aqui presentes são somente para consulta; não devem receber
patches diretos. Ao evoluir o produto:

- mantenha a versão ativa de cada MiniApp em `miniapps/<nome>/`;
- mova releases anteriores para `archive/miniapps/<nome>/<versao>/` e registre a
  alteração no `docs/changelog.md` correspondente;
- utilize `archive/src-r0/` apenas como referência ao protótipo modular legado.

Mudanças operacionais devem ser conduzidas a partir do shell atual em
`appbase/` seguindo os manuais N1.
