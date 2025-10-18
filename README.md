# Projeto Marco

Este repositório contém ferramentas e módulos compartilhados utilizados pelos widgets de gestão de convidados.

## Estrutura
- `shared/`: módulos JavaScript e estilos compartilhados.
- `tools/`: ferramentas e widgets específicos do domínio.

## Fluxo de trabalho
1. Revise os arquivos `LOG.md` de cada pasta antes de iniciar uma tarefa para relembrar o histórico.
2. Crie branches de trabalho a partir da `main` e siga as instruções específicas em `AGENTS.md` quando existirem.
3. Execute os testes listados na seção de testes do widget antes de enviar alterações.

## Nova etapa do shell base
- **Menu de mini-apps**: o shell exibe um catálogo lateral com entrada dedicada para cada mini-app priorizado, permitindo navegação entre os módulos embarcados.
- **Skeletons carregáveis**: cada item carrega um skeleton específico enquanto o conteúdo remoto é obtido, garantindo feedback imediato.
- **Integração via webhook**: o catálogo será sincronizado com o backend através de um webhook; ao implementar, mantenha alinhados loader, traduções e testes end-to-end.

## Testes automatizados
Para garantir que `npm test` seja executado com sucesso no ambiente local ou na sandbox do repositório, siga os passos abaixo na primeira vez que configurar o projeto (ou sempre que atualizar a versão do Playwright):

1. Instale as dependências do projeto: `npm install`.
2. Baixe os navegadores utilizados pelo Playwright (inclui as dependências do sistema operacional): `npx playwright install --with-deps`.
   - Caso o ambiente tenha restrições de proxy e o passo acima retorne erro 403, utilize a sequência `npx playwright install chromium` seguido de `npx playwright install-deps chromium` para completar a configuração.
3. Execute a suíte de testes: `npm test`.

Caso algum passo falhe, ajuste o ambiente de acordo com a mensagem de erro e repita os comandos até que o teste finalize com sucesso.

## Publicação
- O GitHub Pages do projeto aponta para `index.html`, que redireciona automaticamente para `miniapps/base_shell/`.
- Em caso de problemas no redirecionamento automático, acesse manualmente `https://<org>.github.io/Projeto-marco/miniapps/base_shell/`.

## Convenções
- Utilize módulos ES (`type="module"`) para novos scripts.
- Prefira imports relativos locais e utilize os CDNs somente como fallback.
- Documente decisões relevantes no arquivo de log da pasta correspondente.

## Documentação adicional
- [SECURITY.md](SECURITY.md): práticas para proteger os segredos de produção, aprovações de ambiente e cabeçalhos exigidos pelo webhook.
- [OPERATIONS.md](OPERATIONS.md): guia operacional para disparar o workflow `dispatch-post-make.yml`, exemplos de payload, testes e troubleshooting.
