export type AppId =
  | 'overview'
  | 'evento'
  | 'anfitriao'
  | 'cerimonial'
  | 'tarefas'
  | 'fornecedores'
  | 'convidados'
  | 'mensagens'
  | 'sync';

export type AppDependency = 'projectData' | 'bus' | 'ac';

export interface AppManifestEntry {
  id: AppId;
  label: string;
  icon: string;
  loader: string;
  requires: AppDependency[];
}

export type AppManifest = Record<AppId, AppManifestEntry>;

export type AppManifestOverrides = Partial<Record<AppId, Partial<AppManifestEntry>>>;
