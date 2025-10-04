import Dexie, { type Table } from 'dexie';

export const DB_NAME = 'marco_db';
export const DB_VERSION = 2;
export const STORE_NAME = 'kv';
export const INDEX_KEY = 'ac:index:v1';
export const SCHEMA_VERSION = 2;

export type JsonMap = Record<string, unknown>;

export interface ProjectCerimonialista extends JsonMap {
  nomeCompleto: string;
  telefone: string;
  redeSocial: string;
}

export interface ProjectEvent extends JsonMap {
  nome: string;
  data: string;
  hora: string;
  local: string;
  endereco: JsonMap;
  anfitriao: JsonMap;
}

export interface ProjectMeta {
  id: string;
  nome: string;
  updatedAt: number;
}

export interface ProjectPayload extends JsonMap {
  id: string;
  schemaVersion: number;
  cerimonialista: ProjectCerimonialista;
  evento: ProjectEvent;
  lista: unknown[];
  tipos: unknown[];
  modelos: JsonMap;
  vars: JsonMap;
  updatedAt: number;
}

export interface ProjectRecord {
  meta: ProjectMeta;
  payload: ProjectPayload;
}

export type ProjectDraft = Partial<Omit<ProjectPayload, 'id' | 'schemaVersion' | 'updatedAt'>> & {
  updatedAt?: number;
};

export type ProjectUpdate = Partial<ProjectPayload>;

export interface ProjectBackup {
  version: number;
  exportedAt: number;
  items: ProjectPayload[];
}

export interface PersistenceResult {
  supported: boolean;
  persisted: boolean;
}

export interface ProjectStore {
  init(): Promise<ProjectMeta[]>;
  listProjects(): ProjectMeta[];
  createProject(data?: ProjectDraft): Promise<ProjectRecord>;
  getProject(id: string): Promise<ProjectPayload | null>;
  updateProject(id: string, partial: ProjectUpdate): Promise<ProjectPayload>;
  deleteProject(id: string): Promise<void>;
  exportProject(id: string): Promise<string>;
  importProject(input: string | ProjectPayload): Promise<ProjectRecord>;
  ping(): Promise<boolean>;
  wipeAll(): Promise<void>;
  backupAll(): Promise<string>;
  restoreBackup(input: string | ProjectBackup): Promise<ProjectMeta[]>;
  close(): Promise<void>;
  ensurePersistence?(): Promise<PersistenceResult>;
}

const KEY = (id: string) => `ac:project:${id}:v1`;

const now = () => Date.now();

