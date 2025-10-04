import { get, writable, type Readable } from 'svelte/store';
import {
  createProjectStore,
  type PersistenceResult,
  type ProjectDraft,
  type ProjectMeta,
  type ProjectPayload,
  type ProjectRecord,
  type ProjectStore,
} from '@ac/data/projectStore';
import { createLocalStorageAdapter } from '@ac/data/adapters/localStorage';
import { createInMemoryAdapter } from '@ac/data/adapters/inMemory';

const metas = writable<ProjectMeta[]>([]);
const currentProject = writable<ProjectPayload | null>(null);
const currentId = writable<string | null>(null);
const usingFallback = writable(false);

let store: ProjectStore | null = null;
let initializing: Promise<void> | null = null;

const factories = [createProjectStore, createLocalStorageAdapter, createInMemoryAdapter];

async function prepareStore(): Promise<ProjectStore> {
  if (store) {
    return store;
  }
  if (initializing) {
    await initializing;
    if (!store) {
      throw new Error('Store de projetos indisponível');
    }
    return store;
  }

  initializing = (async () => {
    let lastError: unknown;
    for (let i = 0; i < factories.length; i += 1) {
      const factory = factories[i];
      const candidate = factory();
      try {
        const list = await candidate.init();
        store = candidate;
        usingFallback.set(i > 0);
        metas.set(list);
        return;
      } catch (error) {
        lastError = error;
        try {
          await candidate.close();
        } catch (closeError) {
          console.warn('[projectData] Falha ao encerrar adapter após erro de inicialização', closeError);
        }
      }
    }
    throw lastError || new Error('Falha ao inicializar store de projetos');
  })();

  try {
    await initializing;
  } finally {
    initializing = null;
  }

  if (!store) {
    throw new Error('Store de projetos indisponível');
  }

  return store;
}

async function ensureStore(): Promise<ProjectStore> {
  return prepareStore();
}

function exposeGlobal(api: ProjectDataApi) {
  if (typeof window === 'undefined') return;
  const global = window as typeof window & { __marcoData?: Record<string, unknown> };
  global.__marcoData = { ...(global.__marcoData || {}), projectData: api };
}

async function selectProject(id: string | null): Promise<ProjectPayload | null> {
  const ready = await ensureStore();
  currentId.set(id);
  if (!id) {
    currentProject.set(null);
    return null;
  }
  const payload = await ready.getProject(id);
  currentProject.set(payload);
  return payload;
}

async function createProject(data?: ProjectDraft): Promise<ProjectRecord> {
  const ready = await ensureStore();
  const record = await ready.createProject(data);
  metas.set(ready.listProjects());
  currentId.set(record.meta.id);
  currentProject.set(record.payload);
  return record;
}

async function updateProject(id: string, partial: Partial<ProjectPayload>): Promise<ProjectPayload> {
  const ready = await ensureStore();
  const updated = await ready.updateProject(id, partial);
  metas.set(ready.listProjects());
  if (get(currentId) === id) {
    currentProject.set(updated);
  }
  return updated;
}

async function deleteProject(id: string): Promise<void> {
  const ready = await ensureStore();
  await ready.deleteProject(id);
  metas.set(ready.listProjects());
  if (get(currentId) === id) {
    currentId.set(null);
    currentProject.set(null);
  }
}

async function importProject(input: string | ProjectPayload): Promise<ProjectRecord> {
  const ready = await ensureStore();
  const record = await ready.importProject(input);
  metas.set(ready.listProjects());
  currentId.set(record.meta.id);
  currentProject.set(record.payload);
  return record;
}

async function restoreBackup(input: string | { items: ProjectPayload[] }): Promise<ProjectMeta[]> {
  const ready = await ensureStore();
  const list = await ready.restoreBackup(input as any);
  metas.set(ready.listProjects());
  return list;
}

export interface ProjectDataApi {
  metas: Readable<ProjectMeta[]>;
  currentProject: Readable<ProjectPayload | null>;
  currentId: Readable<string | null>;
  usingFallback: Readable<boolean>;
  init(): Promise<void>;
  selectProject(id: string | null): Promise<ProjectPayload | null>;
  createProject(data?: ProjectDraft): Promise<ProjectRecord>;
  updateProject(id: string, partial: Partial<ProjectPayload>): Promise<ProjectPayload>;
  deleteProject(id: string): Promise<void>;
  importProject(input: string | ProjectPayload): Promise<ProjectRecord>;
  exportProject(id: string): Promise<string>;
  listProjects(): Promise<ProjectMeta[]>;
  backupAll(): Promise<string>;
  restoreBackup(input: string | { items: ProjectPayload[] }): Promise<ProjectMeta[]>;
  ping(): Promise<boolean>;
  wipeAll(): Promise<void>;
  ensurePersistence(): Promise<PersistenceResult | undefined>;
  raw(): ProjectStore | null;
}

export const projectData: ProjectDataApi = {
  metas,
  currentProject,
  currentId,
  usingFallback,
  async init(): Promise<void> {
    await ensureStore();
    exposeGlobal(projectData);
  },
  selectProject,
  createProject,
  updateProject,
  deleteProject,
  importProject,
  async exportProject(id: string): Promise<string> {
    const ready = await ensureStore();
    return ready.exportProject(id);
  },
  async listProjects(): Promise<ProjectMeta[]> {
    await ensureStore();
    return get(metas);
  },
  async backupAll(): Promise<string> {
    const ready = await ensureStore();
    return ready.backupAll();
  },
  restoreBackup,
  async ping(): Promise<boolean> {
    const ready = await ensureStore();
    return ready.ping();
  },
  async wipeAll(): Promise<void> {
    const ready = await ensureStore();
    await ready.wipeAll();
    metas.set([]);
    currentId.set(null);
    currentProject.set(null);
  },
  async ensurePersistence(): Promise<PersistenceResult | undefined> {
    const ready = await ensureStore();
    return ready.ensurePersistence ? ready.ensurePersistence() : undefined;
  },
  raw(): ProjectStore | null {
    return store;
  },
};

export default projectData;
