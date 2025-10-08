# Plano de QA do MiniApp Boas-vindas

> Atualizado em 2025-01-16 · Responsável: Thiago Martins (QA Lead).

## 1. Critérios de aceite
- Rail do AppBase deve exibir dois cartões habilitados por padrão: "Painel de Controles" e "Boas-vindas Marco".
- Mudança de idioma deve atualizar título, subtítulo, CTA e badges do cartão de Boas-vindas.
- Card deve abrir o painel oficial sem erros adicionais no console.

## 2. Matriz de cenários
| Cenário | Caminho feliz | Exceções | Resultado esperado |
|---------|---------------|----------|--------------------|
| 01 — Renderização inicial | Abrir `appbase/index.html` com storage limpo. | Fallback de manifest. | Card de Boas-vindas aparece ao lado do Painel e CTA habilita o painel. |
| 02 — Tradução | Alternar pt-BR → en-US → es-ES via menu global. | Falha no AppBaseI18n. | Os três textos do cartão refletem o idioma atual sem placeholders. |
| 03 — Fallback local | Forçar manifest 500. | Sem fallback definido. | Card é marcado com `data-fallback="true"` e mostra nota de fallback, sem erros `console.error`. |

## 3. Automação obrigatória
- Estender `tests/miniapp-loader.spec.js` com asserts para o card de Boas-vindas.
- Criar teste dedicado validando tradução do novo card.

## 4. Checklist pré-homologação
- Executar `npm test` e anexar saída ao PR.
- Revisar manualmente o botão CTA garantindo que abre o painel sem duplicar eventos.
- Validar acessibilidade: cartão deve ter `role="listitem"`, `tabIndex="0"` e responder a teclado.

## Cobertura atual
- Automação pendente: adicionada nesta rodada para contemplar cards múltiplos e traduções do Boas-vindas.
