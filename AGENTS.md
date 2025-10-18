# agente.md

**Guia Operacional do Agente – Projeto Marco (branch `Autocodex`)**

> Documento-fonte para execução autônoma de tarefas pelo agente (Codex).
> Este arquivo define objetivos, padrões, fluxos, checklists, correções automáticas e critérios de aceite.
> **Sempre priorizar idempotência, segurança e reprodutibilidade.**

---

## 1) Missão do agente

1. **Executar ordens** padronizadas iniciadas por “ORDEM AO CODEX” para construir, testar e publicar o AppBase e seus MiniApps.
2. **Manter o repositório saudável**, com commits semânticos, testes verdes e publicação previsível no GitHub Pages.
3. **Garantir UX offline-first**, persistência em IndexedDB, catálogo de MiniApps e painel administrativo operantes.
4. **Respeitar a autenticação Master** (usuário `adm` / senha `0000` durante implantação) e o gate de exibição (públicos + privados).
5. **Auto-corrigir** erros comuns (migrations, scaffold, rotas, base href, backup/import, etc.) antes de abrir PR.

---

## 2) Escopo atual do Projeto Marco (R1.1+)

* **Shell do AppBase** (catálogo à esquerda; painel central renderiza MiniApp).
* **Registro de MiniApps** via `registry.json` (ordem alfabética por `name`, chaves validadas).
* **Persistência**: `IndexedDB` com stores `profiles`, `settings`, `telemetry`; export/import `.json`.
* **Autosave** com fila offline (debounce, retry exponencial, retomada online).
* **Stubs de Sync** (Drive/OneDrive) com namespaces isolados em `localStorage`.
* **MiniApp “Painel Administrativo”** (`adminOnly:true`, visível para Master).
* **Roteamento SPA**: catálogo vazio → `#/`; MiniApp → `#/app/<id>`.
* **Deploy GitHub Pages** a partir de `/docs` com `404.html` fallback e `<base href="/Projeto-marco/">`.
* **Cadastro/Login Master** (widget + rotas `#/setup/master` e `#/login/master`), vinculado ao `deviceId` local.

---

## 3) Convenções obrigatórias

### 3.1 Commits e branches

* **Prefixos**: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
* **Branches**: uma por ordem; exemplo: `feat/ui-admin-card-toggle`, `chore/qa-autocodex-r1.1`.

### 3.2 Scripts padrão (`package.json`)

O agente **não** deve remover estes scripts. Se ausentes, **criar**:

```json
{
  "scripts": {
    "build": "tsc -p . && vite build || echo 'custom build pipeline aqui'",
    "test": "vitest run",
    "test:watch": "vitest",
    "create:miniapp": "tsx scripts/create-miniapp.ts",
    "backup:export": "tsx scripts/backup-export.ts",
    "backup:import": "tsx scripts/backup-import.ts",
    "build:pages": "cross-env PUBLIC_ADMIN=true BASE_HREF=/Projeto-marco/ npm run build",
    "deploy:pages": "npm run build:pages && node scripts/deploy-pages.js"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "vitest": "^2.0.0",
    "eslint": "^9.0.0",
    "fs-extra": "^11.2.0",
    "cross-env": "^7.0.3",
    "@types/node": "^22.0.0"
  },
  "dependencies": {
    "idb": "^8.0.0"
  }
}
```

### 3.3 Estrutura essencial de pastas

```
src/
  app/              # bootstrap, renderShell, router
  registry/         # carregar/filtrar registry, UI catálogo, eventos
  storage/          # indexeddb/, backup/, autosave/
  sync/             # providers stubs
  auth/             # types, store, crypto, device
  widgets/          # MasterSignup, MasterLogin etc.
miniapps/
  AdminPanel/       # manifest.json, index.html, main.js, i18n/
docs/               # site do GitHub Pages (build publicado)
scripts/            # utilitários (create-miniapp, deploy-pages, smoke tests)
tests/              # vitest (auth, storage, sync, scaffold, ui)
```

---

## 4) Como interpretar uma “ORDEM AO CODEX”

1. **Criar branch** com o nome especificado.
2. **Aplicar mudanças mínimas necessárias**, preservando compatibilidade e idempotência.
3. **Rodar testes**:

   * `npm ci || npm i`
   * `npm run build || true`
   * `npm run test`
   * `npx tsx scripts/smoke.ts` (se existir)
