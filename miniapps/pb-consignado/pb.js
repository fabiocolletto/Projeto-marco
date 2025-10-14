const $ = (s)=>document.querySelector(s); const out=$("#out");
const log=(x)=>{ out.textContent += (typeof x==="string"?x:JSON.stringify(x,null,2)) + "\n"; };
async function getCfg(){ const local = window.env||{}; const cfg = await fetch("/appbase/config/app.config.json").then(r=>r.json()).catch(()=>({}));
  return { PB_API_BASE: local.PB_API_BASE || "https://api-marketplace.paranabanco.com.br/v1", PB_CLIENT_ID: local.PB_CLIENT_ID || "SEU_CLIENT_ID", PB_CLIENT_SECRET: local.PB_CLIENT_SECRET || "SEU_CLIENT_SECRET", ...cfg }; }
async function apiToken(cfg){ const url = cfg.PB_API_BASE.replace(/\/$/,"") + "/auth/token";
  const res = await fetch(url,{ method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded","X-Client-Id": cfg.PB_CLIENT_ID,"Authorization":"Basic "+btoa(cfg.PB_CLIENT_ID+":"+cfg.PB_CLIENT_SECRET)}, body: new URLSearchParams({grant_type:"client_credentials"}) });
  if(!res.ok) throw new Error("Token HTTP "+res.status); return res.json(); }
async function apiConsent(cfg, tok, cpf){ const url = cfg.PB_API_BASE.replace(/\/$/,"") + "/inss/beneficio/consentimento";
  const res = await fetch(url,{ method:"POST", headers:{ "Content-Type":"application/json","Authorization":"Bearer "+tok.access_token,"X-Client-Id": cfg.PB_CLIENT_ID }, body: JSON.stringify({ cpf }) });
  if(!res.ok) throw new Error("Consent HTTP "+res.status); return res.json(); }
async function apiStatus(cfg, tok, batchId){ const url = cfg.PB_API_BASE.replace(/\/$/,"") + "/oportunidades/"+encodeURIComponent(batchId)+"/status";
  const res = await fetch(url,{ headers:{ "Authorization":"Bearer "+tok.access_token,"X-Client-Id": cfg.PB_CLIENT_ID } }); if(!res.ok) throw new Error("Status HTTP "+res.status); return res.json(); }
let token=null;
$("#btnToken").onclick = async()=>{ out.textContent=""; const cfg=await getCfg(); log("› Token…"); token=await apiToken(cfg); log(token); };
$("#btnConsent").onclick = async()=>{ out.textContent=""; const cfg=await getCfg(); const cpf=($("#cpf").value||"").replace(/\D/g,""); if(!cpf) return log("Informe um CPF válido."); if(!token) token=await apiToken(cfg); log("› Consentimento…"); const r=await apiConsent(cfg,token,cpf); log(r); };
$("#btnStatus").onclick = async()=>{ out.textContent=""; const cfg=await getCfg(); const id=($("#batchId").value||"").trim(); if(!id) return log("Informe o Batch ID."); if(!token) token=await apiToken(cfg); log("› Status…"); const r=await apiStatus(cfg,token,id); log(r); };
