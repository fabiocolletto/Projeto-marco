# tools/unique/

Este diretório permanece reservado para integrações pontuais ou sensíveis que não devam ir para o catálogo compartilhado.
No momento, todos os miniapps ativos foram promovidos para `tools/shared/`.

## Quando usar
- Regras corporativas específicas de um cliente/parceiro.
- Conectores que dependem de credenciais particulares ou contratos de confidencialidade.
- Experimentos que ainda não cumpriram os critérios para serem tornados públicos.

## Como documentar um módulo `unique`
1. Crie um arquivo `nomeDoModulo.unix.mjs` (sufixo `.unix` sinaliza que é temporário) com comentários iniciais explicando por que não está em `shared`.
2. Declare no topo as dependências obrigatórias (`ac`, `store`, `bus`, `getCurrentId`) e descreva no README do app como configurá-las.
3. Liste no final do arquivo os gatilhos para promoção ao catálogo comum (ex.: número de apps interessados, removal de credenciais).
4. Atualize `log.md` registrando o motivo da criação e o plano de futura migração.

Assim que o módulo se mostrar reutilizável, promova-o para `tools/shared/`, remova o sufixo `.unix` e documente a mudança na arquitetura.
