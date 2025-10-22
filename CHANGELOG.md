# CHANGELOG
> Padrão: SemVer `v0.x.y` (Fase PWA). Cada PR **deve** atualizar esta seção.

## [v0.1.9] - 2025-10-22
### Fixed
- Corrigido o atalho do painel do usuário para apontar para o novo layout em `sys/user-panel.html`, evitando que o shell exibisse
  a versão antiga da tela após login ou registro.

## [v0.1.8] - 2025-10-22
### Changed
- Reposicionado o bloco de metadados do shell antes do widget de serviços para destacar a versão, canal e auditoria no painel do sistema.

## [v0.1.7] - 2025-10-22
### Changed
- Reorganizado o layout do painel do sistema para posicionar os widgets de serviços e auditoria ao lado do resumo operacional em telas amplas.

## [v0.1.6] - 2025-10-22
### Added
- Novo layout compartilhado (`apps/web/sys/panel.css`) para alinhar os painéis do sistema e do usuário, garantindo consistência visual em tablets na horizontal e vertical.
- Indicadores operacionais no painel do sistema com verificação de APIs críticas, status de catálogo e métricas do ambiente.

### Changed
- Atualizado o painel do usuário para consumir a folha de estilos unificada e preservar o rodapé visível em resoluções móveis e tablet.

## [v0.1.5] - 2025-10-22
### Changed
- Ajustado o layout do painel do usuário para reduzir os espaçamentos entre widgets e distribuir melhor os cartões em telas maiores.
- Garantido que a seção de dados pessoais ocupe a largura total da grade para manter foco no formulário principal.

## [v0.1.4] - 2025-10-22
### Fixed
- Atualizada a política do service worker para buscar primeiro no servidor as páginas HTML, garantindo que o painel do usuário receba os estilos mais recentes.

## [v0.1.3] - 2025-10-22
### Fixed
- Ocultada a navegação lateral do painel do usuário para evitar itens redundantes na interface.

## [v0.1.2] - 2025-10-22
### Fixed
- Corrigido o menu do usuário no cabeçalho flutuante para telas pequenas, garantindo que os botões respondam a toques.

## [v0.1.1] - 2025-10-22
### Fixed
- Ajustado o registro do service worker para funcionar em rotas aninhadas e manter o escopo correto em builds PWA.
- Atualizado o painel do usuário em `/docs` com manifest e script compartilhados para instalação standalone.

## [v0.1.0] - YYYY-MM-DD
### Added
- Estrutura unificada (/apps, /shared, /policies, /docs).
- Migração do app web para /apps/web.
- PWA: manifest, service worker, ícones, 404.html, robots.txt.
- GitHub Actions: deploy Pages.
- Documentos: README.md e agente.md atualizados.

### Changed
- Ajustes de paths relativos e layout (header sticky sem sobreposição).

### Security
- Nenhuma mudança de segurança nesta versão.
