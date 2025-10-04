// Funções de domínio para tarefas do mini-app.

const DEFAULT_ID_PREFIX = 't';
const uid = ()=> DEFAULT_ID_PREFIX + Math.random().toString(36).slice(2,10);

export const taskModels = {
  casamento: [
    { titulo:'Definir orçamento', responsavel:'Anfitrião', prazo:'' },
    { titulo:'Reservar local da cerimônia', responsavel:'Cerimonial', prazo:'' },
    { titulo:'Reservar buffet', responsavel:'Cerimonial', prazo:'' },
    { titulo:'Contratar fotógrafo', responsavel:'Cerimonial', prazo:'' },
    { titulo:'Lista de convidados inicial', responsavel:'Anfitrião', prazo:'' }
  ],
  debutante15: [
    { titulo:'Definir tema/festa', responsavel:'Anfitrião', prazo:'' },
    { titulo:'Contratar DJ/banda', responsavel:'Cerimonial', prazo:'' },
    { titulo:'Coreografia valsa', responsavel:'Família', prazo:'' },
    { titulo:'Convites e distribuição', responsavel:'Anfitrião', prazo:'' }
  ],
  jantarCorporativo: [
    { titulo:'Briefing com equipe de marketing', responsavel:'Equipe', prazo:'' },
    { titulo:'Lista de VIPs', responsavel:'Comercial', prazo:'' },
    { titulo:'Reserva restaurante/espaco', responsavel:'Operações', prazo:'' },
    { titulo:'Material de apoio (brindes)', responsavel:'Marketing', prazo:'' }
  ]
};

export function normalizeStatus(status){
  const k = String(status||'').trim().toLowerCase();
  const map = {
    'a fazer':'todo','nao iniciado':'todo','não iniciado':'todo','não-iniciado':'todo','pendente':'todo','todo':'todo',
    'iniciado':'doing','em andamento':'doing','andamento':'doing','doing':'doing',
    'concluida':'done','concluída':'done','feito':'done','done':'done',
    'atrasada':'late','atrasado':'late','late':'late'
  };
  return map[k] || '';
}

export function computeStatus(task, computeOverride){
  if(typeof computeOverride === 'function'){
    try{ return computeOverride(task); }catch{ /* noop */ }
  }
  const prazo = task?.prazo || task?.due || '';
  if(prazo){
    const d = new Date(prazo);
    const ref = new Date(); ref.setHours(0,0,0,0);
    if(!Number.isNaN(+d) && d < ref) return 'late';
  }
  return normalizeStatus(task?.status) || 'todo';
}

export function normalizeTask(task = {}, options = {}){
  const base = {
    id: task.id || uid(),
    titulo: task.titulo ?? task.nome ?? task.title ?? task.text ?? '',
    responsavel: task.responsavel ?? task.owner ?? task.assign ?? '',
    prazo: task.prazo ?? task.data ?? task.due ?? '',
    notas: task.notas ?? task.obs ?? task.notes ?? ''
  };
  const override = options.computeStatus || options.overrideCompute;
  const status = normalizeStatus(task.status) || computeStatus(task, override);
  base.status = status;
  base.done = status === 'done';
  return base;
}

export function ensureChecklist(project){
  const base = project && typeof project === 'object' ? project : {};
  base.checklist ||= [];
  return base.checklist;
}

export function computeTasksKpi(list = []){
  const total = Array.isArray(list) ? list.length : 0;
  const counts = { todo:0, doing:0, late:0, done:0 };
  (list || []).forEach(task => {
    const st = task?.status ? normalizeStatus(task.status) || task.status : 'todo';
    const key = counts[st] !== undefined ? st : 'todo';
    counts[key] += 1;
  });
  const concluidas = counts.done;
  const pendentes = Math.max(0, total - concluidas);
  const pctConcluidas = total > 0 ? Math.round((concluidas/total)*100) : 0;
  return { total, concluidas, pendentes, pctConcluidas, ...counts };
}

export default {
  taskModels,
  normalizeStatus,
  computeStatus,
  normalizeTask,
  ensureChecklist,
  computeTasksKpi
};
