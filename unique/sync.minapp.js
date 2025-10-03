// /unique/sync.minapp.js
// Mini-App de Sincronização (Google Drive appDataFolder + OneDrive App Folder)
// Exporta: mountSyncMiniApp(host, { ac, store, bus, getCurrentId })

// Utilidades pequenas (sem libs externas)
const SYNC_CFG = (window.__SYNC_CONFIG && window.__SYNC_CONFIG.sync) || window.__SYNC_CONFIG || {};
const CFG = {
  google: { client_id: SYNC_CFG.google?.client_id || "" },
  msal:   { clientId: SYNC_CFG.msal?.clientId || "", authority: SYNC_CFG.msal?.authority || "https://login.microsoftonline.com/common" },
  scopes: {
    google: SYNC_CFG.scopes?.google || "https://www.googleapis.com/auth/drive.appdata",
    ms:     SYNC_CFG.scopes?.ms     || "Files.ReadWrite.AppFolder"
  },
  timing: {
    debounceMs: 1500,      // autosave → push debounce
    throttleMs: 5000,      // espaçamento mínimo entre pushes
    pollVisible: 7000,     // espelhando (aba visível)
    pollHidden: 15000,     // espelhando (aba oculta)
    standbyIdleMin: 3      // inatividade para entrar em Standby
  }
};

const FILE_NAME = "ac-backup.json.enc";        // conteúdo cifrado (JSON)
const FILE_MIME = "application/json";          // mantemos JSON para depurar
const HARD_LIMIT_BYTES = 5 * 1024 * 1024;      // 5 MB

