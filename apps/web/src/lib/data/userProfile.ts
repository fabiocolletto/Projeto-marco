import { browser } from '$app/environment';
import { get, writable, type Readable } from 'svelte/store';
import defaults from './user-profile.default.json';

type JsonLike = Record<string, unknown>;

export interface UserProfileData {
  nomeCompleto: string;
  telefone: string;
  email: string;
  cep: string;
}

export interface UserProfileState {
  profile: UserProfileData;
  signedIn: boolean;
  lastLoginAt: number | null;
}

export interface UserProfileStore extends Readable<UserProfileState> {
  login(): UserProfileState;
  logout(): UserProfileState;
  updateProfile(partial: Partial<UserProfileData>): UserProfileState;
  reset(): UserProfileState;
  current(): UserProfileState;
  defaults(): UserProfileState;
}

const STORAGE_KEY = 'app-base:user-profile';

const cloneProfile = (profile: UserProfileData): UserProfileData => ({
  nomeCompleto: profile.nomeCompleto ?? '',
  telefone: profile.telefone ?? '',
  email: profile.email ?? '',
  cep: profile.cep ?? '',
});

const normalizeState = (value: unknown): UserProfileState => {
  const input = (typeof value === 'object' && value !== null ? value : defaults) as JsonLike;
  const profile = (typeof input.profile === 'object' && input.profile !== null
    ? (input.profile as JsonLike)
    : defaults.profile) as JsonLike;

  const normalized: UserProfileState = {
    profile: cloneProfile({
      nomeCompleto: String(profile.nomeCompleto ?? defaults.profile.nomeCompleto ?? ''),
      telefone: String(profile.telefone ?? defaults.profile.telefone ?? ''),
      email: String(profile.email ?? defaults.profile.email ?? ''),
      cep: String(profile.cep ?? defaults.profile.cep ?? ''),
    }),
    signedIn: Boolean(input.signedIn ?? defaults.signedIn ?? false),
    lastLoginAt:
      typeof input.lastLoginAt === 'number' && Number.isFinite(input.lastLoginAt)
        ? (input.lastLoginAt as number)
        : defaults.lastLoginAt ?? null,
  };

  return normalized;
};

const cloneState = (state: UserProfileState): UserProfileState => ({
  profile: cloneProfile(state.profile),
  signedIn: state.signedIn,
  lastLoginAt: state.lastLoginAt ?? null,
});

const DEFAULT_STATE = cloneState(normalizeState(defaults));

const loadFromStorage = (): UserProfileState => {
  if (!browser) {
    return cloneState(DEFAULT_STATE);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneState(DEFAULT_STATE);
    }
    const parsed = JSON.parse(raw);
    return cloneState(normalizeState(parsed));
  } catch (error) {
    console.warn('[userProfile] Falha ao carregar dados do usuário do storage', error);
    return cloneState(DEFAULT_STATE);
  }
};

const persist = (state: UserProfileState) => {
  if (!browser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[userProfile] Falha ao persistir dados do usuário', error);
  }
};

const emit = (type: string, detail: UserProfileState) => {
  if (!browser) return;
  window.dispatchEvent(
    new CustomEvent(`app-base:user-profile:${type}`, {
      detail,
    }),
  );
};

const createUserProfileStore = (): UserProfileStore => {
  const store = writable<UserProfileState>(loadFromStorage());
  const { subscribe, set, update } = store;

  if (browser) {
    subscribe((state) => {
      persist(state);
    });
  }

  return {
    subscribe,
    login() {
      let next: UserProfileState;
      update((state) => {
        next = { ...state, signedIn: true, lastLoginAt: Date.now() };
        return next;
      });
      if (!next) {
        next = get(store);
      }
      const snapshot = cloneState(next);
      emit('login', snapshot);
      return snapshot;
    },
    logout() {
      let next: UserProfileState;
      update((state) => {
        next = { ...state, signedIn: false };
        return next;
      });
      if (!next) {
        next = get(store);
      }
      const snapshot = cloneState(next);
      emit('logout', snapshot);
      return snapshot;
    },
    updateProfile(partial) {
      let next: UserProfileState;
      update((state) => {
        next = {
          ...state,
          profile: {
            ...state.profile,
            ...partial,
          },
        };
        return next;
      });
      if (!next) {
        next = get(store);
      }
      const snapshot = cloneState(next);
      emit('update', snapshot);
      return snapshot;
    },
    reset() {
      const base = cloneState(DEFAULT_STATE);
      set(base);
      emit('reset', cloneState(base));
      return cloneState(base);
    },
    current() {
      return cloneState(get(store));
    },
    defaults() {
      return cloneState(DEFAULT_STATE);
    },
  };
};

export const userProfile = createUserProfileStore();
