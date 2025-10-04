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

export const manifestList: AppManifestEntry[] = [
  {
    id: 'overview',
    label: 'Visão geral',
    icon: '📊',
    loader: './verticals/overview.svelte',
    requires: ['projectData']
  },
  {
    id: 'evento',
    label: 'Evento',
    icon: '🎉',
    loader: './verticals/placeholder.svelte',
    requires: ['projectData']
  },
  {
    id: 'anfitriao',
    label: 'Anfitrião',
    icon: '🤝',
    loader: './verticals/placeholder.svelte',
    requires: ['projectData']
  },
  {
    id: 'cerimonial',
    label: 'Cerimonial',
    icon: '📝',
    loader: './verticals/placeholder.svelte',
    requires: ['projectData']
  },
  {
    id: 'tarefas',
    label: 'Tarefas',
    icon: '✅',
    loader: '@marco/features-tarefas',
    requires: ['projectData', 'bus', 'ac']
  },
  {
    id: 'fornecedores',
    label: 'Fornecedores',
    icon: '🏷️',
    loader: '@marco/features-fornecedores',
    requires: ['projectData', 'bus', 'ac']
  },
  {
    id: 'convidados',
    label: 'Convidados',
    icon: '💌',
    loader: '@marco/features-convites',
    requires: ['projectData', 'bus', 'ac']
  },
  {
    id: 'mensagens',
    label: 'Mensagens',
    icon: '💬',
    loader: '@marco/features-mensagens',
    requires: ['projectData', 'bus', 'ac']
  },
  {
    id: 'sync',
    label: 'Sincronização',
    icon: '☁️',
    loader: './verticals/sync.svelte',
    requires: ['projectData']
  }
];

export const manifest: AppManifest = manifestList.reduce<AppManifest>((map, entry) => {
  map[entry.id] = entry;
  return map;
}, {} as AppManifest);

export default manifest;
