# Projeto Marco

Este repositório contém ferramentas e módulos compartilhados utilizados pelos widgets de gestão de convidados.

## Estrutura
- `shared/`: módulos JavaScript e estilos compartilhados.
- `tools/`: ferramentas e widgets específicos do domínio.

## Fluxo de trabalho
1. Revise os arquivos `LOG.md` de cada pasta antes de iniciar uma tarefa para relembrar o histórico.
2. Crie branches de trabalho a partir da `main` e siga as instruções específicas em `AGENTS.md` quando existirem.
3. Execute os testes listados na seção de testes do widget antes de enviar alterações.

## Publicação
- O GitHub Pages do projeto aponta para `index.html`, que redireciona automaticamente para `miniapps/base_shell/`.
- Em caso de problemas no redirecionamento automático, acesse manualmente `https://<org>.github.io/Projeto-marco/miniapps/base_shell/`.

## Convenções
- Utilize módulos ES (`type="module"`) para novos scripts.
- Prefira imports relativos locais e utilize os CDNs somente como fallback.
- Documente decisões relevantes no arquivo de log da pasta correspondente.
