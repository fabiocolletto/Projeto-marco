# Assistente Cerimonial — Documento de Planejamento (V5 – concat)

> **Arquitetura modular aprovada.** Documento vivo — simples e direto. “Revisão e Higienização” virou o **botão Editar** dentro de **Convites**.
> Catálogo de mensagens **fixo** (sem edição). Idioma **pt‑BR**. DDI tratado automaticamente (+DDI preservado; sem + ⇒ **+55**).
> **CSS com herança**: tipografia (H1, H2, H3…), cores e espaçamentos **vêm do site**; o app estiliza apenas o essencial com classes namespaced.

## 1) Objetivo e escopo

Construir a versão final do aplicativo Assistente Cerimonial (V5), embutível no site (WordPress/Elementor):

* Organiza **evento**, **convites** (convidados) e **RSVP** diretamente na tela de Convites.
* Planeja **mensagens** por catálogo fixo e **agenda de disparos** (planejamento local; sem envio automático).
* Gera **Relatório em PDF** com seções escolhidas pelo usuário (dados do evento, agenda, confirmações, lista).
* Persiste dados localmente (IndexedDB) e permite **exportar/importar o projeto em JSON**.
* Reutiliza `shared/` para higienização e persistência (sem lógica duplicada na UI).

Fora do escopo imediato: envio por API, internacionalização e páginas de conformidade/privacidade (já cobertas no site).

---

## 2) Arquitetura & princípios

1. **Módulos ESM + ponto de entrada único**: 1 arquivo de entrada (`app_header.mjs`) e **módulos por tela** carregados sob demanda (lazy import).
2. **SSOT por responsabilidade**

   * Higienização (nomes/telefones/totais) → `shared/higienizarLista.mjs`.
   * Persistência (projeto/evento) → `shared/projectStore.js`.
3. **UI só exibe**: sem capitalize local, máscaras próprias ou contadores duplicados.
4. **Schema v1 estável**: contratos explícitos; evoluções futuras via `SCHEMA_VERSION` + migração.
5. **Carregamento**: `modulepreload` para núcleo; **imports dinâmicos** para telas pesadas (Agenda, Relatório PDF).
6. **CSS com herança (híbrido)**:

   * H1–H6, parágrafos, cores e espaçamentos herdam do tema do site.
   * Estilos do app namespaced sob `.ac-app` (tabelas, botões, inputs, badges), sem resets agressivos.

### 2.1) Estrutura de pastas (proposta)

```
/tools/gestao-de-convidados/
  app_header.mjs                 # entrada/shell, roteamento e estado global leve
  /views/
    evento.mjs                   # tela Evento
    convites.mjs                 # editor + RSVP inline + drawer "Editar"
    mensagens_agenda.mjs         # catálogo fixo + gerador + lista de disparos
    relatorio_pdf.mjs            # preview + gerar PDF
  /ui/
    dom.mjs                      # helpers de DOM, toasts, loading, focus
    table.mjs                    # tabela com filtros/ações (reutilizável)
  /pdf/
    print.mjs                    # utilitários para PDF (importado apenas pela tela)
/shared/
  higienizarLista.mjs            # SSOT de higienização
  projectStore.js                # SSOT de persistência (IndexedDB)
```

### 2.2) Contrato das views (módulos de tela)

Cada módulo de `views/` exporta:

```js
export async function render(rootEl, ctx) { /* monta a tela no rootEl */ }
export function destroy() { /* opcional: remove listeners/intervals */ }
```

`ctx` inclui: `{ store, navigate, projectId }` e utilitários de `ui/`.

### 2.3) Roteamento simples

No `app_header.mjs`:

```js
const routes = {
  evento: () => import('./views/evento.mjs'),
  convites: () => import('./views/convites.mjs'),
  agenda: () => import('./views/mensagens_agenda.mjs'),
  relatorio: () => import('./views/relatorio_pdf.mjs')
};
```

* **Tab inicial**: `convites`.
* Troca de tab por hash (`#convites`) ou estado interno.

### 2.4) Performance

* **Primeiro paint**: somente shell + `convites`.
* **Preload**: `app_header.mjs` e `shared/*` via `<link rel="modulepreload">`.
* **Lazy**: `mensagens_agenda.mjs` e `relatorio_pdf.mjs` só quando a tab abrir.