4. **Autocorrigir** conforme Regras de Correção (seção 7).
5. **Reexecutar testes** até “green”.
6. **Abrir PR** com título e checklist solicitados; **não** fazer squash de commits sem instrução explícita.
7. **Nunca** apagar arquivos fora do escopo da ordem; manter diffs pequenos e rastreáveis.

---

## 5) Tarefas operacionais que o agente deve saber executar

### 5.1 Scaffold de MiniApp

* Comando: `npm run create:miniapp Nome -- --admin=false --visible=true`
* Deve criar:

  * `miniapps/Nome/{index.html, main.js, manifest.json, i18n/pt-br.json, i18n/en-us.json, i18n/es-419.json}`
  * Atualizar `registry.json` mantendo **ordem alfabética** por `name`.
* **Falhas esperadas**: colisão de `id`, ordem quebrada ⇒ aplicar correções (7.4).

### 5.2 Deploy para GitHub Pages

* `npm run deploy:pages` deve:

  * Limpar `docs/`
  * Copiar `dist/` para `docs/`
  * Duplicar `docs/index.html` em `docs/404.html`
  * Injetar `<base href="/Projeto-marco/">` se ausente
* O agente **não** altera configurações de Pages na UI do GitHub; apenas prepara `/docs`.

### 5.3 Roteamento & Deep-link

* A rota `#/` mostra catálogo vazio.
* A rota `#/app/<id>` carrega MiniApp no painel central.
* Hashchange deve re-renderizar; botão “Fechar”/ESC retorna para `#/`.

### 5.4 Autenticação Master (offline-first)

* **Primeiro boot**: se não existir master, redirecionar para `#/setup/master` (widget de cadastro).
* **Credencial temporária**: `adm` / `0000` pré-preenchidos na implantação.
* **Logins futuros**: `#/login/master`. Se autenticado, mostrar **todos** os MiniApps (públicos e privados).
* **Vínculo de dispositivo**: `deviceId` salvo localmente; se mudar de aparelho, atualizar em login.

### 5.5 Persistência & Backup

* Stores: `profiles` (`id`, `updatedAt` indexado), `settings` (`key`), `telemetry` (`id`, `ts` indexado).
* **Export** retorna shape estável:

  ```json
  { "version": 1, "exportedAt": "ISO-8601", "data": { "profiles": [], "settings": [], "telemetry": [] } }
  ```
* **Import** aceita `mergeStrategy` (`keep-newer` / `overwrite`) e ignora campos extras.

### 5.6 Sync (stubs)

* Namespaces: `sync:drive` e `sync:onedrive` em `localStorage`.
* `push`/`pull` retornam `rev` incremental (timestamp + contador).
* `SYNC_PROVIDER=none|drive|onedrive` (default `none`).

---

## 6) Critérios de aceite (sempre incluir no PR)

* [ ] `npm run test` **verde** (Vitest).
* [ ] `scripts/smoke.ts` sem falhas (quando aplicável).
* [ ] `registry.json` ordenado; nenhum `id` duplicado.
* [ ] `deploy:pages` gera `/docs` com `index.html` e `404.html`; `<base href="/Projeto-marco/">` presente no build de Pages.
* [ ] Roteamento `#/` e `#/app/<id>` operantes; botão **Fechar**/ESC volta para `#/`.
* [ ] Cadastro/Login Master funcionando; catálogo exibe privados quando autenticado.
* [ ] Backup exporta/importa; shape canônico restaurável.
* [ ] Stubs de Sync com `rev` variando por `push` e namespaces isolados.
* [ ] Documentação do PR descreve mudanças, riscos e rollback.

---

## 7) Regras de correção automática (Auto-fix)

### 7.1 IndexedDB – migrations bloqueadas / version mismatch

* Garantir `onupgradeneeded` cria stores **apenas** quando `oldVersion < 1`.
* Criar índices `byUpdatedAt` (profiles) e `byTs` (telemetry).
* Se `DOMException: blocked`, fechar conexões antes de abrir nova; repetir abertura.

### 7.2 Backup – shape inconsistente

* Normalizar `exportBackup()` para shape canônico (seção 5.5).
* `importBackup()` deve fazer **deep-merge** por `id` com `keep-newer` usando `updatedAt` (fallback `ts`).

### 7.3 Autosave – debounce/retry

* Debounce por `entityId` (400 ms).
* Retry exponencial com teto de 5 tentativas e jitter aleatório.
* Pausar quando `navigator.onLine === false`; retomar no evento `online`.

### 7.4 Scaffold / registry

