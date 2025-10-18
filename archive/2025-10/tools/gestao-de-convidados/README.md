# Widgets de Gestão de Convidados

Este diretório abriga os widgets modulares utilizados para acompanhar eventos, convidados, fornecedores, mensagens e tarefas.

## Arquivos principais
- `app.html`: aplicativo completo que reúne os widgets em uma única interface.
- `widget-shell.html`: casca responsável por carregar `app.html` em um iframe com validações de segurança.
- `eventos.html`, `convidados.html`, `fornecedores.html`, `mensagens.html`, `tarefas.html`: widgets individuais especializados.

## Práticas recomendadas
- Use `loadShared` para priorizar imports locais e aplicar fallbacks apenas quando necessário.
- Valide a presença de `store`, `bus` e `inviteUtils` (quando aplicável) antes de inicializar a lógica do widget.
- Atualize o log ao implementar melhorias ou registrar comportamentos conhecidos.