const DEVICE_KEY = "ac:deviceId";
function getDeviceId(){
  try{
    let id = localStorage.getItem(DEVICE_KEY);
    if(!id){ id = "dev_"+Math.random().toString(36).slice(2,10); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  }catch{ return "dev_"+Math.random().toString(36).slice(2,10); }
}
const DEVICE_ID = getDeviceId();

function b64uToBytes(b64){ return Uint8Array.from(atob(b64.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0)); }
function bytesToB64u(buf){ const b = Array.from(new Uint8Array(buf)).map(c=>String.fromCharCode(c)).join(''); return btoa(b).replace(/\+/g,'-').replace(/\//g,'_'); }
function txtenc(s){ return new TextEncoder().encode(s); }
function txtdec(b){ return new TextDecoder().decode(b); }
function nowTs(){ return Date.now(); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

// --- KDF + AES-GCM (Web Crypto) ---------------------------------------------
// PBKDF2 para MVP (deriva chave de telefone+senha). Futuro: Argon2id (WASM).
async function deriveKeyPBKDF2(phone, password, saltB64, iters=200_000){
  const salt = saltB64? b64uToBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", txtenc((phone||"")+":"+password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", iterations: iters, salt },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt","decrypt"]
  );
  const rawSaltB64 = saltB64 || bytesToB64u(salt);
  return { key, saltB64: rawSaltB64, iterations: iters };
}

async function aesEncryptJSON(obj, key){
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = txtenc(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, pt);
  return { iv: bytesToB64u(iv), ciphertext: bytesToB64u(new Uint8Array(ct)) };
}

async function aesDecryptJSON(bundle, key){
  const iv = b64uToBytes(bundle.iv);
  const ct = b64uToBytes(bundle.ciphertext);
  const pt = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, ct);
  return JSON.parse(txtdec(new Uint8Array(pt)));
}

// --- Normalização de telefone BR (11 dígitos) --------------------------------
function normalizePhoneBR(input){
  const only = String(input||"").replace(/\D/g,"");
  if(only.length !== 11) throw new Error("Telefone inválido: esperado 11 dígitos (DDD + 9 dígitos).");
  return only; // armazenamento interno nacional; se quiser, mapeie para +55 depois
}
function phoneHint(phone){ return phone ? (phone.slice(0,2)+"•••••"+phone.slice(-4)) : "•••••"; }

// --- Helpers de UI -----------------------------------------------------------
function el(tag, attrs={}, ...children){
  const n = document.createElement(tag);
  Object.entries(attrs||{}).forEach(([k,v])=>{
    if(k==="class") n.className = v;
    else if(k.startsWith("on") && typeof v==="function") n.addEventListener(k.slice(2), v);
    else if(v!==undefined && v!==null) n.setAttribute(k, String(v));
  });
  children.flat().forEach(c=>{
    if(c==null) return;
    if(typeof c==="string") n.appendChild(document.createTextNode(c));
    else n.appendChild(c);
  });
  return n;
}
function setText(elm, txt){ if(elm) elm.textContent = txt; }
function show(elm, flag){ if(!elm) return; elm.style.display = flag? "" : "none"; }

// --- Estado do Mini-App ------------------------------------------------------
const State = {
  googleOn: false,
  msOn: false,
  mode: "Desativado",     // "Ativo" | "Espelhando" | "Desativado" | "Standby" | "Atenção" | "Degradado"
  detail: "—",
  lastPushAt: 0,
  pushing: false,
  pollingTimer: null,
  standbyTimer: null,
  phone: null,
  kdf: null,              // { key, saltB64, iterations }
  lastSnapshotMeta: { updatedAt: 0, ownerDeviceId: null },
  // per provedor
  google: { has: false, etag: null, modifiedTime: null, degraded: false },
  ms:     { has: false, etag: null, lastModified: null, degraded: false }
};

// --- Adapters: Google Drive (appDataFolder) e OneDrive (approot) -------------
const Google = {
  _ready: false, _token: null,

  async ensureLib(){
    if(this._ready) return;
    if(!CFG.google.client_id) throw new Error("Config Google ausente (client_id).");
    // Carrega GIS (token model)
    if(!window.google || !window.google.accounts || !window.google.accounts.oauth2){
      await new Promise((res, rej)=>{
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true; s.defer = true;
        s.onload = res; s.onerror = ()=>rej(new Error("Falha ao carregar GIS"));
        document.head.appendChild(s);
      });
    }
    this._ready = true;
  },

  async tokenInteractive(){
    await this.ensureLib();
    return new Promise((res, rej)=>{
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CFG.google.client_id,
        scope: CFG.scopes.google,
        callback: (resp)=>{
          if(resp && resp.access_token){ this._token = resp.access_token; res(resp.access_token); }
          else rej(new Error("Sem access_token do Google"));
        }
      });
      client.requestAccessToken(); // interação via gesto do usuário
    });
  },

  async tokenSilent(){ /* GIS não tem "silent" puro no mesmo molde para todas as SPAs; privilegiamos gesto explícito */ return this._token; },

  async listAppFile(){
    // Drive files.list no espaço appDataFolder por nome
    const url = "https://www.googleapis.com/drive/v3/files"
      + "?spaces=appDataFolder&q=name%3D%27"+encodeURIComponent(FILE_NAME)+"%27%20and%20trashed%3Dfalse&fields=files(id,name,modifiedTime)";
    const r = await fetch(url, { headers: { Authorization: "Bearer "+this._token }});
    if(r.status===401) throw new Error("G_AUTH");
    if(!r.ok) throw new Error("G_LIST_"+r.status);
    const j = await r.json();
    const f = (j.files && j.files[0]) || null;
    return f; // {id, name, modifiedTime}
  },

  async getFileContent(id){
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers: { Authorization: "Bearer "+this._token }});
    if(r.status===401) throw new Error("G_AUTH");
    if(!r.ok) throw new Error("G_GET_"+r.status);
    const text = await r.text();
    return text;
  },

  async createOrUpdate(contentStr, fileId){
    const meta = { name: FILE_NAME, parents: ["appDataFolder"] };
    const boundary = "-------ac_sync_"+Math.random().toString(16).slice(2);
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`+
      JSON.stringify(meta)+
      `\r\n--${boundary}\r\nContent-Type: ${FILE_MIME}\r\n\r\n`+
      contentStr+`\r\n--${boundary}--`;

    const url = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

    const r = await fetch(url, {
      method: fileId ? "PATCH" : "POST",
      headers: { Authorization: "Bearer "+this._token, "Content-Type": `multipart/related; boundary=${boundary}` },
      body
    });
    if(r.status===401) throw new Error("G_AUTH");
    if(!r.ok) throw new Error("G_PUT_"+r.status);
    const j = await r.json();
    return j; // { id, modifiedTime, ...}
  },

  async delete(fileId){
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, { method:"DELETE", headers:{ Authorization: "Bearer "+this._token }});
    if(r.status===401) throw new Error("G_AUTH");
    if(!r.ok) throw new Error("G_DEL_"+r.status);
    return true;
  }
}; // Google

const MS = {
  _ready:false, _app:null, _account:null, _token:null,

  async ensureLib(){
    if(this._ready) return;
    if(!CFG.msal.clientId) throw new Error("Config MSAL ausente (clientId).");
    if(!window.msal){
      await new Promise((res, rej)=>{
        const s = document.createElement("script");
        s.src = "https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js"; // versão estável
        s.async = true; s.defer = true; s.onload = res; s.onerror = ()=>rej(new Error("Falha ao carregar MSAL"));
        document.head.appendChild(s);
      });
    }
    this._app = new window.msal.PublicClientApplication({ auth:{ clientId: CFG.msal.clientId, authority: CFG.msal.authority }});
    await this._app.initialize();
    const accounts = this._app.getAllAccounts();
    this._account = accounts[0] || null;
    this._ready = true;
  },

  async tokenInteractive(){
    await this.ensureLib();
    const loginResp = this._account
      ? { account: this._account }
      : await this._app.loginPopup({ scopes:[CFG.scopes.ms] });
    this._account = loginResp.account;
    const tok = await this._app.acquireTokenSilent({ account:this._account, scopes:[CFG.scopes.ms] }).catch(_=> this._app.acquireTokenPopup({ scopes:[CFG.scopes.ms] }));
    this._token = tok.accessToken;
    return this._token;
  },

  async tokenSilent(){
    try{
      await this.ensureLib();
      if(!this._account) return null;
      const tok = await this._app.acquireTokenSilent({ account:this._account, scopes:[CFG.scopes.ms] });
      this._token = tok.accessToken;
      return this._token;
    }catch{ return null; }
  },

  _metaUrl(){ return `https://graph.microsoft.com/v1.0/me/drive/special/approot:/`+encodeURIComponent(FILE_NAME); },
  _contentUrl(){ return this._metaUrl()+":/content"; },

  async getMeta(){
    const r = await fetch(this._metaUrl(), { headers:{ Authorization:"Bearer "+this._token }});
    if(r.status===401 || r.status===403) throw new Error("MS_AUTH");
    if(r.status===404) return null;
    if(!r.ok) throw new Error("MS_META_"+r.status);
    const j = await r.json(); // tem eTag, lastModifiedDateTime
    return j;
  },

  async getContent(){
    const r = await fetch(this._contentUrl(), { headers:{ Authorization:"Bearer "+this._token }});
    if(r.status===401 || r.status===403) throw new Error("MS_AUTH");
    if(r.status===404) return null;
    if(!r.ok) throw new Error("MS_GET_"+r.status);
    const text = await r.text();
    return text;
  },

  async putContent(contentStr, ifMatchETag=null){
    const headers = { Authorization:"Bearer "+this._token, "Content-Type": FILE_MIME };
    if(ifMatchETag) headers["If-Match"] = ifMatchETag; // concorrência otimista
    const r = await fetch(this._contentUrl(), { method:"PUT", headers, body: contentStr });
    if(r.status===401 || r.status===403) throw new Error("MS_AUTH");
    if(r.status===412) throw new Error("MS_PRECOND"); // etag mudou
    if(!r.ok){
      if(r.status===429 && r.headers.get("Retry-After")){ const sec = parseInt(r.headers.get("Retry-After"),10)||1; await sleep(sec*1000); }
      throw new Error("MS_PUT_"+r.status);
    }
    const j = await r.json(); // retorna novo eTag
    return j;
  },

  async delete(){
    const r = await fetch(this._metaUrl(), { method:"DELETE", headers:{ Authorization:"Bearer "+this._token }});
    if(r.status===401 || r.status===403) throw new Error("MS_AUTH");
    if(r.status===404) return true;
    if(!r.ok) throw new Error("MS_DEL_"+r.status);
    return true;
  }
}; // MS

