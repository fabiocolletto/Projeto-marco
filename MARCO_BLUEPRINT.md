# Marco — Produto & Gadget

**Blueprint do AppBase + Market de MiniApps** · **R1.0 – 2025-10-05**

> Documento **consolidado** (concatenação das revisões **O0.1 → O0.6** numa versão única e atual). Não contém código; registra **padrões, contratos e operação** do Marco como **software + gadget (tablet)** e **multi-dispositivo** (celular, tablet e desktop). Mantém LGPD-first, privacidade por padrão e segurança forte.

---

## Governança de repositório (R1.4)

* `manuals/` concentra o conteúdo N1 obrigatório para operação; divergências
  com o código devem ser alinhadas via PCM antes de merges.
* `miniapps/` guarda apenas a versão ativa de cada MiniApp. Releases anteriores
  vão para `archive/miniapps/<nome>/<versão>/` e permanecem documentadas no
  changelog do respectivo módulo.
* O protótipo modular legado encontra-se em `archive/src-r0/` somente para
  consulta histórica; evoluções acontecem em `appbase/` e nos MiniApps ativos.

---

## 0) Sumário executivo

* **AppBase** é o **host** que carrega MiniApps definidos por uma **array de habilitação** por usuário/tenant.
* **MiniApps** são módulos plugáveis com **schemas de dados próprios** e contratos claros.
* **Local-first**: tudo funciona offline; **nuvem** (Drive/OneDrive) é opcional (licenciada) para **backup** e **multi-dispositivo**.
* **Login unificado** (Google/Apple/Microsoft) + **QR** para modo quiosque; fallback **link mágico/OTP**.
* **Conformidade LGPD**: direitos do titular (acesso, exportação 1-clique, retificação, exclusão total), consentimentos e livro-razão de auditoria.
* **Criptografia** local com **WebCrypto (AES-GCM)** e desbloqueio por **biometria/Passkey** quando possível.

---

## 1) Contexto e objetivos

* **Marco = App + Gadget**: executa em tablets de baixo custo (quiosque) e também em celulares/desktop.
* **Objetivo desta versão (R1.0):** consolidar decisões de arquitetura, UX, dados, conformidade e operação em um único documento de referência.

---

## 2) Topologia e componentes

* **AppBase (SPA UMD)** expõe `window.AppBase` e carrega MiniApps via `AppBase.register(name, module)`.
* **MiniApps (UMD)**: bundles independentes publicados em CDN confiável.
* **Gadget (tablet)**: WebView/Chrome em modo **Kiosk** (V1: Screen Pinning; V2: Device Owner / Single-App Kiosk).

---

## 3) Boot & Entrada (máquina de estados)

**S0·BOOT** → **S1·CONFIG_RESOLVE** → **S2·SESSION_CHECK** → **S3·LOGIN_PROMPT** (se necessário) → **S4·ACCOUNT_LOOKUP** → **S5·ACCESS_EVAL** → **S6·HOME_PREP** → **S7·SYNC_START** (se habilitado) → **S8·READY**.

Exceções tratadas: offline total; token inválido; conta sem tenant; licenças expiradas; storage não vinculado.

---

## 4) Config do AppBase (tenant/usuário)

**Contrato de boot** mínimo que dirige o **loader** por array:

```json
{
  "tenantId": "...",
  "userId": "...",
  "catalogBaseUrl": "...",
  "defaults": { "enabledMiniApps": ["home", "market", "settings"] },
  "user": {
    "enabledMiniApps": ["eventos", "financeiro"],
    "entitlements": { "backup": true },
    "providers": { "login": ["google", "apple"], "storage": ["drive", "onedrive"] }
  },
  "ui": { "theme": "light", "layout": "tabs" },
  "meta": { "version": "1", "signature": "<TBD>", "checksum": "<TBD>" }
}
```

**Loader**: mescla `defaults.enabledMiniApps` + `user.enabledMiniApps` e carrega cada entrada. Alterar a **array** no backend/automação liga/desliga MiniApps por usuário.

---

## 5) Identidade, sessão e dispositivos

* **Login**: OAuth (Google/Apple/Microsoft, PKCE); **QR** no quiosque; fallback **link mágico/OTP**.
* **Sessão**: *silent refresh* na chegada; tokens curtos em memória; metadados em IndexedDB escopado por `{tenantId}/{userId}`.
* **Dispositivos**: lista com `deviceId`, apelido/modelo e última atividade; ação **“Sair de todos”**.
* **Account Switcher**: alterna tenants/ambientes do mesmo usuário.

---

## 6) Comunicação e estado

* **MarcoBus (D1)** multi-transport: `CustomEvent` (mesma aba) → `BroadcastChannel` (entre abas) → *fallback* `storage` → `postMessage` em iframe. Dedup por `messageId` + `timestamp`.
* **MarcoStore (D2)** leve (`get/patch/subscribe/select`), emitindo eventos no Bus.
* **Autosave (D3)**: `debounce ~800ms` + *save on blur*.

---

## 7) Dados por MiniApp (schemas & envelope)

* **DataContract (D15)**: cada MiniApp declara `schemas[]` (JSON Schema + SemVer), `migrations[]`, `serializers`, `capabilities` e `retention`.
* **Envelope comum (D16)** para backup/sync/export:
  `tenantId, userId, miniapp, type, schema, schemaVersion, docId, updatedAt, source, payload, attachments[]`.
* **Registry de Schemas** incluído na exportação e usado para validação/migração.
* **Armazenamento local**: IndexedDB (idb-keyval) com stores `drafts`, `queue` e opcionais `docs` e `attachments` (criptografados) — (D4, D17).