---

## 3) Módulos compartilhados (shared/)

### 3.1) `shared/higienizarLista.mjs`

Propósito: transformar texto solto em lista **canônica** de convites.

* Capitalização de nome próprio e derivação de principal + acompanhantes.
* Formatação/validação de telefone (E.164 e nacional); `+` exclusivo para DDI.
* Cálculo de totais por convite.

APIs: `higienizarLinha(raw) -> GuestV1` · `higienizarLista(raw) -> { convidados: GuestV1[], totais }`

### 3.2) `shared/projectStore.js`

Propósito: camada IndexedDB para **criar/ler/atualizar/excluir** projetos, manter índice e exportar/importar JSON.

APIs: `init`, `listProjects`, `createProject`, `getProject`, `updateProject`, `deleteProject`, `exportProject`, `importProject`.

---

## 4) Contratos de dados

### 4.1) `GuestV1` — item de convite

```js
{
  id,                  // uuid do convite
  nome,                // "Ana e João"
  principal,           // "Ana"
  acompanhantesNomes,  // ["João"]
  acompanhantes,       // 1
  totalConvite,        // 2
  telefone,            // "+5541999990000" (E.164 quando possível)
  telefoneFormatado,   // "(41) 99999-0000"
  envio: {             // status simples de envio manual
    enviado: false,
    enviadoEm: null,   // epoch ms
    modeloId: null     // opcional: id do modelo usado no disparo manual
  },
  rsvp: RSVPV1         // bloco de resposta/confirmação
}
```

### 4.2) `RSVPV1`

```js
RSVPV1 = {
  status: "pendente" | "confirmado_total" | "confirmado_parcial" | "ausente",
  confirmadosN: 0,            // 0..totalConvite
  confirmadosNomes: [],       // subset de [principal, ...acompanhantesNomes]
  observacao: "",
  atualizadoEm: 0             // epoch ms
}
```

Regras: 0 → `ausente`; total → `confirmado_total`; intervalo → `confirmado_parcial`.

### 4.3) `ProjectV1` — projeto/evento

```js
{
  id,
  createdAt, updatedAt,
  evento: {
    titulo: "",
    data: "",   // YYYY-MM-DD
    hora: "",   // HH:mm
    local: "",
    endereco: { logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "" },
    anfitriao: "",
    cerimonial: ""
  },
  lista: GuestV1[],
  mensagens: TemplatesV1,   // catálogo fixo
  agenda: DisparoV1[],      // planejamento de envios
  notas: ""
}
```

### 4.4) `TemplatesV1` / `MessageTemplateV1` — catálogo **fixo**

```js
TemplatesV1 = { modelos: MessageTemplateV1[] }

MessageTemplateV1 = {
  id, titulo,
  corpo,              // com variáveis {{evento.titulo}}, {{convidado.principal}}, etc.
  variaveis: ["evento.titulo","evento.data","convidado.principal","convidado.telefoneFormatado"],
  categoria: "pré‑evento" | "convite" | "lembrete" | "pós‑evento",
  regraDataPadrao: { tipo: "relativo_evento", offsetDias: -30, hora: "10:00" }
}
```

Sugeridos: **Save the Date**, **Convite**, **Lembrete 7 dias**, **Lembrete 1 dia**, **Dia do Evento**, **Agradecimento**.

### 4.5) `DisparoV1` — linha de agenda

```js
{
  id,
  dataHoraISO,        // "2025-09-01T10:00:00-03:00"
  modeloId,
  publico: { tipo: "todos" | "somenteComTelefone" | "somentePrincipais" | "semTelefone" | "semRSVP" | "pendente" | "confirmado" | "ausente" },
  escopo: { tipo: "em_lote" | "individual", convidadoId: null },
  preview: { exemploTexto: "" },
  metricas: { estimado: 0, enviados: 0 },
  status: "planejado" | "enviado_manual" | "expirado" | "cancelado",
  observacao: ""
}
```

---

## 5) Fluxos principais

### 5.1) **Convites** (editor + RSVP + **Editar**)