// --- Snapshot (coleta/merge) -------------------------------------------------
async function buildSnapshotFromStore(store){
  const metas = (await store.listProjects?.()) || [];
  const map = {};
  for(const m of metas){
    map[m.id] = await store.getProject?.(m.id);
  }
  return {
    version: 1,
    ownerDeviceId: State.lastSnapshotMeta.ownerDeviceId || DEVICE_ID,
    updatedAt: nowTs(),
    metas, map
  };
}

function pickNewestByUpdatedAt(a, b){
  const ta = (a && a.updatedAt) || 0;
  const tb = (b && b.updatedAt) || 0;
  return (tb>ta) ? b : a;
}

// --- Orquestração de estados -------------------------------------------------
function setStatus(ui, mode, detail){
  State.mode = mode; State.detail = detail || "—";
  setText(ui.statusEl, mode);
  setText(ui.detailEl, detail || "—");
  ui.card?.dispatchEvent?.(new CustomEvent("sync-status", { detail:{ mode, detail } }));
}

function markProvider(ui, name, flags){
  const el = name==="google" ? ui.gStatus : ui.mStatus;
  if(!el) return;
  const parts = [];
  if(flags.on) parts.push("Conectado"); else parts.push("Desconectado");
  if(flags.degraded) parts.push("Degradado");
  if(flags.espelhando) parts.push("Espelhando");
  setText(el, parts.join(" · ") || "—");
}

