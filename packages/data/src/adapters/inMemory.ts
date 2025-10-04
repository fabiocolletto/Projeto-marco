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

const now = () => Date.now();

const sortMetas = (metas: ProjectMeta[]): ProjectMeta[] =>
  [...metas].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

const toMeta = (payload: ProjectPayload): ProjectMeta => ({
  id: payload.id,
  nome: (payload.evento?.nome as string) || 'Sem nome',
  updatedAt: payload.updatedAt ?? now(),
});

export const createInMemoryAdapter = (): ProjectStore => {
  let metas: ProjectMeta[] = [];
  const map: Record<string, ProjectPayload> = {};

  return {
    async init(): Promise<ProjectMeta[]> {
      metas = sortMetas(metas);
      return [...metas];
    },

    listProjects(): ProjectMeta[] {
      return sortMetas(metas);
    },

    async createProject(data?: ProjectDraft): Promise<ProjectRecord> {
      const draft: ProjectDraft = data ? deepClone(data) : {};
      const payload = ensureProjectShape(draft as Partial<ProjectPayload>);
      payload.updatedAt = typeof draft.updatedAt === 'number' ? draft.updatedAt : now();
      map[payload.id] = payload;
      metas = sortMetas([...metas.filter((meta) => meta.id !== payload.id), toMeta(payload)]);
      return { meta: toMeta(payload), payload: deepClone(payload) };
    },

    async getProject(id: string): Promise<ProjectPayload | null> {
      const payload = map[id];
      if (!payload) return null;
      const shaped = ensureProjectShape(payload);
      map[id] = shaped;
      return deepClone(shaped);
    },

    async updateProject(id: string, partial: Partial<ProjectPayload>): Promise<ProjectPayload> {
      const current = map[id];
      if (!current) throw new Error('Projeto não encontrado');
      const next = ensureProjectShape({ ...current, ...deepClone(partial), id });
      next.updatedAt = typeof partial.updatedAt === 'number' ? (partial.updatedAt as number) : now();
      map[id] = next;
      metas = sortMetas(metas.map((meta) => (meta.id === id ? toMeta(next) : meta)));
      return deepClone(next);
    },

    async deleteProject(id: string): Promise<void> {
      delete map[id];
      metas = metas.filter((meta) => meta.id !== id);
      metas = sortMetas(metas);
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
      return true;
    },

    async wipeAll(): Promise<void> {
      metas = [];
      for (const key of Object.keys(map)) {
        delete map[key];
      }
    },

    async backupAll(): Promise<string> {
      const ordered = sortMetas(metas);
      const items = ordered
        .map((meta) => map[meta.id])
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
      return sortMetas(metas);
    },

    async close(): Promise<void> {
      // noop
    },

    ensurePersistence: async () => ({ supported: false, persisted: false }),
  };
};

export default createInMemoryAdapter;
