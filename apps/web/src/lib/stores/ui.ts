import { writable } from 'svelte/store';

export type PanelId =
  | 'overview'
  | 'evento'
  | 'anfitriao'
  | 'cerimonial'
  | 'tarefas'
  | 'fornecedores'
  | 'convidados'
  | 'mensagens'
  | 'sync';

export interface PanelDefinition {
  id: PanelId;
  label: string;
  description: string;
  icon?: string;
}

export const panelDefinitions: PanelDefinition[] = [
  { id: 'overview', label: 'Visão geral', description: 'Resumo e indicadores', icon: '📊' },
  { id: 'evento', label: 'Evento', description: 'Detalhes principais', icon: '🎉' },
  { id: 'anfitriao', label: 'Anfitrião', description: 'Informações de contato', icon: '🤝' },
  { id: 'cerimonial', label: 'Cerimonial', description: 'Equipe de apoio', icon: '📝' },
  { id: 'tarefas', label: 'Tarefas', description: 'Checklist colaborativo', icon: '✅' },
  { id: 'fornecedores', label: 'Fornecedores', description: 'Contratos e pagamentos', icon: '🏷️' },
  { id: 'convidados', label: 'Convidados', description: 'Listas e convites', icon: '💌' },
  { id: 'mensagens', label: 'Mensagens', description: 'Comunicação centralizada', icon: '💬' },
  { id: 'sync', label: 'Sincronização', description: 'Backups e integrações', icon: '☁️' },
];

const createPanelStore = () => {
  const { subscribe, set, update } = writable<PanelId>('overview');

  return {
    subscribe,
    open(panel: PanelId) {
      update((current) => (current === panel ? 'overview' : panel));
    },
    set(panel: PanelId) {
      set(panel);
    },
    reset() {
      set('overview');
    },
  };
};

const panelStore = createPanelStore();

export const activePanel = { subscribe: panelStore.subscribe };
export const openPanel = (panel: PanelId) => panelStore.open(panel);
export const setPanel = (panel: PanelId) => panelStore.set(panel);
export const closePanel = () => panelStore.reset();

interface OnboardingState {
  open: boolean;
  step: number;
}

const onboardingStore = writable<OnboardingState>({ open: false, step: 0 });

export const onboardingState = {
  subscribe: onboardingStore.subscribe,
};

export function openOnboarding(step = 0): void {
  onboardingStore.set({ open: true, step });
}

export function closeOnboarding(): void {
  onboardingStore.set({ open: false, step: 0 });
}
