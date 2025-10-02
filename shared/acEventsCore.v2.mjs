// ===============================
// /shared/acEventsCore.v2.mjs
// ===============================
// AC Eventos Core v2 — helpers + KPIs centralizados (atualizado)
// Mantém compatibilidade com v1 e amplia KPIs de tarefas com breakdown de status

// ========================= Utils =========================
const toNum = (v)=>{
  if(typeof v === 'number' && !Number.isNaN(v)) return v;
  if(typeof v === 'string'){
    const s = v.replace(/[^0-9,.-]/g,'').replace(/\.(?=.*\.)/g,'').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n)? n : 0;
  }
  return 0;
};
const sum = (arr)=> (Array.isArray(arr)? arr : []).reduce((a,b)=> a + toNum(b), 0);

// ========================= Format =========================
export const format = {
  money(n){ try{ return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(toNum(n)); }catch{ return `R$ ${toNum(n).toFixed(2)}`; } },
  fmtDateTime(ts){ if(!ts) return ''; const d = new Date(ts); if(Number.isNaN(+d)) return String(ts); return d.toLocaleString('pt-BR'); },
  fmtDateBR(d){ if(!d) return ''; // aceita YYYY-MM-DD ou Date
    if(d instanceof Date) return d.toLocaleDateString('pt-BR');
    const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m) return String(d);
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
};

// ========================= CEP helpers =========================
export const cep = {
  maskCep(v=''){ const digits = v.replace(/\D/g,'').slice(0,8); return digits.replace(/(\d{5})(\d{0,3})/, (_,a,b)=> b? `${a}-${b}` : a); },
  async fetchCep(v){ try{
    const only = String(v||'').replace(/\D/g,''); if(only.length!==8) return null;
    const r = await fetch(`https://viacep.com.br/ws/${only}/json/`);
    const j = await r.json(); if(j?.erro) return null;
    return { logradouro:j.logradouro||'', bairro:j.bairro||'', cidade:j.localidade||'', uf:j.uf||'' };
  }catch{ return null; }
  }
};

// ========================= Model =========================
export const model = {
  ensureShape(p){
    const base = p && typeof p==='object'? p : {};
    base.evento ||= { endereco:{}, anfitriao:{ endCorrespondencia:{}, endEntrega:{} } };
    base.evento.anfitriao ||= { endCorrespondencia:{}, endEntrega:{} };
    base.evento.endereco  ||= {};
    base.cerimonialista   ||= {};
    base.fornecedores     ||= [];
    base.convidados       ||= [];
    base.checklist        ||= [];
    base.mensagens        ||= [];
    base.tipos            ||= [];
    base.modelos          ||= {};
    base.vars             ||= {};
    return base;
  }
};

// ========================= Tasks helper =========================
export const tasks = {
  /** Normaliza e infere status da tarefa de forma retrocompatível.
   * Regras:
   * - done=true => 'done'
   * - se não done e prazo < hoje => 'late'
   * - senão usa status informado mapeando sinônimos; fallback 'todo'
   */
  computeStatus(t, today = new Date()){
    const done = !!(t?.done ?? t?.concluida ?? t?.feito);
    if(done) return 'done';
    const norm = (s)=> String(s||'').trim().toLowerCase();
    const map  = {
      'a fazer':'todo', 'todo':'todo', 'pendente':'todo',
      'em andamento':'doing','andamento':'doing','doing':'doing',
      'concluida':'done','concluída':'done','feito':'done','done':'done',
      'atrasada':'late','atrasado':'late','late':'late'
    };
    let st = map[norm(t?.status)] || null;
    const prazo = t?.prazo || t?.due || '';
    if(prazo){
      const d = new Date(prazo);
      if(!Number.isNaN(+d)){
        const ref = new Date(today); ref.setHours(0,0,0,0);
        if(d < ref) return 'late';
      }
    }
    return st || 'todo';
  }
};

// ========================= Stats (compat + KPIs) =========================
function fornecedorPrevisto(f){
  if(Array.isArray(f?.itens) && f.itens.length){
    return sum(f.itens.map(it=> toNum(it?.valor ?? it?.preco ?? it?.total)));
  }
  return toNum(f?.previsto ?? f?.valor ?? f?.orcado ?? f?.total ?? 0);
}
function fornecedorPago(f){
  let pago = toNum(f?.pago ?? 0);
  if(Array.isArray(f?.pagamentos)) pago += sum(f.pagamentos.map(pg=> toNum(pg?.valor ?? pg?.pago)));
  if(Array.isArray(f?.parcelas))  pago += sum(f.parcelas.map(par=> (par?.pago||/pago|quit|ok/i.test(String(par?.status||'')))? toNum(par?.valor) : 0));
  return pago;
}

