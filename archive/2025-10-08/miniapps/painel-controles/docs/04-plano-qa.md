# Plano de QA do MiniApp Painel de Controles

> Atualizado em 2025-01-15 · Responsável: Thiago Martins (QA Lead) · Baseado no checklist rígido de entregáveis e no escopo aprovado em 01-briefing.

## 1. Critérios de aceite
- Rail do AppBase deve carregar o miniapp via manifest válido e apresentar fallback seguro quando o manifest remoto falhar.
- Mudanças de idioma emitidas pelo AppBaseI18n precisam refletir imediatamente no card e no painel, registrando histórico auditável.
- Cadastro de operador deve validar telefone brasileiro (10 ou 11 dígitos) e senha antes de persistir no storage local.
- Ações de ativar/desativar Sync e Backup devem publicar eventos no bus interno sem gerar erros no console.

## 2. Matriz de cenários
| Cenário | Caminho feliz | Exceções | Resultado esperado |
|---------|---------------|----------|--------------------|
| 01 — Carregamento feliz | Manifesto respondendo 200, rail renderiza card em pt-BR, mudança para en-US atualiza título e CTA. | Manifesto demora > 3s. | Loader mantém estado "Carregando" até resolução e ativa miniapp após registro. |
| 02 — Fallback de manifest | Manifesto retorna 404. | Tempo limite no fetch. | Card renderizado com `data-fallback="true"` e nota "Carregado via fallback local" sem erros no console. |
| 03 — Persistência de sessão | Operador cadastra dados válidos e recarrega página. | Falha temporária no IndexedDB. | Painel reabre com informações persistidas e rail mantém miniapp ativo. |
| 04 — Eventos de idioma | Usuário alterna pt-BR → es-ES → en-US. | Evento duplicado pelo runtime. | Histórico registra entradas sequenciais com `{{locale}}` resolvido para nome público. |
| 05 — Acessibilidade do rail | Navegação por teclado com Tab/Enter nos MiniCards. | Foco inicial fora do rail. | Cards possuem `role="listitem"`, `tabIndex="0"` e respondem a Enter/Espaço abrindo o painel. |

## 3. Automação obrigatória
- Teste Playwright `tests/miniapp-loader.spec.js` cobrindo cenários 01 e 02.
- Estender suíte com casos para persistência e eventos de idioma após integração do painel com dados reais.
- Monitorar console durante os testes e falhar se houver mensagens de nível `error`.

## 4. Checklist pré-homologação
- Executar `npm test` e anexar a saída ao PR (mesmo que a suíte de Playwright exija dependências externas para rodar localmente).
- Revisar manualmente acessibilidade do rail e painel (foco visível, leitura por leitores de tela, atalhos de teclado).
- Validar traduções em pt-BR, en-US e es-ES usando o pacote de conteúdo atualizado.
- Atualizar `docs/changelog.md` com resultados da rodada de QA e responsáveis por cada verificação.

## Cobertura atual
- Automação Playwright implementada: cenários 01 (feliz) e 02 (fallback) cobertos em `tests/miniapp-loader.spec.js`.
- Cenários 03 a 05 registrados como próximos incrementos; dependem da integração completa do painel com dados reais e instrumentação de eventos adicionais.
