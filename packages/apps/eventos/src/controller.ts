import { derived, get, writable, type Readable } from 'svelte/store';
import type {
  ProjectDataApi,
  ProjectMeta,
  ProjectPayload,
  ProjectStore,
} from '@ac/data/projectStore';
import type { PanelId } from './stores/ui';
import type { IndicatorCard, GuestsIndicator } from './components/DashboardIndicators.svelte';
import type { BadgeRow } from './components/DashboardBadges.svelte';
import type { SyncStatus } from './components/DashboardHeader.svelte';
import { createSyncClient, type SyncClient } from '@marco/platform/syncClient';

const STORAGE_KEY = 'ac:lastId';

interface MiniAppMounts {
  tarefas?: { mountTasksMiniApp?: Function };
  fornecedores?: { mountFornecedoresMiniApp?: Function };
  convidados?: { mountConvidadosMiniApp?: Function };
  mensagens?: { mountMensagensMiniApp?: Function };
}

export interface EventosControllerOptions {
  projectData: ProjectDataApi;
  ac: any;
  bus?: { publish?: Function; subscribe?: Function };
  store?: ProjectStore | null;
  miniApps?: MiniAppMounts;
}

export interface EventosState {
  metas: ProjectMeta[];
  currentId: string | null;
  project: ProjectPayload;
  dirty: boolean;
  saving: boolean;
  usingFallback: boolean;
  loading: boolean;
}

export interface EventosController {
  state: Readable<EventosState>;
  form: Readable<ProjectPayload>;
  dateTime: Readable<string>;
  indicators: Readable<{ tarefas: IndicatorCard; fornecedores: IndicatorCard; convidados: GuestsIndicator }>;
  badges: Readable<{ evento: BadgeRow[]; anfitriao: BadgeRow[]; cerimonial: BadgeRow[] }>;
  chips: Readable<{ ready: boolean; dirty: boolean; saving: boolean }>;
  syncStatus: Readable<SyncStatus>;
  syncClient: SyncClient;
  init(): Promise<void>;
  destroy(): void;
  select(id: string | null): Promise<void>;
  createNew(): Promise<void>;
  deleteCurrent(): Promise<void>;
  setValue(path: string, value: string): void;
  getValue(path: string): string;
  setDateTime(value: string): void;
  maskCep(value: string): string;
  fillCep(prefix: string, cep: string): Promise<void>;
  mountMiniApp(kind: 'tarefas' | 'fornecedores' | 'convidados' | 'mensagens', host: HTMLElement | null): void;
  refreshFornecedores(): void;
}

function clonePayload<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value ?? {}));
}

function safeGet<T extends object, R = unknown>(value: T, path: string, fallback: any = ''): R {
  return path.split('.').reduce((acc: any, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, value) ?? fallback;
}

function setPath(target: any, path: string, value: any): void {
  const parts = path.split('.');
  let ref = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (typeof ref[key] !== 'object' || ref[key] === null) {
      ref[key] = {};
    }
    ref = ref[key];
  }
  ref[parts.at(-1)!] = value;
}

function ensureSyncStatus(status: any): SyncStatus {
  const mode = status?.mode ?? 'Desativado';
  const detail = status?.detail ?? '—';
  return {
    status: String(mode || 'Desativado'),
    detail: String(detail || '—'),
    active: Boolean(mode && String(mode).toLowerCase() !== 'desativado'),
  };
}