const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${now()}-${Math.random().toString(16).slice(2)}`;
};

export const deepClone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

export const ensureProjectShape = (input?: Partial<ProjectPayload> | null): ProjectPayload => {
  const base: Record<string, unknown> = input ? deepClone(input) : {};
  const project: ProjectPayload = {
    ...(base as ProjectPayload),
    id: typeof base.id === 'string' && base.id ? (base.id as string) : randomId(),
    schemaVersion: SCHEMA_VERSION,
    cerimonialista: {
      nomeCompleto: '',
      telefone: '',
      redeSocial: '',
      ...(typeof base.cerimonialista === 'object' && base.cerimonialista
        ? (base.cerimonialista as JsonMap)
        : {}),
    } as ProjectCerimonialista,
    evento: {
      nome: '',
      data: '',
      hora: '',
      local: '',
      endereco: {},
      anfitriao: {},
      ...(typeof base.evento === 'object' && base.evento ? (base.evento as JsonMap) : {}),
    } as ProjectEvent,
    lista: Array.isArray(base.lista) ? (base.lista as unknown[]) : [],
    tipos: Array.isArray(base.tipos) ? (base.tipos as unknown[]) : [],
    modelos:
      typeof base.modelos === 'object' && base.modelos ? { ...(base.modelos as JsonMap) } : {},
    vars: typeof base.vars === 'object' && base.vars ? { ...(base.vars as JsonMap) } : {},
    updatedAt: typeof base.updatedAt === 'number' ? (base.updatedAt as number) : now(),
  };

  if (typeof project.evento.endereco !== 'object' || project.evento.endereco === null) {
    project.evento.endereco = {};
  }
  if (typeof project.evento.anfitriao !== 'object' || project.evento.anfitriao === null) {
    project.evento.anfitriao = {};
  }

  return project;
};

const toMeta = (payload: ProjectPayload): ProjectMeta => ({
  id: payload.id,
  nome: (payload.evento?.nome as string) || 'Sem nome',
  updatedAt: payload.updatedAt ?? now(),
});

const sortMetas = (metas: ProjectMeta[]): ProjectMeta[] =>
  [...metas].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

const isIndexedDBAvailable = () => typeof indexedDB !== 'undefined';

export const ensurePersistence = async (): Promise<PersistenceResult> => {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) {
    return { supported: false, persisted: false };
  }
  try {
    const already = await navigator.storage.persisted();
    if (already) {
      return { supported: true, persisted: true };
    }
    const persisted = await navigator.storage.persist();
    return { supported: true, persisted: Boolean(persisted) };
  } catch (error) {
    console.warn('[projectStore] Falha ao solicitar persistência', error);
    return { supported: true, persisted: false };
  }
};

class ProjectDatabase extends Dexie {
  public kv!: Table<unknown, string>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      [STORE_NAME]: '',
    });
  }
}

export const createProjectStore = (): ProjectStore => {
  let db: ProjectDatabase | null = null;
  let indexCache: ProjectMeta[] = [];

  const openDB = async (): Promise<ProjectDatabase> => {
    if (db) {
      return db;
    }
    if (!isIndexedDBAvailable()) {
      throw new Error('IndexedDB indisponível neste ambiente');
    }

    const database = new ProjectDatabase();
    database.on('versionchange', () => {
      console.warn('[projectStore] versão do banco mudou; fechando conexão.');
      try {
        database.close();
      } catch (err) {
        console.warn('[projectStore] Falha ao fechar banco', err);
      }
      db = null;
      if (typeof alert === 'function') {
        try {
          alert('Uma nova versão dos dados está disponível. Recarregue a página.');
        } catch {
          /* noop */
        }
      }
    });

    await database.open();
    db = database;
    return database;
  };

  const withTable = async <T>(cb: (table: Table<unknown, string>) => Promise<T>): Promise<T> => {
    const database = await openDB();
    return cb(database.kv);
  };

  const kvGet = async <T>(key: string): Promise<T | undefined> =>
    withTable((table) => table.get(key) as Promise<T | undefined>);

  const kvSet = async <T>(key: string, value: T): Promise<void> =>
    withTable((table) => table.put(value, key) as Promise<void>);

  const kvDel = async (key: string): Promise<void> =>
    withTable((table) => table.delete(key));

  const syncIndex = async (metas: ProjectMeta[]): Promise<void> => {
    indexCache = sortMetas(metas);
    await kvSet(INDEX_KEY, indexCache);
  };

  return {
    async init(): Promise<ProjectMeta[]> {
      await openDB();
      try {
        await ensurePersistence();
      } catch (error) {
        console.warn('[projectStore] Persistência não garantida', error);
      }
      const stored = (await kvGet<ProjectMeta[]>(INDEX_KEY)) || [];
      indexCache = sortMetas(Array.isArray(stored) ? stored : []);
      return [...indexCache];
    },

    listProjects(): ProjectMeta[] {
      return [...indexCache];
    },

    async createProject(data?: ProjectDraft): Promise<ProjectRecord> {
      const draft: ProjectDraft = data ? deepClone(data) : {};
      const payload = ensureProjectShape({ ...(draft as Partial<ProjectPayload>), id: randomId() });
      payload.updatedAt = typeof draft.updatedAt === 'number' ? draft.updatedAt : now();
      await kvSet(KEY(payload.id), payload);

      const meta = toMeta(payload);
      const nextIndex = indexCache.filter((item) => item.id !== meta.id);
      nextIndex.push(meta);
      await syncIndex(nextIndex);

      return { meta, payload: deepClone(payload) };
    },

    async getProject(id: string): Promise<ProjectPayload | null> {
      const raw = await kvGet<ProjectPayload>(KEY(id));
      if (!raw) {
        return null;
      }
      const shaped = ensureProjectShape(raw);
      if (JSON.stringify(shaped) !== JSON.stringify(raw)) {
        await kvSet(KEY(id), shaped);
      }
      return deepClone(shaped);
    },

    async updateProject(id: string, partial: ProjectUpdate): Promise<ProjectPayload> {
      const current = await kvGet<ProjectPayload>(KEY(id));
      if (!current) {
        throw new Error('Projeto não encontrado');
      }
      const next = ensureProjectShape({ ...current, ...deepClone(partial), id });
      next.updatedAt = partial.updatedAt ?? now();
      await kvSet(KEY(id), next);

      const meta = toMeta(next);
      const nextIndex = indexCache.map((item) => (item.id === id ? meta : item));
      await syncIndex(nextIndex);

      return deepClone(next);
    },

    async deleteProject(id: string): Promise<void> {
      await kvDel(KEY(id));
      const nextIndex = indexCache.filter((item) => item.id !== id);
      await syncIndex(nextIndex);
    },

    async exportProject(id: string): Promise<string> {
      const project = await this.getProject(id);
      if (!project) {
        throw new Error('Projeto não encontrado');
      }
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
        cerimonialista: cerimonialista as JsonMap,
        evento: evento as JsonMap,
        lista: Array.isArray(lista) ? (lista as unknown[]) : [],
        tipos: Array.isArray(tipos) ? (tipos as unknown[]) : [],
        modelos: (modelos || {}) as JsonMap,
        vars: (vars || {}) as JsonMap,
        fornecedores,
        convidados,
        checklist,
      } as ProjectDraft);
    },

    async ping(): Promise<boolean> {
      const probeKey = `__ping__:${randomId()}`;
      await kvSet(probeKey, { t: now() });
      const got = await kvGet(probeKey);
      await kvDel(probeKey);
      return Boolean(got);
    },

    async wipeAll(): Promise<void> {
      for (const meta of indexCache) {
        await kvDel(KEY(meta.id));
      }
      indexCache = [];
      await kvSet(INDEX_KEY, indexCache);
    },

    async backupAll(): Promise<string> {
      const metas = sortMetas(indexCache);
      const items: ProjectPayload[] = [];
      for (const meta of metas) {
        const project = await kvGet<ProjectPayload>(KEY(meta.id));
        if (project) {
          items.push(project);
        }
      }
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
        } = item || {};
        await this.createProject({
          cerimonialista: cerimonialista as JsonMap,
          evento: evento as JsonMap,
          lista: Array.isArray(lista) ? (lista as unknown[]) : [],
          tipos: Array.isArray(tipos) ? (tipos as unknown[]) : [],
          modelos: (modelos || {}) as JsonMap,
          vars: (vars || {}) as JsonMap,
          fornecedores,
          convidados,
          checklist,
        } as ProjectDraft);
      }
      return this.listProjects();
    },

    async close(): Promise<void> {
      if (db) {
        try {
          db.close();
        } finally {
          db = null;
        }
      }
    },

    ensurePersistence,
  };
};

export default createProjectStore;
