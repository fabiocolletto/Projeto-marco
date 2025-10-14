# Pacote visual do MiniApp gestor-tarefas

## 1. Wireframes aprovados
- Layout baseado no gabarito visual R1.3: card de formulário à esquerda e listagem em largura total abaixo.
- Referência: quadro "Task manager" no Figma interno (`Miniapps > Gestor de tarefas > Versão 0.1`).

## 2. Componentes reutilizados
- `ac-panel-card` para blocos principais.
- `ac-form-grid`, `ac-field` e `ac-btn` do painel de cadastro oficial.
- `ac-table` com `ac-table-wrap--inner` para a listagem responsiva.
- Badges reutilizam tokens de chip (`--ac-chip-*`) para sinalizar atraso e entrega do dia.

## 3. Assets homologados
- Não há imagens ou ícones externos. Todos os elementos utilizam ícones ASCII padrão e estilos do tema.

## 4. Tokens e estilos
- Cores: `--ac-primary` para títulos, `--ac-accent` nas etiquetas de "Entrega hoje" e `--ac-crit` para atrasos.
- Tipografia: `ac-panel-card__title` (Inter 700) para títulos, texto 0.95rem para linhas da tabela.
- Espaçamentos: grid com gap de 20px entre cards e 16px dentro do formulário.