function formatBadgeRows(ac: any, project: ProjectPayload): { evento: BadgeRow[]; anfitriao: BadgeRow[]; cerimonial: BadgeRow[] } {
  const shaped = ac.model.ensureShape(clonePayload(project));
  const evento = shaped.evento || {};
  const anfitriao = evento.anfitriao || {};
  const cerimonial = shaped.cerimonialista || {};

  const fmtDateCompact = (date: string, time: string) => {
    const ddmmyyyy = ac.format?.fmtDateBR ? ac.format.fmtDateBR(date) : date;
    const hhmm = (time || '').slice(0, 5);
    return [ddmmyyyy, hhmm].filter(Boolean).join(' ');
  };

  const eventoRows: BadgeRow[] = [];
  if (evento.nome) eventoRows.push(['Evento', evento.nome]);
  if (evento.tipo) eventoRows.push(['Tipo', evento.tipo]);
  const when = fmtDateCompact(evento.data || '', evento.hora || '');
  if (when) eventoRows.push(['Data', when]);
  if (evento.local) eventoRows.push(['Local', evento.local]);

  const anfitriaoRows: BadgeRow[] = [];
  if (anfitriao.nome) anfitriaoRows.push(['Nome', anfitriao.nome]);
  if (anfitriao.telefone) anfitriaoRows.push(['Telefone', anfitriao.telefone]);
  if (anfitriao.redeSocial) anfitriaoRows.push(['Contato', anfitriao.redeSocial]);

  const cerimonialRows: BadgeRow[] = [];
  const nomeCerimonial = cerimonial.nomeCompleto || cerimonial.nome;
  if (nomeCerimonial) cerimonialRows.push(['Nome', nomeCerimonial]);
  if (cerimonial.telefone) cerimonialRows.push(['Telefone', cerimonial.telefone]);
  if (cerimonial.redeSocial) cerimonialRows.push(['Rede social', cerimonial.redeSocial]);

  return { evento: eventoRows, anfitriao: anfitriaoRows, cerimonial: cerimonialRows };
}

function formatIndicators(ac: any, project: ProjectPayload): {
  tarefas: IndicatorCard;
  fornecedores: IndicatorCard;
  convidados: GuestsIndicator;
} {
  const shaped = ac.model.ensureShape(clonePayload(project));
  const fornecedoresKpi = ac.stats.kpiFornecedores(shaped.fornecedores || []);
  const tarefasKpi = ac.stats.kpiTarefas(shaped.checklist || []);
  const convidadosKpi = ac.stats.kpiConvidados(shaped.convidados || []);

  const fornecedores: IndicatorCard = {
    panel: 'fornecedores',
    title: `Fornecedores (${ac.format.money(fornecedoresKpi.pendente)} pendentes)`,
    percentage: fornecedoresKpi.pctPago || 0,
    primary: `${ac.format.money(fornecedoresKpi.pago)} pagos — ${fornecedoresKpi.pctPago}%`,
    secondary: `Total: ${ac.format.money(fornecedoresKpi.total)}`,
  };

  const tarefas: IndicatorCard = {
    panel: 'tarefas',
    title: `Tarefas (${tarefasKpi.pendentes} pendentes)`,
    percentage: tarefasKpi.pctConcluidas || 0,
    primary: `${tarefasKpi.concluidas} concluídas — ${tarefasKpi.pctConcluidas}%`,
    secondary: `Total: ${tarefasKpi.total}`,
  };

  const totalGuests = convidadosKpi.total || 0;
  const bandsRaw = convidadosKpi.mesas && convidadosKpi.mesas.some((entry: any[]) => entry?.[1] > 0)
    ? convidadosKpi.mesas
    : convidadosKpi.grupos || [];
  const sum = bandsRaw.reduce((acc: number, [, value]: [string, number]) => acc + (value || 0), 0) || 1;
  const bands = (bandsRaw as [string, number][]).slice(0, 10).map(([label, value]) => ({
    label: label || '—',
    value: sum > 0 ? (value / sum) * 100 : 0,
  }));

  const convidados: GuestsIndicator = {
    panel: 'convidados',
    title: `Convidados & Convites (${convidadosKpi.pendentes} pendentes)`,
    percentage: convidadosKpi.pctConfirmados || 0,
    primary: `${convidadosKpi.confirmados} confirmados — ${convidadosKpi.pctConfirmados}%`,
    secondary: `Total: ${totalGuests}`,
    bands,
    legend: bands.length
      ? bands.map((band) => `${band.label.slice(0, 12)}: ${Math.round((band.value / 100) * totalGuests)}`).join(' • ')
      : 'Sem distribuição registrada',
  };

  return { tarefas, fornecedores, convidados };
}

