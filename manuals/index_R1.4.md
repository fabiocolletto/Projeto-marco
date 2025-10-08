# Índice operacional — R1.4

## Entrada oficial
- `appbase/index.html`
- `index.html` na raiz permanece como redirecionador para o AppBase.

## Política de retenção de arquivos

1. Gere os manifestos a partir do host (`appbase/index.html`):
   - `node scripts/scan-static-deps.mjs > scripts/used-static-deps.json`.
   - `npx playwright test tests/tools/trace-deps.spec.ts | sed -n '/RUNTIME_DEPS_START/,/RUNTIME_DEPS_END/p' | sed '1d;$d' > scripts/used-runtime-deps.txt`.
2. Rode `scripts/build-used-deps.sh > scripts/used-deps.txt` para consolidar
   dependências em uso com diretórios de governança (manuals/, tests/, workflows/)
   e arquivos institucionais.
3. Tudo que **não** estiver em `scripts/used-deps.txt` deve ser movido para o
   arquivo vigente (`archive/2025-10-08/…`) ou removido mediante aprovação.
4. A cada limpeza, atualize `archive/<data>/` preservando a árvore relativa dos
   arquivos movimentados. O histórico anterior (`archive/src-r0/`, etc.) permanece
   apenas para consulta.

## Governança contínua

- Workflows obrigatórios: `md-link-check.yml`, `tree-dump.yml` e `deps-audit.yml`.
  O último reconstrói os manifestos e falha se houver divergência em relação aos
  arquivos `scripts/used-*.txt`.
- Não adicione novos assets sem atualizar os manifestos e sem justificar a
  permanência do arquivo fora de `archive/`.
- Em caso de dúvida, registre um PCM e aguarde validação antes de publicar.
