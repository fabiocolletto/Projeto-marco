# Assistente Cerimonial — V5 (Pronto para uso)
Aplicativo modular, embutível em uma Seção do Elementor. Tipografia e cores herdam do site.

## Como publicar
1. Suba a pasta `tools/gestao-de-convidados/` para o seu CDN/repositório público.
2. Garanta que **/shared** contenha:
   - `/shared/higienizarLista.mjs`
   - `/shared/projectStore.js`
3. No Elementor, crie **Seção (largura total)** e cole o conteúdo de `embed/section_elementor.html` em um **Widget HTML**.

## O que já vem pronto
- Tela **Convites**: colagem/adicionar, RSVP inline, editar via drawer, marcar envio e excluir.
- Tela **Evento**: dados essenciais do evento.
- Tela **Mensagens & Agenda**: catálogo **fixo** com 6 modelos, gerador por regra relativa à data e lista de disparos com “Marcar enviados”.
- Tela **Relatório**: seleção de seções e **Exportar PDF** (via diálogo do navegador).

## Observações
- DDI: se o número vier com `+DDI`, preservamos; sem `+`, supomos **+55** (feito no `shared/higienizarLista.mjs`). 
- Dados ficam no navegador (IndexedDB) via `shared/projectStore.js`. Exporte/importe o JSON pelo menu do app (a ser habilitado no shell, se desejar).
- CSS: classes namespaced `.ac-app`; o app estiliza só o essencial.