---

## 8) Backup, Sync e Multi-dispositivo

* **Opcional por licença** (MiniApp **Conta & Backup**) — (D5).
* **Sync**: `pull` inicial + **LWW**; fila curta de patches com *retry* e gatilhos (`online`, `visibilitychange`, timer com `dirty`, ação manual). Pós-login automático via **AuthWatcher** (D6).
* **Nuvem**: Drive/OneDrive independentes do provedor de login; paths padronizados por `{tenantId}/{userId}/{miniapp}`.

---

## 9) Conformidade, privacidade e segurança

* **LGPD-first** (paridade com boas práticas GDPR). Direitos na UI: **acesso**, **exportação 1-clique**, **retificação**, **eliminação total** com janela de segurança; consentimentos com recibo e **centro de preferências**.
* **Livro-razão (D14)**: append-only encadeado por hash para eventos de conformidade.
* **Criptografia (D13)**: HTTPS; AES-GCM local (WebCrypto); chaves por `{tenantId}/{userId}` com **WebAuthn/Passkeys** (web) e **BiometricPrompt** (Android Kiosk). Opção **“Bloquear App”**.
* **CSP/Isolamento** e proteção anti-captura no quiosque quando suportado.

---

## 10) UX mobile-first

* **Breakpoints**: xs <360, sm 360–479, md 480–767, lg 768–1023, xl ≥1024.
* **Navegação**: tab bar inferior (celular); rail lateral (tablet/desktop).
* **Acessibilidade**: alvos ≥44×44dp, contraste AA, foco visível, TalkBack/VoiceOver.
* **Estados de rede**: banner Offline e *retry*.
* **Metas de performance**: TTFI ≤ 1.5s (classe Moto G/4G); INP ≤ 200ms; Crash-free ≥ 99.5%.

---

## 11) Observabilidade e métricas

* **Eventos**: `boot_start`, `config_loaded`, `session_ok/expired`, `login_success/failure`, `account_created/found`, `access_granted/denied`, `home_ready`, `sync_started/completed`, `export_started/completed`, `erasure_requested/completed`, `schema_registered/updated`, `migration_applied`.
* **KPIs**: tempo até READY; taxa de logins por método; % sessões renovadas; latência do 1º pull; % exportações concluídas; tempo de eliminação; % docs válidos por schema; tempo de migração; taxa de dedupe de anexos.

---

## 12) Gadget (tablet) — modo quiosque

* **V1**: Screen Pinning, autostart (PWA/WebView), bloqueio básico de gestos.
* **V2**: Device Owner (Managed Provisioning) em Single-App Kiosk; boot direto; biometria; anti-captura e **wipe remoto**.

---

## 13) Roadmap de execução

1. MiniApp **Conta & Backup** (login/QR, vincular storage, licenças, lista de dispositivos, direitos do titular).
2. **Registry de Schemas** e **Envelope** implementados no AppBase; validadores e migradores mínimos.
3. **Loader** por array mesclada com *soft-reload* via MarcoBus.
4. **Marketplace** básico (compra → licença → habilitação automática).
5. **Kiosk V1**; depois **Kiosk V2**.
6. Instrumentação de eventos/KPIs críticos.

---

## 14) Decisões consolidadas

D1 — MarcoBus multi-transport; D2 — MarcoStore leve; D3 — Autosave híbrido; D4 — IndexedDB idb-keyval; D5 — Sync opcional (Conta & Backup); D6 — AuthWatcher; D7 — LWW; D8 — Bundle UMD + CSS `.ac`; D9 — Account Switcher; D10 — Observabilidade; D11 — Privacidade por padrão; D12 — Direitos do titular na UI; D13 — Criptografia & biometria; D14 — Livro-razão; D15 — DataContract por MiniApp; D16 — Envelope & Registry; D17 — Armazenamento estendido (`docs`/`attachments`).

---

## 15) Itens em validação

* Política final de **retenção** por categoria/MiniApp e prazos legais.
* **Assinatura** do `config` (chaves do tenant), rotação de chaves e *rollbacks* seguros.
* **Residência de dados** e contratos com provedores (DPA) quando aplicável.
* **Kiosk**: wipe remoto e *lost mode*.
* **Criptografia**: chave por usuário vs. por dispositivo; restauração de backups do SO.
* **Quotas** por MiniApp; políticas de compatibilidade de schema e janelas de migração.

---

## 16) Log de alterações

* **O1.0 – 2025-10-05**

  * **Concatenação das revisões O0.1 → O0.6** em documento unificado (R1.0), sem mudança de escopo: organização, remoção de redundâncias e reintrodução da seção de **Config do AppBase**.

* **O0.6 – 2025-10-05**

  * Modelo de Dados por MiniApp; Envelope; Registry; inclusão de todos os MiniApps em backup/sync/export.

* **O0.5 – 2025-10-05**

  * Conformidade & Privacidade; exportação 1-clique; exclusão total; livro-razão; criptografia e biometria.

* **O0.4 – 2025-10-05**

  * Fluxo de Entrada completo: Boot → Login → Conta → Acesso → Home → Sync; multi-tenants.

* **O0.3 – 2025-10-05**

  * Mobile-first & responsividade; metas de performance; dispositivos e link mágico/OTP.

* **O0.2 – 2025-10-05**

  * Login unificado + QR; multi-usuário; Conta & Backup; desacoplamento login×storage.

* **O0.1 – 2025-10-05**

  * Conceito Marco = App + Gadget; loader por array; marketplace; decisões base (Bus/Store/IndexedDB/etc.).