function readStoredId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeId(id: string | null): void {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function createEventosController(options: EventosControllerOptions): EventosController {
  const { projectData, ac, bus, miniApps = {}, store = projectData.raw?.() ?? null } = options;

  const syncClient = createSyncClient({
    baseUrl: (import.meta.env.VITE_SYNC_API_URL as string | undefined) ?? '',
    apiPath: (import.meta.env.VITE_SYNC_API_PATH as string | undefined) ?? '/api',
    graphqlPath: (import.meta.env.VITE_SYNC_GRAPHQL_PATH as string | undefined) ?? '/graphql',
  });

  const baseProject = ac.model.ensureShape({}) as ProjectPayload;

  const state = writable<EventosState>({
    metas: [],
    currentId: null,
    project: clonePayload(baseProject),
    dirty: false,
    saving: false,
    usingFallback: false,
    loading: true,
  });

  const form = writable<ProjectPayload>(clonePayload(baseProject));
  const dateTime = writable('');

  const indicators = derived(form, ($form) => formatIndicators(ac, $form));
  const badges = derived(form, ($form) => formatBadgeRows(ac, $form));
  const chips = derived(state, ($state) => ({
    ready: !$state.dirty && !$state.saving,
    dirty: $state.dirty,
    saving: $state.saving,
  }));
  const syncStatus = derived(syncClient.status, ($status) => ensureSyncStatus($status));

  const mountedHosts = new Map<string, HTMLElement>();
  const mountedApps = new Map<string, any>();
  const cleanups: (() => void)[] = [];
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  function markDirty(): void {
    state.update((current) => ({ ...current, dirty: true }));
  }

  function setForm(next: ProjectPayload): void {
    const shaped = ac.model.ensureShape(clonePayload(next));
    form.set(shaped);
    state.update((current) => ({ ...current, project: clonePayload(shaped) }));
    const ev = shaped.evento || {};
    const when = ev.data ? `${ev.data}T${(ev.hora || '').slice(0, 5)}` : '';
    dateTime.set(when);
  }

  async function refreshMetas(): Promise<void> {
    const list = await projectData.listProjects();
    state.update((current) => ({ ...current, metas: list }));
  }

  async function loadProject(id: string | null): Promise<void> {
    if (!id) {
      await projectData.selectProject(null);
      setForm({});
      state.update((current) => ({ ...current, currentId: null, dirty: false, saving: false }));
      storeId(null);
      return;
    }
    const payload = await projectData.selectProject(id);
    setForm(payload || {});
    state.update((current) => ({ ...current, currentId: id, dirty: false, saving: false }));
    storeId(id);
  }

  function scheduleSave(): void {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveCurrent, 700);
  }

  async function saveCurrent(): Promise<void> {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    const currentId = get(state).currentId;
    if (!currentId) return;
    const payload = ac.model.ensureShape(clonePayload(get(form)));
    const event = payload.evento || {};
    if (!event.data && !event.hora) {
      // noop
    }
    payload.updatedAt = Date.now();
    state.update((current) => ({ ...current, saving: true }));
    try {
      const updated = await projectData.updateProject(currentId, payload);
      setForm(updated);
      state.update((current) => ({ ...current, dirty: false, saving: false }));
      bus?.publish?.('ac:project-updated', { id: currentId, updatedAt: payload.updatedAt });
      refreshFornecedores();
    } catch (error) {
      console.warn('[eventos] Falha ao salvar projeto', error);
      setForm(payload);
      state.update((current) => ({ ...current, dirty: false, saving: false }));
    }
  }

  function setValue(path: string, value: string): void {
    form.update((current) => {
      const next = clonePayload(current);
      setPath(next, path, value);
      ac.model.ensureShape(next);
      return next;
    });
    markDirty();
    scheduleSave();
  }

  function setDateTime(value: string): void {
    dateTime.set(value);
    form.update((current) => {
      const next = clonePayload(current);
      next.evento ||= {};
      if (!value) {
        next.evento.data = '';
        next.evento.hora = '';
      } else {
        const [date, time] = value.split('T');
        next.evento.data = date || '';
        next.evento.hora = (time || '').slice(0, 5);
      }
      ac.model.ensureShape(next);
      return next;
    });
    markDirty();
    scheduleSave();
  }

  function getValue(path: string): string {
    return String(safeGet(get(form), path, '') ?? '');
  }

  function maskCep(value: string): string {
    return ac?.cep?.maskCep ? ac.cep.maskCep(value) : value;
  }

  async function fillCep(prefix: string, value: string): Promise<void> {
    if (!ac?.cep?.fetchCep) return;
    const lookup = await ac.cep.fetchCep(value);
    if (!lookup) return;
    form.update((current) => {
      const next = clonePayload(current);
      const fields: Record<string, string> = {
        [`${prefix}.logradouro`]: lookup.logradouro || '',
        [`${prefix}.bairro`]: lookup.bairro || '',
        [`${prefix}.cidade`]: lookup.cidade || '',
        [`${prefix}.uf`]: lookup.uf || '',
      };
      Object.entries(fields).forEach(([path, val]) => setPath(next, path, val));
      ac.model.ensureShape(next);
      return next;
    });
    markDirty();
    scheduleSave();
  }

  async function select(id: string | null): Promise<void> {
    state.update((current) => ({ ...current, loading: true }));
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    await loadProject(id);
    refreshFornecedores();
    state.update((current) => ({ ...current, loading: false }));
  }

  async function init(): Promise<void> {
    await projectData.init();
    const metas = await projectData.listProjects();
    const fallbackUnsub = projectData.usingFallback.subscribe((flag) => {
      state.update((current) => ({ ...current, usingFallback: flag }));
    });
    const metasUnsub = projectData.metas.subscribe((list) => {
      state.update((current) => ({ ...current, metas: list }));
    });
    cleanups.push(fallbackUnsub, metasUnsub);
    state.update((current) => ({ ...current, metas, usingFallback: get(projectData.usingFallback) ?? false }));
    if (!metas.length) {
      setForm({});
      state.update((current) => ({ ...current, loading: false }));
      return;
    }
    const stored = readStoredId();
    const firstId = stored && metas.some((meta) => meta.id === stored) ? stored : metas[0].id;
    await select(firstId);
    state.update((current) => ({ ...current, loading: false }));
    if (bus?.subscribe) {
      const off = bus.subscribe('ac:project-updated', async ({ id }: { id: string }) => {
        if (!id) return;
        await refreshMetas();
        if (id === get(state).currentId) {
          await loadProject(id);
        }
      });
      if (typeof off === 'function') cleanups.push(off);
    }
  }

  function destroy(): void {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    cleanups.splice(0).forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    mountedApps.clear();
    mountedHosts.clear();
  }

  async function createNew(): Promise<void> {
    const record = await projectData.createProject({});
    await refreshMetas();
    await select(record.meta.id);
  }

  async function deleteCurrent(): Promise<void> {
    const currentId = get(state).currentId;
    if (!currentId) return;
    await projectData.deleteProject(currentId);
    await refreshMetas();
    const list = get(state).metas;
    const next = list[0]?.id ?? null;
    await select(next);
  }

  function mountMiniApp(kind: 'tarefas' | 'fornecedores' | 'convidados' | 'mensagens', host: HTMLElement | null): void {
    if (!host) return;
    const currentId = get(state).currentId;
    const deps = { ac, store, bus, getCurrentId: () => get(state).currentId };
    if (mountedHosts.get(kind) === host && mountedApps.get(kind)) {
      return;
    }
    mountedHosts.set(kind, host);
    if (kind === 'tarefas' && miniApps.tarefas?.mountTasksMiniApp) {
      mountedApps.set(kind, miniApps.tarefas.mountTasksMiniApp(host, deps));
    }
    if (kind === 'fornecedores' && miniApps.fornecedores?.mountFornecedoresMiniApp) {
      const container = document.createElement('div');
      host.appendChild(container);
      mountedApps.set(kind, miniApps.fornecedores.mountFornecedoresMiniApp(container, deps));
    }
    if (kind === 'convidados' && miniApps.convidados?.mountConvidadosMiniApp) {
      mountedApps.set(kind, miniApps.convidados.mountConvidadosMiniApp(host, deps));
    }
    if (kind === 'mensagens' && miniApps.mensagens?.mountMensagensMiniApp) {
      mountedApps.set(kind, miniApps.mensagens.mountMensagensMiniApp(host, deps));
    }
    if (currentId) {
      refreshFornecedores();
    }
  }

  function refreshFornecedores(): void {
    const app = mountedApps.get('fornecedores');
    try {
      app?.refresh?.();
    } catch {}
  }

  return {
    state: { subscribe: state.subscribe },
    form: { subscribe: form.subscribe },
    dateTime: { subscribe: dateTime.subscribe },
    indicators,
    badges,
    chips,
    syncStatus,
    syncClient,
    init,
    destroy,
    select,
    createNew,
    deleteCurrent,
    setValue,
    getValue,
    setDateTime,
    maskCep,
    fillCep,
    mountMiniApp,
    refreshFornecedores,
  };
}