// --- Polling/Standby ---------------------------------------------------------
function setupStandby(ui){
  // Entra em Standby após X minutos sem interação e aba oculta
  if(State.standbyTimer) clearTimeout(State.standbyTimer);
  const mins = CFG.timing.standbyIdleMin;
  State.standbyTimer = setTimeout(()=>{
    if(document.visibilityState === "hidden"){
      setStatus(ui, "Standby", "Pausado para economizar rede");
      stopPolling();
    }
  }, mins*60*1000);

  document.addEventListener("visibilitychange", ()=>{
    if(document.visibilityState === "visible"){
      // Acorda → faz uma checagem de meta e volta ao estado certo
      if(State.mode==="Standby") setStatus(ui, "Espelhando", "Retomando…");
      startPolling(ui);
    }else{
      // Aba oculta → desacelera
      startPolling(ui);
    }
  });

  window.addEventListener("online", ()=> startPolling(ui));
}

function startPolling(ui){
  stopPolling();
  if(State.mode!=="Espelhando") return;
  const interval = (document.visibilityState==="visible") ? CFG.timing.pollVisible : CFG.timing.pollHidden;
  State.pollingTimer = setInterval(async ()=>{
    try{
      await pullIfChanged(ui, { quick:true });
    }catch(e){ /* silencioso */ }
  }, interval);
}
function stopPolling(){
  if(State.pollingTimer){ clearInterval(State.pollingTimer); State.pollingTimer = null; }
}

