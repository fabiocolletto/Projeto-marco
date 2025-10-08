# Briefing funcional do MiniApp Boas-vindas

> Atualizado em 2025-01-16 · Responsável: Laura Ribeiro (Product Owner) · Objetivo: disponibilizar um cartão de demonstração que
> acompanha o AppBase Base durante a fase de validação.

## 1. Contexto e problema a resolver
- Durante a fase piloto do AppBase, precisamos de um MiniApp extremamente simples que sirva como cartão de validação para o
  fluxo de instalação automática e para a renderização do rail quando múltiplos MiniApps estiverem habilitados.
- A ausência desse cartão de demonstração dificultava testar o comportamento do rail com mais de um item, bem como validar os
  metadados exigidos pelo serviço de novo idioma.

## 2. Objetivos e métricas de sucesso
- Disponibilizar um MiniApp adicional pronto para uso que reutilize o módulo de painel já homologado, garantindo consistência
  enquanto exercita o pipeline de manifestos, i18n e fallback local.
- Verificar que o AppBase permanece funcional com dois MiniApps habilitados por padrão.
- Métrica: 100% das execuções de `npm test` devem continuar passando após habilitar o novo MiniApp.

## 3. Público-alvo e personas
- Time interno de Produto e QA responsável por validar o AppBase Base antes da inclusão de MiniApps reais de clientes.
- Desenvolvedores que precisam inspecionar um exemplo completo de documentação, manifesto e i18n para criar novos MiniApps.

## 4. Escopo funcional
- Card do rail com título e descrição de boas-vindas, apontando para o painel existente.
- Manifesto completo (`miniappId`, `supportedLocales`, `dictionaries`, `localeOwner`, `releaseNotesPath`) para servir como gabarito.
- Reutilização do módulo `painel-controles` para manter o comportamento principal enquanto a equipe valida a instalação
  automatizada.
- Fora de escopo: alterações no formulário de cadastro, métricas ou integrações do painel.

## 5. Integrações externas
- Nenhuma integração adicional além da já utilizada pelo módulo `painel-controles`.

## 6. Riscos e dependências
- Manter o cartão alinhado ao manual visual evita divergências com futuros MiniApps.
- Qualquer mudança estrutural no painel deve ser refletida neste MiniApp para evitar documentação desatualizada.
