# Pacote visual do MiniApp Painel de Controles

> Atualizado em 2025-01-15 · Responsável: Felipe Nascimento (Design System) · Referência: gabarito visual R1.3 documentado em `manuals/gabarito_visual.html`.

## 1. Wireframes aprovados
- Figma: [Painel de Controles — R1.0](https://www.figma.com/file/EXEMPLO) — replica os blocos de rail, palco e painel apresentados no gabarito visual.
- Notas de interação:
  - O rail utiliza o componente "MiniCard" tamanho médio (`.minicard.minicard--md`) com estado ativo destacado por `--ac-accent`.
  - O palco mantém grade de 12 colunas, com tabela de histórico ocupando `.span-12` e indicadores em `.span-4` conforme gabarito.

## 2. Componentes reutilizados
- **MiniCards** (`.minicard.minicard--md`) para listagem de miniapps, respeitando estados ativo, hover e desabilitado descritos no gabarito.【F:manuals/gabarito_visual.html†L489-L534】
- **Cards métricos** para KPIs de sessão, sincronização e backup, reutilizando estrutura de títulos e indicadores padrão.【F:manuals/gabarito_visual.html†L216-L324】
- **Tabela auditável** com cabeçalho fixo (`.table-wrap`) para o histórico, incluindo divisores e rolagem conforme modelo oficial.【F:manuals/gabarito_visual.html†L326-L401】
- **Botões primários** (`.ac-btn.ac-btn--primary`) e botões fantasma (`.ac-btn.ac-btn--ghost`) alinhados à paleta oficial.【F:manuals/gabarito_visual.html†L403-L488】

## 3. Assets homologados
- Assets próprios não são necessários nesta fase. Ícones de ação utilizam o set oficial `data-ic` (`menu`, `info`, `warn`) documentado no gabarito; não usar emojis ou bibliotecas externas.【F:manuals/gabarito_visual.html†L403-L488】
- Caso novos assets sejam requisitados, armazená-los em `miniapps/painel-controles/assets/` com licença e restrições de uso registradas neste arquivo.

## 4. Tokens e estilos
- Paleta base: `--ac-primary`, `--ac-accent`, `--ac-muted`, `--ac-card-bg` conforme tokens do AppBase; variações escuras seguem `:root[data-theme='dark']` já definidos em `appbase/app.css`.
- Tipografia: Inter/system-ui com hierarquia `Heading 4` para títulos de MiniCard e `Heading 3` para cabeçalho do painel, seguindo pesos aprovados no gabarito.
- Espaçamento: margens verticais de 24 px entre seções principais, padding interno de 20 px em cards e 14 px em tabelas.
- Estados: borda ativa utilizando `var(--ac-accent)`, sombras `box-shadow: 0 16px 32px var(--ac-shadow)` no hover de MiniCards, opacidade 0.6 para estados desabilitados.
