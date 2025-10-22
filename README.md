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
