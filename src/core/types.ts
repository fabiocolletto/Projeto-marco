export type Locale = 'pt-BR' | 'es-419' | 'en-US';

export type ThemePreference = 'light' | 'dark';

export interface ThemeSettings {
  temaPreferido: ThemePreference;
  seguirSistema: boolean;
}

export interface UserProfile {
  userId: string;
  nome: string;
  email: string;
  telefoneHash: string;
  idiomaPreferido: Locale;
  tema: ThemeSettings;
  status: 'ativo' | 'inativo';
  role: 'admin' | 'user';
  dependentes: DependentProfile[];
  sincronizacao: SyncSettings;
}

export interface DependentProfile {
  dependentId: string;
  nome: string;
  telefoneAcesso: string;
  idiomaPreferido?: Locale;
  temaPreferido?: ThemePreference;
}

export interface SyncSettings {
  habilitado: boolean;
  destinos: SyncDestination[];
}

export type SyncDestination = 'google-drive' | 'one-drive';

export interface DeviceContext extends Record<string, unknown> {
  localeDetectado: string;
  dispositivo: string;
  data: string;
}

export interface EventPayload extends Record<string, unknown> {
  event: string;
  timestamp: string;
  props?: Record<string, unknown>;
}

export interface MiniAppManifest {
  id: string;
  name: Record<Locale, string>;
  version: string;
  entry: string;
  icons: string[];
  routes: string[];
  capabilities: string[];
  summary?: Record<Locale, string>;
  categories?: string[];
  visibility?: 'admin' | 'public';
}

export interface MiniAppRegistry {
  miniapps: MiniAppManifest[];
  updatedAt: string;
  version: string;
}
