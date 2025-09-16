// utils/cerimonial-utils.js
(function (global) {
  const STATUS = [
    { key: 'nao', label: 'Não iniciado', cls: 's-nao' },
    { key: 'env', label: 'Enviado', cls: 's-env' },
    { key: 'resp', label: 'Respondido', cls: 's-resp' }
  ];

  const titleCase = s => {
    if (!s) return '';
    const words = String(s).toLowerCase().split(' ').filter(Boolean);
    const preps = { da:1,de:1,do:1,das:1,dos:1,e:1,di:1,du:1 };
    return words.map((w,i)=> (i>0 && preps[w]) ? w : w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  };

  const padronizaBR = digits => {
    if (!digits) return null;
    if (digits.slice(0,2)==='55') return null;
    if (digits.length!==10 && digits.length!==11) return null;
    const ddd = digits.slice(0,2);
    const sub0 = digits.slice(2);
    const sub = (sub0.length===8 && /^[6-9]/.test(sub0.charAt(0))) ? '9'+sub0 : sub0;
    return ddd+sub;
  };

  const normalizeIntlE164 = raw => {
    if (!raw) return null;
    const d = String(raw).replace(/\D+/g,'');
    if (d.length<8 || d.length>15) return null;
    return '+'+d;
  };

  const isLikelyPhone = part => {
    const digits = String(part||'').replace(/\D+/g,'');
    return digits.length>=8 || /^\+\d{1,15}$/.test(String(part||''));
  };

  const extractPhoneName = parts => {
    let phoneIdx=-1;
    for (let i=0;i<parts.length;i++){ if(isLikelyPhone(parts[i])){ phoneIdx=i; break; } }
    let nameIdx=-1;
    for (let j=0;j<parts.length;j++){ if(j===phoneIdx) continue; if(parts[j]){ nameIdx=j; break; } }
    const phoneRaw = phoneIdx>-1 ? parts[phoneIdx] : '';
    const name = nameIdx>-1 ? titleCase(parts[nameIdx]) : '';
    const acomp=[];
    for (let k=0;k<parts.length;k++){ if(k!==phoneIdx && k!==nameIdx && parts[k]) acomp.push(titleCase(parts[k])); }
    return { phoneRaw, name, acomp };
  };

  function validateInvite(it){
    const issues=[]; let intl=false; let normalized=null; const raw=String(it.phone||'').trim();
    const preferIntl=(typeof it.manualIntl==="boolean")? it.manualIntl : null;
    if(preferIntl===true){
      if(!/^\+/.test(raw)) { issues.push('telefone internacional deve iniciar com +'); }
      else { const digits=raw.replace(/\D+/g,''); if(digits.slice(0,2)==='55'){ issues.push('número brasileiro não deve usar +55'); } else { normalized=normalizeIntlE164(raw); if(!normalized) issues.push('telefone internacional inválido'); else intl=true; } }
    } else if(preferIntl===false){
      if(/^\+/.test(raw)) { issues.push('número brasileiro não deve iniciar com +'); }
      else { const digitsOnly=raw.replace(/\D+/g,''); if(digitsOnly.slice(0,2)==='55' && (digitsOnly.length===12 || digitsOnly.length===13)){ issues.push('número brasileiro não deve usar código 55'); } else { normalized=padronizaBR(digitsOnly); if(!normalized) issues.push('formato BR inválido'); } }
    } else {
      if(/^\+/.test(raw)){
        const d=raw.replace(/\D+/g,''); if(d.slice(0,2)==='55'){ issues.push('número brasileiro não deve usar +55'); }
        else { normalized=normalizeIntlE164(raw); if(!normalized) issues.push('telefone internacional inválido'); else intl=true; }
      } else {
        const digitsOnly2=raw.replace(/\D+/g,''); if(digitsOnly2.slice(0,2)==='55' && (digitsOnly2.length===12 || digitsOnly2.length===13)){ issues.push('número brasileiro não deve usar código 55'); }
        else { normalized=padronizaBR(digitsOnly2); if(!normalized) issues.push('formato BR inválido'); }
      }
    }
    if(issues.length===0){ it.phone = normalized; it.intl=intl; } else { it.intl=intl; }
    if(!it.name || !String(it.name).trim()) issues.push('sem nome');
    it.validPhone = issues.length===0;
    it.issues = issues;
    if(typeof it.qty!=="number" || !(it.qty>0)) it.qty = 1 + (it.acomp? it.acomp.length : 0);
    if(!it.status){ it.status='nao'; }
    return it;
  }

  const parseLines = raw => {
    if (!raw) return {items:[],bad:0};
    const lines = raw.split(/\r?\n/);
    const out=[]; let bad=0;
    for (let i=0;i<lines.length;i++){
      const t=lines[i].trim(); if(!t) continue;
      const parts=t.split(',').map(p=>p.trim()).filter(x=>x!=="" && x!=="\"");
      const ex=extractPhoneName(parts);
      const item={ id:0, phone:ex.phoneRaw, name:ex.name, acomp:ex.acomp, intl:false, manualIntl:null, validPhone:false, issues:[], confirmed:0, qty:0, status:'nao' };
      out.push(item);
      const tmp=JSON.parse(JSON.stringify(item));
      validateInvite(tmp);
      if(!tmp.validPhone) bad++;
    }
    return { items:out, bad };
  };

  const sumGuests = list => list.reduce((tot,it)=> tot + ((typeof it.qty==="number"&&it.qty>0)? it.qty : (1+(it.acomp?it.acomp.length:0))), 0);
  const sumConfirmed = list => list.reduce((n,it)=>{ let v=parseInt(it.confirmed,10); const cap=(typeof it.qty==="number"&&it.qty>0)?it.qty:(1+(it.acomp?it.acomp.length:0)); if(isNaN(v)) v=0; return n + Math.max(0, Math.min(v, cap)); }, 0);
  const sumGuestsWhere = (list,pred)=> list.reduce((tot,it)=> pred(it)? tot + ((typeof it.qty==="number"&&it.qty>0)? it.qty : (1+(it.acomp?it.acomp.length:0))) : tot, 0);

  const statusLabel = key => { const f=STATUS.find(s=>s.key===key); return f? f.label : key; };
  const statusClass = key => { const f=STATUS.find(s=>s.key===key); return f? f.cls : 's-nao'; };

  const calcInvitePercents = list => {
    const n=list.length||0; const counts={nao:0,env:0,resp:0};
    list.forEach(it=>{ const k=it.status||'nao'; counts[k]=(counts[k]||0)+1; });
    const pct=x=> n? Math.round((x/n)*100) : 0;
    return {nao:pct(counts.nao||0), env:pct(counts.env||0), resp:pct(counts.resp||0)};
  };

  const calcGuestPercents = list => {
    const total=sumGuests(list); if(!total) return {conf:0, pend:0, nao:0};
    const confirmed=sumConfirmed(list);
    let nao=0;
    list.forEach(it=>{
      const cap=(typeof it.qty==="number"&&it.qty>0)?it.qty:(1+(it.acomp?it.acomp.length:0));
      const conf=Math.max(0, Math.min(parseInt(it.confirmed||0,10)||0, cap));
      if(it.status==='resp'){ nao += Math.max(0, cap - conf); }
    });
    const pend=Math.max(total - confirmed - nao, 0);
    const pct=x=> Math.round((x/total)*100);
    return {conf:pct(confirmed), pend:pct(pend), nao:pct(nao)};
  };

  global.CerimonialUtils = {
    STATUS, titleCase, padronizaBR, normalizeIntlE164, isLikelyPhone,
    extractPhoneName, validateInvite, parseLines,
    sumGuests, sumConfirmed, sumGuestsWhere,
    statusLabel, statusClass, calcInvitePercents, calcGuestPercents
  };
})(window);
