# Projeto Marco — AppBase (R1)

Monorepo com **AppBase** (i18n + CSS centralizados) e **MiniApps** plugáveis.
Este R1 inclui o MiniApp **Gestor de Tarefas** para validação.

## Como testar (GitHub Pages)
1. Habilite o Pages na branch `main` (diretório `/`).
2. Acesse a URL do Pages exibida no deploy.
3. Use o catálogo para abrir o **Gestor de Tarefas**.

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