// --- PUSH / PULL -------------------------------------------------------------
let _pushTimer=null, _lastPush=0;
function schedulePush(ui){
  if(State.mode!=="Ativo") return; // só o dono publica
  if(_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(()=> doPush(ui), CFG.timing.debounceMs);
}

async function doPush(ui){
  if(State.pushing) return;
  const since = nowTs() - _lastPush;
  if(since < CFG.timing.throttleMs){ await sleep(CFG.timing.throttleMs - since); }
  State.pushing = true; setStatus(ui, "Atualizando…", "Publicando alterações");
  try{
    // Coleta store → cifra → escreve nos provedores ativos
    const snap = await buildSnapshotFromStore(ui.ctx.store);
    snap.ownerDeviceId = DEVICE_ID;
    State.lastSnapshotMeta = { updatedAt: snap.updatedAt, ownerDeviceId: snap.ownerDeviceId };

    // exige chave (telefone+senha) se houver backups remotos já existentes e nenhuma cópia local
    if(!State.kdf){ throw new Error("CRIPTO_MISSING"); }

    const { iv, ciphertext } = await aesEncryptJSON(snap, State.kdf.key);
    const payload = JSON.stringify({
      version: snap.version,
      kdf: { algo:"PBKDF2", iterations: State.kdf.iterations, salt: State.kdf.saltB64 },
      iv, ciphertext,
      phone_hint: phoneHint(State.phone),
      updatedAt: snap.updatedAt,
      ownerDeviceId: snap.ownerDeviceId
    });
    if(payload.length > HARD_LIMIT_BYTES) throw new Error("PAYLOAD_TOO_BIG");

    // GOOGLE
    if(State.googleOn){
      try{
        const meta = await Google.listAppFile(); // null ou {id,...}
        const res = await Google.createOrUpdate(payload, meta?.id);
        State.google.has = true;
        State.google.modifiedTime = res.modifiedTime || new Date().toISOString();
        State.google.degraded = false;
      }catch(err){
        if(String(err).includes("G_AUTH")){ setStatus(ui, "Atenção", "Google: reautenticar"); State.google.degraded=true; }
        else { State.google.degraded=true; }
      }
    }
    // MS
    if(State.msOn){
      try{
        const meta = await MS.getMeta(); // null ou {eTag,...}
        const et = meta?.eTag;
        const res = await MS.putContent(payload, et || undefined);
        State.ms.has = true;
        State.ms.etag = res.eTag || res["@microsoft.graph.downloadUrl"] || null;
        State.ms.degraded = false;
      }catch(err){
        if(String(err).includes("MS_AUTH")){ setStatus(ui, "Atenção", "OneDrive: reautenticar"); State.ms.degraded=true; }
        else if(String(err).includes("MS_PRECOND")){ // alguém escreveu no meio
          setStatus(ui, "Espelhando", "Alterado em outro dispositivo");
        }else{
          State.ms.degraded=true;
        }
      }
    }

    setStatus(ui, "Atualizado", "Sincronizado");
    _lastPush = nowTs();
  }catch(err){
    if(String(err).includes("PAYLOAD_TOO_BIG")) setStatus(ui, "Atenção", "Limite de 5 MB excedido");
    else if(String(err).includes("CRIPTO_MISSING")) setStatus(ui, "Atenção", "Defina telefone e senha para cifrar");
    else setStatus(ui, "Degradado", "Erro no backup (ver console)");
    console.warn("[SYNC] doPush error:", err);
  }finally{
    State.pushing = false;
  }
}

async function pullIfChanged(ui, { quick=false }={}){
  // Lê metadados de ambos, escolhe o mais novo e, se mudou, baixa/decifra e aplica
  const metas = [];
  if(State.googleOn){
    try{
      const f = await Google.listAppFile();
      if(f){ metas.push({ who:"google", when: +new Date(f.modifiedTime), id:f.id }); State.google.has=true; State.google.modifiedTime=f.modifiedTime; }
    }catch(err){
      if(String(err).includes("G_AUTH")){ State.google.degraded=true; setStatus(ui,"Atenção","Google: reautenticar"); }
    }
  }
  if(State.msOn){
    try{
      const m = await MS.getMeta();
      if(m){ const when = +new Date(m.lastModifiedDateTime || m.fileSystemInfo?.lastModifiedDateTime || Date.now()); metas.push({ who:"ms", when, etag:m.eTag }); State.ms.has=true; State.ms.etag=m.eTag; }
    }catch(err){
      if(String(err).includes("MS_AUTH")){ State.ms.degraded=true; setStatus(ui,"Atenção","OneDrive: reautenticar"); }
    }
  }
  if(metas.length===0) return; // nada remoto

  metas.sort((a,b)=>b.when - a.when);
  const newest = metas[0];
  const newerThanLocal = (newest.when > (State.lastSnapshotMeta.updatedAt||0));

  if(!newerThanLocal && quick) return; // só meta check
  // Baixar + decifrar
  let text=null;
  if(newest.who==="google"){
    const f = await Google.listAppFile();
    if(!f) return;
    text = await Google.getFileContent(f.id);
  }else{
    text = await MS.getContent();
  }
  const bundle = JSON.parse(text||"{}");

  // exige telefone+senha no primeiro acesso sem local
  if(!State.kdf){
    promptPhonePass(ui, "Informe telefone (11 dígitos) e senha para abrir o backup remoto.");
    throw new Error("NEED_CREDENTIALS");
  }
  const snap = await aesDecryptJSON(bundle, State.kdf.key);
  // aplica no store: sobrescrever *totalmente* o banco local
  if(Array.isArray(snap.metas) && snap.map){
    // 1) apaga projetos que não existem mais
    const metasLocal = ui.ctx.store.listProjects?.() || [];
    const localIds = new Set(metasLocal.map(m=>m.id));
    const remoteIds = new Set(snap.metas.map(m=>m.id));
    for(const lid of localIds){ if(!remoteIds.has(lid) && ui.ctx.store.deleteProject){ await ui.ctx.store.deleteProject(lid); } }
    // 2) cria/atualiza
    for(const meta of snap.metas){
      const pj = snap.map[meta.id];
      const exists = metasLocal.find(m=>m.id===meta.id);
      if(!exists && ui.ctx.store.createProject){ await ui.ctx.store.createProject(pj); }
      else if(ui.ctx.store.updateProject){ await ui.ctx.store.updateProject(meta.id, pj); }
    }
    // atualiza Estado base
    State.lastSnapshotMeta = { updatedAt: snap.updatedAt||nowTs(), ownerDeviceId: snap.ownerDeviceId||null };
    ui.ctx.bus?.publish?.("ac:project-updated",{ id: ui.ctx.getCurrentId(), updatedAt: State.lastSnapshotMeta.updatedAt });
    setStatus(ui, "Atualizado", "Replicado do backup");
  }
}

// --- UI: inputs de telefone/senha na 1ª vez sem local -----------------------
function promptPhonePass(ui, msg){
  show(ui.lockWrap, true);
  setText(ui.lockMsg, msg||"");
}
async function setCredentials(ui){
  try{
    const phone = normalizePhoneBR(ui.inPhone.value);
    const pass = String(ui.inPass.value||"");
    if(pass.length < 8) throw new Error("Senha precisa de pelo menos 8 caracteres.");
    const { key, saltB64, iterations } = await deriveKeyPBKDF2(phone, pass);
    State.phone = phone;
    State.kdf = { key, saltB64, iterations };
    show(ui.lockWrap, false);
    setStatus(ui, State.mode==="Espelhando"?"Espelhando":"Atualizado", "Credenciais definidas");
  }catch(e){
    alert(e.message||String(e));
  }
}

// --- “Tomar controle” (manual) ----------------------------------------------
async function takeControl(ui){
  try{
    // força um pull meta e escreve owner=eu + updatedAt
    await pullIfChanged(ui, { quick:true });
    const snap = await buildSnapshotFromStore(ui.ctx.store);
    snap.ownerDeviceId = DEVICE_ID; snap.updatedAt = nowTs();

    if(!State.kdf) throw new Error("Defina telefone e senha antes.");
    const { iv, ciphertext } = await aesEncryptJSON(snap, State.kdf.key);
    const payload = JSON.stringify({
      version: snap.version, kdf:{ algo:"PBKDF2", iterations: State.kdf.iterations, salt: State.kdf.saltB64 },
      iv, ciphertext, phone_hint: phoneHint(State.phone), updatedAt: snap.updatedAt, ownerDeviceId: snap.ownerDeviceId
    });

    // Escreve priorizando OneDrive com If-Match (se ativo); Drive em seguida
    if(State.msOn){
      const meta = await MS.getMeta();
      await MS.putContent(payload, meta?.eTag);
      State.ms.etag = (await MS.getMeta())?.eTag || null;
    }
    if(State.googleOn){
      const f = await Google.listAppFile();
      await Google.createOrUpdate(payload, f?.id);
    }
    setStatus(ui, "Ativo", "Este dispositivo assumiu o controle");
    stopPolling();
  }catch(e){
    if(String(e).includes("MS_PRECOND")) alert("Outro dispositivo alterou o arquivo agora há pouco. Tente novamente.");
    else alert("Não foi possível assumir o controle: "+(e.message||e));
  }
}

// --- ON/OFF de provedores ----------------------------------------------------
async function toggleGoogle(ui){
  if(!State.googleOn){
    try{
      await Google.tokenInteractive();
      State.googleOn = true; markProvider(ui,"google",{on:true});
      setStatus(ui, State.mode==="Desativado"?"Espelhando":State.mode, "Google conectado");
      // descobrir se há arquivo remoto → se sim e não há local, pedir credenciais
      const f = await Google.listAppFile();
      if(f && !State.kdf){ promptPhonePass(ui, "Informe telefone e senha para abrir backup do Google."); }
    }catch(e){ alert("Google: não foi possível conectar."); }
  }else{
    // desligar só para de sincronizar (não faz logout global)
    State.googleOn = false; markProvider(ui,"google",{on:false});
    setStatus(ui, "Atualizado", "Google desconectado deste Mini-App");
  }
}

async function toggleMS(ui){
  if(!State.msOn){
    try{
      await MS.tokenInteractive();
      State.msOn = true; markProvider(ui,"ms",{on:true});
      setStatus(ui, State.mode==="Desativado"?"Espelhando":State.mode, "OneDrive conectado");
      const m = await MS.getMeta();
      if(m && !State.kdf){ promptPhonePass(ui, "Informe telefone e senha para abrir backup do OneDrive."); }
    }catch(e){ alert("OneDrive: não foi possível conectar."); }
  }else{
    State.msOn = false; markProvider(ui,"ms",{on:false});
    setStatus(ui, "Atualizado", "OneDrive desconectado deste Mini-App");
  }
}

// --- Montagem do painel ------------------------------------------------------
export function mountSyncMiniApp(host, ctx){
  const ui = {
    ctx,
    card: host.closest(".mini.kpi") || null,
    statusEl: null, detailEl: null,
    gBtn:null, mBtn:null, takeBtn:null,
    gStatus:null, mStatus:null,
    lockWrap:null, lockMsg:null, inPhone:null, inPass:null, credBtn:null
  };

  // Layout simples (herda CSS do app)
  const statusRow = el("div", { class:"hbar-legend" },
    el("span", { id:"sync_status" }, "Desativado"),
    el("span", { id:"sync_detail", class:"muted" }, "—")
  );
  const providersRow = el("div", { style:"display:flex; gap:8px; align-items:center; margin-top:8px" },
    ui.gBtn = el("button", { class:"edit-btn", title:"Google Drive", onclick:()=>toggleGoogle(ui) }, "Google Drive"),
    ui.gStatus = el("span", { class:"small muted" }, "—"),
    el("span", { style:"width:12px" }),
    ui.mBtn = el("button", { class:"edit-btn", title:"OneDrive", onclick:()=>toggleMS(ui) }, "OneDrive"),
    ui.mStatus = el("span", { class:"small muted" }, "—")
  );
  const actionsRow = el("div", { style:"display:flex; gap:8px; align-items:center; margin-top:8px" },
    ui.takeBtn = el("button", { class:"edit-btn", title:"Tomar controle", onclick:()=>takeControl(ui) }, "Tomar controle"),
    el("button", { class:"edit-btn", title:"Sincronizar agora", onclick:()=>doPush(ui) }, "Sincronizar agora")
  );
  const lockBox = el("div", { style:"display:none; margin-top:10px; padding:8px; border:1px solid #eee; border-radius:8px; background:#fafafa" },
    ui.lockMsg = el("div", { class:"small", style:"margin-bottom:6px" }, "Informe telefone e senha para abrir o backup."),
    el("div", { style:"display:flex; gap:8px; flexWrap:'wrap'; alignItems:'center'" },
      ui.inPhone = el("input", { type:"tel", placeholder:"Telefone (DDD+9 dígitos)", inputmode:"numeric" }),
      ui.inPass  = el("input", { type:"password", placeholder:"Senha (mín. 8)" }),
      ui.credBtn = el("button", { class:"edit-btn", onclick:()=>setCredentials(ui) }, "Definir")
    )
  );
  host.appendChild(statusRow);
  host.appendChild(providersRow);
  host.appendChild(actionsRow);
  host.appendChild(lockBox);

  ui.statusEl = statusRow.querySelector("#sync_status");
  ui.detailEl = statusRow.querySelector("#sync_detail");
  ui.lockWrap = lockBox;

  // Estado inicial
  setStatus(ui, "Desativado", "Escolha um provedor para começar");
  markProvider(ui, "google", { on:false });
  markProvider(ui, "ms", { on:false });

  // Reage a atualizações do projeto (autosave → push)
  ctx.bus?.subscribe?.("ac:project-updated", ()=> schedulePush(ui));

  // Se a aba ficar ociosa/oculta por muito tempo, entra em Standby (retoma com visibilitychange/online)
  setupStandby(ui);

  // Se já houver dados locais (metas>0), podemos marcar modo padrão = Ativo (mas sem publicar até ligar provedor)
  try{
    const metas = ctx.store.listProjects?.() || [];
    if(metas.length>0){
      State.lastSnapshotMeta.updatedAt = metas.reduce((mx,m)=>Math.max(mx, (ctx.store.getProject?.(m.id)?.updatedAt||0)), 0);
      setStatus(ui, "Ativo", "Local-first; conecte um provedor para espelhar");
    }else{
      setStatus(ui, "Espelhando", "Sem dados locais; conecte e abra do backup");
    }
  }catch{
    setStatus(ui, "Espelhando", "Sem dados locais; conecte e abra do backup");
  }

  // BroadcastChannel (cross-abas) para avisar mudanças de status (opcional)
  try{
    const bc = new BroadcastChannel("ac-sync");
    bc.onmessage = (ev)=>{
      if(ev?.data?.type==="sync-status"){ setText(ui.statusEl, ev.data.mode); setText(ui.detailEl, ev.data.detail||"—"); }
    };
    ui.card?.addEventListener?.("sync-status", (e)=> bc.postMessage({ type:"sync-status", ...e.detail }));
  }catch{ /* não crítico */ }

  return true;
}
