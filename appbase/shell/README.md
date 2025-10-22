# AppBase • MiniApp Shell

Esta pasta oferece uma variante atual do shell base usada como referência
no `appbase`. Em vez de manter uma cópia independente do código, a página
carrega diretamente o shell ativo (`apps/web`). Isso garante
que os estilos, utilitários de internacionalização, tema e autenticação
permaneçam alinhados com a experiência publicada.

## Como usar
1. Inicie o servidor local com `npm run dev`.
2. Acesse `http://localhost:4173/appbase/shell/`.
3. O layout, os menus e o fluxo de autenticação são os mesmos do shell
   oficial; utilize esta versão para validar integrações ou criar novas
   variações.

Qualquer atualização aplicada ao shell base é refletida automaticamente
no AppBase, dispensando sincronizações manuais.