* **Tabela única** por convite com colunas: Convidado, Telefone, Total, **Enviado?**, **Enviado em**, **RSVP (status)**, **Confirmados (N)**, **Nomes confirmados** (checkboxes quando existirem), Observação, **Ações**.
* **Botão Editar** (ícone de lápis): abre **drawer/modal** da própria linha com:

  * Campos: Nome, Telefone, Lista de acompanhantes, RSVP (status + seleção por pessoa ou numérica), Envio (enviado?/quando?/modelo), Observação.
  * **Validações e higienização**: avisos para telefone inválido, nomes vazios ou total inconsistente, com ações rápidas (reaplicar higienização da linha).
  * Ações: **Salvar**, **Cancelar**, **Duplicar convite**, **Excluir**.
* **Ações rápidas** na tabela: Enviar (marca enviado+hora), Confirmar todos, Ausente, Confirmar parcial.
* **Filtros**: Pendente, Confirmado, Parcial, Ausente, Com/sem telefone, Enviados/Não enviados.
* **Adição/edição**: sempre passar por `higienizarLinha`.

### 5.2) Mensagens e Agenda (catálogo fixo)

* **Catálogo**: cartões com título e prévia; corpo **não editável**.
* **Gerador**: cria `DisparoV1` relativo à data do evento conforme `regraDataPadrao` do modelo.
* **Lista de disparos**: Data/Hora, Modelo, Público, Estimado, Enviados, Status, Observação; reordenar/duplicar/excluir/editar.
* **Integração com Convites**: públicos usam `rsvp.status` e presença de telefone. Ao marcar envio manual por convite, pode associar `modeloId`.

### 5.3) Relatório (PDF único, seções selecionáveis)

* **Toggles de seções**: Dados do evento · Agenda de mensagens · Confirmações (RSVP) · Lista de convites.
* **Pré‑visualização** e **Gerar PDF**.
* **Formatação**: reutiliza H1/H2/H3 e fontes do site; o app define apenas layout de tabelas/grades.

### 5.4) Colagem e importação

* Colar texto → `higienizarLista` → persistir `lista` no projeto.
* Importar JSON do projeto via Menu Arquivo.

### 5.5) Salvar/Carregar

* Autosave com indicadores (`Alterações não salvas` → `Salvando…` → `Salvo!`).
* Menu Arquivo: Novo, Abrir, Importar JSON, Exportar JSON, Duplicar, Renomear, Excluir.

---

## 6) UI e UX

### 6.1) Header fixo

* Título do app (V5), **Menu Arquivo** e **Indicador de estado**.

### 6.2) Telas (tabs)

1. **Início / Painel do Evento** — resumo geral.
2. **Evento (dados cadastrais)** — título, data/hora, local, endereço, anfitrião, cerimonial.
3. **Convites (editor + RSVP)** — colar/adicionar/editar/remover; status de envio e confirmação na própria linha (botão **Editar** substitui a antiga tela 4).
4. **Mensagens e Agenda** — catálogo fixo, gerador e lista.
5. **Relatório (PDF)** — seleção de seções e exportação.

### 6.3) CSS com herança (otimizado para o site)

* **Aproveitar ao máximo** a tipografia e tokens do site (H1…H6, fontes, cores, espaçamentos).
* O app define apenas o necessário sob `.ac-app`: tabelas, inputs, botões, badges, estados (sujo/salvando/salvo).
* Sem resets globais; evitar conflitos com Elementor/tema.
* Dark mode: herdar do site quando existir (`color-scheme`, variáveis do host).

---

## 7) Incorporação no site (Seção completa **recomendada**)

> Para máxima previsibilidade no Elementor, crie **uma Seção** de largura total e cole o HTML abaixo em um **Widget HTML** único. Assim, a própria seção traz a estrutura (header, root e footer) e todos os caminhos corretos.

**No Elementor (Seção):**

* Largura do conteúdo: **Largura total**.
* Espaçamento: **0** (sem padding/margem) — o tema proverá a tipografia.
* CSS personalizado da página (opcional): defina tokens/variáveis do site, se houver.

**HTML único para colar no Widget HTML**