function taskDone(t){
  // respeita boolean legacy e status derivado
  if(!!(t?.done ?? t?.concluida ?? t?.feito)) return true;
  try{ return tasks.computeStatus(t)==='done'; }catch{ return false; }
}

function guestConfirmed(g){
  const s = String(g?.status||'').toLowerCase();
  const rsvp = g?.rsvp ?? g?.confirmado ?? g?.confirmada ?? g?.confirmacao;
  const truthy = (v)=> typeof v==='boolean'? v : /^(sim|yes|y|ok|1|confirmad[oa])$/i.test(String(v));
  return truthy(rsvp) || ['confirmado','confirmada','presença confirmada'].includes(s);
}

function bucketBy(arr, key){
  const map = new Map();
  (arr||[]).forEach(x=>{ const k = (typeof key==='function'? key(x) : x?.[key]) || '—'; map.set(k, (map.get(k)||0)+1); });
  return [...map.entries()].sort((a,b)=> b[1]-a[1]);
}

function sevenDayWindow(){
  const start = new Date(); start.setHours(0,0,0,0);
  const days = Array.from({length:7}, (_,i)=> new Date(start.getTime()+i*864e5));
  return { start, days };
}

function msgDate(ms){
  const v = ms?.quando ?? ms?.data ?? ms?.date ?? ms?.ts ?? ms?.timestamp;
  if(!v) return null; const d = v instanceof Date? v : new Date(v);
  return Number.isNaN(+d)? null : d;
}

export const stats = {
  // ------- Compat: agregados básicos -------
  fornecedores(list){
    const n = Array.isArray(list)? list.length : 0;
    const previsto = sum((list||[]).map(fornecedorPrevisto));
    const pago     = sum((list||[]).map(fornecedorPago));
    const pendente = Math.max(0, previsto - pago);
    const pct = previsto>0? Math.round((pago/previsto)*100) : 0;
    return { n, previsto, pago, pendente, pct };
  },
  tasks(list){
    const n = Array.isArray(list)? list.length : 0;
    const done = (list||[]).filter(taskDone).length;
    return { n, done };
  },
  convidados(list){
    const n = Array.isArray(list)? list.length : 0;
    const conf = (list||[]).filter(guestConfirmed).length;
    const mesas  = bucketBy(list, g=> g?.mesa||g?.table||g?.setor||'—');
    const grupos = bucketBy(list, g=> g?.grupo||g?.grupoNome||g?.categoria||'—');
    return { n, conf, mesas, grupos };
  },
  mensagens(list){
    const { start } = sevenDayWindow();
    const perDay = Array(7).fill(0);
    (list||[]).forEach(m=>{ const d = msgDate(m); if(!d) return; const diff = Math.floor((d - start)/864e5); if(diff>=0 && diff<7) perDay[diff]++; });
    return { perDay };
  },

  // ------- KPIs de alto nível (v3) -------
  kpiFornecedores(list){
    const b = this.fornecedores(list);
    return { total:b.previsto, pago:b.pago, pendente:b.pendente, pctPago:b.pct };
  },
  kpiTarefas(list){
    const total = Array.isArray(list)? list.length : 0;
    const counts = { todo:0, doing:0, late:0, done:0 };
    (list||[]).forEach(t=>{ try{ counts[tasks.computeStatus(t)]++; }catch{ counts.todo++; } });
    const concluidas = counts.done;
    const pendentes  = Math.max(0, total - concluidas);
    const pctConcluidas = total>0? Math.round((concluidas/total)*100) : 0;
    return { total, concluidas, pendentes, pctConcluidas, ...counts };
  },
  kpiConvidados(list){
    const b = this.convidados(list);
    const pctConfirmados = b.n>0? Math.round((b.conf/b.n)*100) : 0;
    const pendentes = Math.max(0, b.n - b.conf);
    return { total:b.n, confirmados:b.conf, pendentes, pctConfirmados, mesas:b.mesas, grupos:b.grupos };
  },
  kpiMensagens(list){
    const k = this.mensagens(list);
    const total = k.perDay.reduce((a,b)=>a+b,0);
    const pico  = Math.max(0, ...k.perDay);
    return { perDay:k.perDay, total, pico };
  }
};

export default { format, cep, model, tasks, stats };
