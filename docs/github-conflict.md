# Análise de conflito do GitHub

## Resumo do problema
O pull request aberto a partir do branch `work` não pode ser mesclado automaticamente
porque os arquivos principais do hub de gestão foram reescritos ao mesmo tempo em que o
branch principal do repositório também recebeu alterações sobre as mesmas regiões. Quando
o Git tenta conciliar os dois históricos, os trechos editados em paralelo entram em
conflito e o GitHub exibe o aviso mostrado na interface de revisão.

## Arquivos envolvidos
- `shared/gestaoEventosApp.css` passou a concentrar toda a folha de estilos compartilhada
do hub na revisão atual. O arquivo antigo do repositório principal possui outra
estrutura (por exemplo, cores e grids diferentes) e, por isso, o Git detecta que os dois
branches editaram o mesmo arquivo de maneiras incompatíveis.【F:shared/gestaoEventosApp.css†L1-L84】
- `tools/gestao-de-convidados/app.html` foi reconstruído para exibir o status do shell e
os atalhos para cada módulo dentro do widget. A versão existente no branch principal ainda
contém o layout anterior, sem o cabeçalho "Central de gestão". Quando o merge é calculado,
ambas as versões alteram o mesmo cabeçalho `<main>` e o `<script>` de inicialização, gerando
o conflito que o GitHub solicita resolver manualmente.【F:tools/gestao-de-convidados/app.html†L1-L60】
- Todos os demais pontos de entrada (`eventos.html`, `convidados.html`, `fornecedores.html`,
`mensagens.html`, `tarefas.html`) receberam o `<link rel="stylesheet"` apontando para a nova
folha compartilhada. O branch remoto também ajustou esses cabeçalhos, logo as edições
concorrentes exigem uma escolha manual de qual versão será mantida.【F:tools/gestao-de-convidados/eventos.html†L1-L20】

## Como resolver
1. Atualize o branch `work` com a última versão do branch principal (`git fetch origin &&
   git merge origin/main` ou `git rebase origin/main`).
2. Ao encontrar os arquivos marcados com `<<<<<<<`, selecione a estrutura desejada
   (por exemplo, mantenha o novo `<link rel="stylesheet">` e preserve qualquer conteúdo
   adicional que exista no branch principal).
3. Finalize o merge com `git add` nos arquivos resolvidos e `git commit` para concluir.
4. Envie o branch atualizado (`git push origin work`) para que o pull request perca o aviso
de conflito.

Seguindo esses passos, o GitHub conseguirá atualizar o pull request sem conflitos.