```html
<section id="ac-section" class="ac-section ac-app" data-ac-version="v5">
  <header class="ac-section__header">
    <h2>Assistente Cerimonial — Gestão de Convites</h2>
    <p class="ac-section__subtitle">Organize convites, mensagens e confirmações em um só lugar.</p>
  </header>

  <!-- Raiz do aplicativo -->
  <div id="ac-root"></div>

  <footer class="ac-section__footer">
    <small class="ac-muted">Dados salvos localmente no seu navegador. Você pode exportar/importar o projeto quando quiser.</small>
  </footer>

  <!-- Preloads para melhorar o primeiro carregamento -->
  <link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/fabiocolletto/Projeto-marco@main/tools/gestao-de-convidados/app_header.mjs">
  <link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/fabiocolletto/Projeto-marco@main/shared/projectStore.js">
  <link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/fabiocolletto/Projeto-marco@main/shared/higienizarLista.mjs">

  <!-- Script do app (com fallback e cache-busting) -->
  <script type="module">
    const CDN = "https://cdn.jsdelivr.net/gh/fabiocolletto/Projeto-marco@main";
    const SRC = `${CDN}/tools/gestao-de-convidados/app_header.mjs`;

    try {
      const { render } = await import(SRC);
      await render(document.getElementById('ac-root'));
    } catch (e) {
      console.warn('[AC] fallback cache-busting', e);
      const { render } = await import(SRC + `?t=${Date.now()}`);
      await render(document.getElementById('ac-root'));
    }
  </script>

  <noscript>Ative o JavaScript para usar a ferramenta.</noscript>
</section>
```

**Purge opcional do CDN após publicar no GitHub**

* `https://purge.jsdelivr.net/gh/fabiocolletto/Projeto-marco@main/tools/gestao-de-convidados/app_header.mjs`
* `https://purge.jsdelivr.net/gh/fabiocolletto/Projeto-marco@main/shared/projectStore.js`
* `https://purge.jsdelivr.net/gh/fabiocolletto/Projeto-marco@main/shared/higienizarLista.mjs`

**Alternativa (mínimo módulo)**

```html
<div id="ac-root" class="ac-app"></div>
<script type="module">
  const CDN = "https://cdn.jsdelivr.net/gh/fabiocolletto/Projeto-marco@main";
  const SRC = `${CDN}/tools/gestao-de-convidados/app_header.mjs`;
  try {
    const { render } = await import(SRC);
    await render(document.getElementById('ac-root'));
  } catch (e) {
    const { render } = await import(SRC + `?t=${Date.now()}`);
    await render(document.getElementById('ac-root'));
  }
</script>
```

---

## 8) Critérios de aceite (V5)

* **Modularização**: ponto de entrada único + imports dinâmicos por tela.
* **Convites**: tabela única com RSVP inline e **botão Editar** (drawer/modal) por linha; filtros funcionando.
* **Mensagens e Agenda**: catálogo fixo; gerador relativo à data; lista editável.
* **Relatório**: seleção de seções e exportação em **PDF** (com tipografia herdada do site).
* **Persistência**: autosave; Abrir/Importar/Exportar JSON do projeto; índice por `updatedAt`.
* **Higienização**: toda entrada passa por `higienizar*`.
* **CSS**: herança do site (H1/H2/H3, fontes e cores), sem resets agressivos; classes `.ac-app`/`.ac-section` isolam o app.

---

## 9) Roadmap imediato

1. **Scaffold modular**: criar estrutura de pastas, roteamento e contrato `render/destroy` das views.
2. Header, Menu Arquivo e indicador de estado.
3. **Convites**: tabela, botão **Editar** com validações/higienização, ações rápidas e filtros.
4. **Mensagens e Agenda**: catálogo inicial, gerador por regra padrão e lista funcional.
5. **Relatório (PDF)**: toggles de seções, pré‑visualização e exportação.
6. Exportar/Importar JSON do projeto no Menu Arquivo.

---

## 10) Notas finais

* V5 **não** envia mensagens automaticamente; a agenda é de planejamento.
* DDI: automático; +DDI preservado, ausência ⇒ +55.
* Idioma: único (pt‑BR). Conformidades e privacidade permanecem no site.
* `shared/` continua como núcleo da consistência; melhorias nesses módulos beneficiam todo o app.
