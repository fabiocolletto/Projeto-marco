# Verificando e evitando conflitos ao abrir um PR

Para reduzir surpresas na hora de abrir um pull request, é importante conferir o estado da branch local em relação ao branch de base e resolver conflitos com antecedência. Use as etapas abaixo como guia.

## 1. Confira se o histórico divergiu

```bash
git fetch origin
# supondo que sua branch de base seja Projeto-Marco
git status
```

Após o `git fetch`, o `git status` mostra se sua branch está "à frente" ou "atrás" da origem. Para listar commits que existem apenas na base ou na sua branch, use:

```bash
git log --oneline --graph --decorate --left-right Projeto-Marco...HEAD
```

Entradas com `<` pertencem à base, `>` pertencem à sua branch. Se houver muitos `<`, vale atualizar a base local.

## 2. Simule o merge/local rebase

Antes de abrir o PR, tente mesclar ou rebaser sua branch com a base atualizada. Isso revela conflitos que surgiriam no PR.

### Opção A — merge da base

```bash
git merge origin/Projeto-Marco
```

### Opção B — rebase na base

```bash
git rebase origin/Projeto-Marco
```

Se conflitos aparecerem, o Git indicará os arquivos afetados. Resolva-os manualmente, marque-os como prontos com `git add` e finalize o merge (`git commit`) ou rebase (`git rebase --continue`).

## 3. Use `git status` e `git diff`

Enquanto resolve conflitos, rode `git status` para ver arquivos pendentes e `git diff` para revisar as alterações. Só prossiga quando não houver mais arquivos em conflito.

## 4. Execute os testes do projeto

Conflitos resolvidos podem introduzir regressões. Rode a suíte de testes (por exemplo, `npm test`, `npm run test:e2e`, etc.) para garantir que o código resultante continua íntegro.

## 5. Atualize o PR periodicamente

Se o PR ficar aberto por muito tempo, repita o processo: `git fetch`, merge/rebase com a base atual e reaplique testes. Isso evita que conflitos se acumulem.

## Dicas adicionais

- Configure proteção de branch no repositório para exigir merges limpos.
- Use ferramentas de CI que executam testes e avisam sobre conflitos automaticamente.
- Avise o time quando fizer força-push após um rebase, para que todos atualizem suas cópias locais.

Seguindo essas práticas, você identifica conflitos antes de abrir o PR e entrega uma branch pronta para ser integrada.