* Validação de `id` único. Se houver colisão: abortar com mensagem clara.
* Reordenar `registry.json` por `name` **case-insensitive** antes de salvar.

### 7.5 Sync stubs

* Aplicar namespaces distintos; `rev = Date.now() + '-' + contador`.

### 7.6 GitHub Pages – base/404

* Injetar `<base href="/Projeto-marco/">` no `index.html` **de build** (não no código-fonte) quando `BASE_HREF` setado.
* Copiar `index.html` para `404.html` em `/docs`.

### 7.7 Roteamento – deep-link e toggle

* `applyRouteFromLocation()` deve sincronizar `selectedAppId`.
* “Fechar” limpa seleção e muda hash para `#/`.

### 7.8 Auth Master – primeiro boot e login

* Se não existir master: forçar `#/setup/master`.
* Se existir e não autenticado: `#/login/master`.
* Após login, restaurar deep-link se presente.

---

## 8) Smoke tests mínimos (scripts/smoke.ts)

1. **Primeiro boot sem master** → rota `#/setup/master`.
2. **Cadastro master** (`adm`/`0000`) → salva em IndexedDB e autentica.
3. **Catálogo**: lista AdminPanel (privado) + públicos.
4. **Toggle** no card do Admin:

   * Clique 1 → abre `#/app/admin-panel`.
   * Clique 2/ESC/Fechar → volta `#/`.
5. **Backup**: exporta, limpa DB, importa e restaura.
6. **Sync**: `push` duas vezes → `rev` diferente; `pull` traz último backup.

---

## 9) Templates para PR

**Título**
`feat: <resumo curto>` ou `fix: <resumo curto>` ou `chore: <resumo curto>`

**Descrição**

* Objetivo
* Mudanças principais
* Como testar (comandos e rotas)
* Riscos conhecidos e mitigação
* Checklist (copiar seção 6)

---

## 10) Segurança e dados sensíveis

* **Nunca** commitar tokens, segredos ou IDs privados.
* Variáveis de build: `PUBLIC_ADMIN`, `BASE_HREF`, `SYNC_PROVIDER`, `STORAGE_DRIVER`.
* Senhas **não** são armazenadas em texto claro: usar `crypto.subtle.digest('SHA-256', salt+senha)`; `salt` recomendado = `deviceId`.

---

## 11) Rollback

* Em caso de falha pós-deploy:

  1. Voltar à tag anterior (`appbase-r1.x.y`).
  2. Reexecutar `deploy:pages` para repor `/docs`.
  3. Manter backups `.json` exportados pelo Admin.

---

## 12) Glossário rápido

* **AppBase**: shell e infra comum a todos os MiniApps.
* **MiniApp**: módulo funcional isolado com `manifest.json` + `i18n`.
* **AdminPanel**: MiniApp administrativo (privado).
* **Master**: usuário proprietário (acesso total) com login offline.
* **Registry**: catálogo de MiniApps (`registry.json`).
* **Pages**: publicação estática em `/docs` no GitHub.

---

## 13) Checklist de saúde do repositório (executar diariamente)

* [ ] `npm run test` verde.
* [ ] `deploy:pages` reproduz `/docs` sem difs inesperados.
* [ ] `registry.json` válido e ordenado.
* [ ] Admin abre via `#/app/admin-panel`.
* [ ] Backup export/import íntegros.
* [ ] Auth Master funcional (sem loops de rota).
* [ ] Sem arquivos sensíveis no repo.

---

## 14) Exemplo de “ORDEM AO CODEX” bem-formada

```text
# ORDEM AO CODEX — Ajustes de Rota e Deploy

## 0) Branch
- Criar: feat/router-deeplink-fix

## 1) Implementar
- Corrigir applyRouteFromLocation para sincronizar selectedAppId com #/app/<id>.
- Adicionar botão “Fechar” no painel central (limpa hash para #/).
- Garantir ESC fecha MiniApp ativo.

## 2) Testes
- Atualizar scripts/smoke.ts com cenários de clique/ESC/hash.
- Rodar npm run test e smoke.

## 3) Deploy
- npm run deploy:pages (gera /docs com base href e 404.html)

## 4) PR
- Título: feat(router): deep-link estável + toggle fechar
- Checklist: critérios de aceite seção 6
```

---

### Nota final

Este `agente.md` é a referência única de operação. **Em caso de conflito**, priorizar:
**(1)** integridade dos dados (persistência/backup) → **(2)** roteamento e acesso (auth/UX) → **(3)** publicação previsível (Pages) → **(4)** refino visual.
