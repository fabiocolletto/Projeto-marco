# Gestão de convidados – estrutura dos módulos

Este diretório precisa conter os três módulos principais que compõem a sessão da ferramenta dentro do Elementor:

| Arquivo | Responsabilidade |
| --- | --- |
| `app_header.mjs` | Renderiza o cabeçalho com seletor de eventos, painel do usuário e painel do evento ativo. Expõe o helper `buzz()` para que outras abas sincronizem o cabeçalho após alterações. |
| `event_editor.mjs` | Disponibiliza os formulários de edição automática dos dados do cliente (cerimonialista) e do evento selecionado, ouvindo o evento global `ac:project-change`. |
| `ferramenta.mjs` | Monta o shell completo da ferramenta, injeta o cabeçalho em uma sessão independente e ativa as abas/carregamento preguiçoso dos demais módulos. |

Caso algum desses arquivos seja movido ou renomeado, a montagem da sessão falhará. Verifique sempre após alterações com `npm run lint` (quando disponível) e recarregue a página da ferramenta para garantir que o cabeçalho e o editor continuam funcionando.
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
