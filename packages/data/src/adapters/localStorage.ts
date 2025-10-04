import {
  SCHEMA_VERSION,
  ensureProjectShape,
  deepClone,
  type ProjectBackup,
  type ProjectDraft,
  type ProjectMeta,
  type ProjectPayload,
  type ProjectRecord,
  type ProjectStore,
} from '../projectStore';

const STORAGE_KEY = 'ac:memstore:v1';
const now = () => Date.now();

interface PersistedState {
  metas: ProjectMeta[];
  map: Record<string, ProjectPayload>;
}

interface LocalStorageAdapterOptions {
  key?: string;
  storage?: Storage;
}

const getStorage = (custom?: Storage): Storage | undefined => {
  if (custom) return custom;
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    /* noop */
  }
  return undefined;
};

const sortMetas = (metas: ProjectMeta[]): ProjectMeta[] =>
  [...metas].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

const toMeta = (payload: ProjectPayload): ProjectMeta => ({
  id: payload.id,
  nome: (payload.evento?.nome as string) || 'Sem nome',
  updatedAt: payload.updatedAt ?? now(),
});

const defaultState = (): PersistedState => ({ metas: [], map: {} });

export const createLocalStorageAdapter = (
  options: LocalStorageAdapterOptions = {},
): ProjectStore => {
  const storage = getStorage(options.storage);
  const key = options.key || STORAGE_KEY;
  let state: PersistedState = defaultState();

  const safeGet = (): PersistedState => {
    if (!storage) return state;
    try {
      const raw = storage.getItem(key);
      if (!raw) return state;
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed && typeof parsed === 'object') {
        const metas = Array.isArray(parsed.metas) ? (parsed.metas as ProjectMeta[]) : [];
        const map = parsed.map && typeof parsed.map === 'object' ? (parsed.map as Record<string, ProjectPayload>) : {};
        state = { metas: sortMetas(metas), map: { ...map } };
      }
    } catch (error) {
      console.warn('[localStorageAdapter] Falha ao carregar estado', error);
    }
    return state;
  };

  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn('[localStorageAdapter] Falha ao persistir estado', error);
    }
  };

  const load = () => {
    state = safeGet();
  };

  const list = (): ProjectMeta[] => sortMetas(state.metas || []);

  return {
    async init(): Promise<ProjectMeta[]> {
      load();
      return list();
    },

    listProjects(): ProjectMeta[] {
      return list();
    },

    async createProject(data?: ProjectDraft): Promise<ProjectRecord> {
      const draft: ProjectDraft = data ? deepClone(data) : {};
      const payload = ensureProjectShape(draft as Partial<ProjectPayload>);
      payload.updatedAt = typeof draft.updatedAt === 'number' ? draft.updatedAt : now();
      state.map[payload.id] = payload;
      state.metas = list().filter((meta) => meta.id !== payload.id);
      const meta = toMeta(payload);
      state.metas.push(meta);
      state.metas = list();
      persist();
      return { meta, payload: deepClone(payload) };
    },

    async getProject(id: string): Promise<ProjectPayload | null> {
      const payload = state.map[id];
      if (!payload) return null;
      const shaped = ensureProjectShape(payload);
      state.map[id] = shaped;
      persist();
      return deepClone(shaped);
    },

    async updateProject(id: string, partial: Partial<ProjectPayload>): Promise<ProjectPayload> {
      const current = state.map[id];
      if (!current) throw new Error('Projeto não encontrado');
      const next = ensureProjectShape({ ...current, ...deepClone(partial), id });
      next.updatedAt = typeof partial.updatedAt === 'number' ? (partial.updatedAt as number) : now();
      state.map[id] = next;
      state.metas = list().map((meta) => (meta.id === id ? toMeta(next) : meta));
      persist();
      return deepClone(next);
    },

    async deleteProject(id: string): Promise<void> {
      delete state.map[id];
      state.metas = list().filter((meta) => meta.id !== id);
      persist();
    },

    async exportProject(id: string): Promise<string> {
      const project = await this.getProject(id);
      if (!project) throw new Error('Projeto não encontrado');
      return JSON.stringify(project, null, 2);
    },

    async importProject(input: string | ProjectPayload): Promise<ProjectRecord> {
      const data = typeof input === 'string' ? JSON.parse(input) : input;
      const {
        cerimonialista,
        evento,
        lista,
        tipos,
        modelos,
        vars,
        fornecedores,
        convidados,
        checklist,
      } = data || {};
      return this.createProject({
        cerimonialista: cerimonialista as Record<string, unknown>,
        evento: evento as Record<string, unknown>,
        lista: Array.isArray(lista) ? (lista as unknown[]) : [],
        tipos: Array.isArray(tipos) ? (tipos as unknown[]) : [],
        modelos: (modelos || {}) as Record<string, unknown>,
        vars: (vars || {}) as Record<string, unknown>,
        fornecedores,
        convidados,
        checklist,
      } as ProjectDraft);
    },

    async ping(): Promise<boolean> {
      if (!storage) return true;
      try {
        const probe = `__ping__:${Math.random().toString(36).slice(2)}`;
        storage.setItem(probe, '1');
        storage.removeItem(probe);
        return true;
      } catch {
        return false;
      }
    },

    async wipeAll(): Promise<void> {
      state = defaultState();
      persist();
    },

    async backupAll(): Promise<string> {
      const metas = list();
      const items = metas
        .map((meta) => state.map[meta.id])
        .filter((payload): payload is ProjectPayload => Boolean(payload));
      const backup: ProjectBackup = {
        version: SCHEMA_VERSION,
        exportedAt: now(),
        items,
      };
      return JSON.stringify(backup, null, 2);
    },

    async restoreBackup(input: string | ProjectBackup): Promise<ProjectMeta[]> {
      const data = typeof input === 'string' ? JSON.parse(input) : input;
      if (!data || !Array.isArray(data.items)) {
        throw new Error('Backup inválido');
      }
      for (const item of data.items) {
        await this.createProject(item as ProjectDraft);
      }
      return list();
    },

    async close(): Promise<void> {
      // noop
    },

    ensurePersistence: async () => ({ supported: Boolean(storage), persisted: Boolean(storage) }),
  };
};

export default createLocalStorageAdapter;
