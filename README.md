# Projeto Marco — AppBase (R1)

Monorepo com **AppBase** (i18n + CSS centralizados) e **MiniApps** plugáveis.
Este R1 inclui o MiniApp **Gestor de Tarefas** para validação.

## Como testar (GitHub Pages)
1. Habilite o Pages na branch `main` (diretório `/`).
2. Acesse a URL do Pages exibida no deploy.
3. Use o catálogo para abrir o **Gestor de Tarefas**.
4. Clique em “Entrar” no AppBase e confirme o código enviado por e-mail; apenas usuários autenticados podem gravar dados.

## Estrutura
- `appbase/`: shell, i18n e CSS
- `miniapps/gestor-de-tarefas/`: exemplo **sem CSS próprio**
- `.github/workflows/`: Pages + Preview + CI leve

## Políticas
- **Sem segredos** no repo. Integrações via Make.com.
- **Sem CSS nos MiniApps**. Use tokens/utilitários do AppBase.

## Deploy (Supabase + Pages)
1. Instale o [Supabase CLI](https://supabase.com/docs/guides/cli) localmente com `npx supabase@latest init` para gerar `supabase/config.toml` e mantenha as migrações em `supabase/migrations/`.
2. Gere novas migrações com `npx supabase migration new <descricao>` e aplique-as via `npx supabase db push --local` durante o desenvolvimento.
3. Committe sempre o conteúdo de `supabase/config.toml`, `supabase/migrations/` e `supabase/seed.sql` para que o pipeline reflita o estado atual do banco.
4. No GitHub, registre os segredos `SUPABASE_SERVICE_ROLE` (token de acesso) e `SUPABASE_DB_PASSWORD` (senha do banco) e crie a variável de repositório `SUPABASE_PROJECT_REF`.
5. Os workflows `pages.yml` (produção) e `preview.yml` (staging) executam automaticamente `supabase db push` e `supabase functions deploy` antes de publicar o artefato Pages.
6. Estruture cada função Edge em um diretório dentro de `supabase/functions/` para que o job de deploy faça o loop e publique todas as funções encontradas.
7. Atualize `docs/registro-log.md` e `VERSION` sempre que novas migrações forem adicionadas ou quando o fluxo de deploy for alterado.

## Catálogo e registro via Supabase
- O catálogo de MiniApps (`miniapps` e `miniapp_translations`) e o registro de lançamentos (`release_log`) agora residem no Supabase com RLS habilitado. As migrações em `supabase/migrations/` populam os dados iniciais.
- Views utilitárias (`miniapps_catalog_v1`, `release_log_latest_v1`) ficam versionadas em `supabase/functions/` e são expostas via REST.
- O AppBase tenta consumir essas views usando os metadados `supabase-url`, `supabase-anon-key` (ou o objeto global `window.__APPBASE_SUPABASE__`). Caso nenhuma credencial esteja configurada, os arquivos estáticos em `docs/` e `miniapps/` funcionam como fallback temporário.

## Configuração de credenciais Supabase
- O AppBase consome os metadados `supabase-url` e `supabase-anon-key` para inicializar o cliente web. Preencha-os usando as variáveis de ambiente:
  - `SUPABASE_URL`: URL base do projeto (ex.: `https://xxxxx.supabase.co`).
  - `SUPABASE_ANON_KEY`: chave pública (`anon`) gerada no painel do Supabase.
- Em ambientes locais, exporte as variáveis e injete-as antes de publicar a página (por exemplo, criando um pequeno script que define `window.__APPBASE_SUPABASE__`).
- No GitHub Pages, adicione as duas variáveis como **Secrets** da environment `production` (Settings → Pages → Secrets). Elas ficam acessíveis no workflow como `${{ secrets.SUPABASE_URL }}` e `${{ secrets.SUPABASE_ANON_KEY }}` — utilize-as para gerar as metatags abaixo antes de chamar `actions/upload-pages-artifact@v3`:

```sh
cat <<'EOF' > appbase/scripts/supabase-env.js
window.__APPBASE_SUPABASE__ = {
  url: "${SUPABASE_URL}",
  anonKey: "${SUPABASE_ANON_KEY}"
};
EOF
```

```yaml
      - name: Inject Supabase config
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
            cat <<'EOF' > appbase/scripts/supabase-env.js
window.__APPBASE_SUPABASE__ = {
  url: "${SUPABASE_URL}",
  anonKey: "${SUPABASE_ANON_KEY}"
};
EOF
            sed -i "s#</body>#  <script src=\"./scripts/supabase-env.js\"></script>\n</body>#" appbase/index.html
          fi
```

- Como alternativa, injete `<meta name="supabase-url">` e `<meta name="supabase-anon-key">` com os valores correspondentes caso prefira não criar o script.
