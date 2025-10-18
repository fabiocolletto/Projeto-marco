import type { UserProfile } from '../core/types.js';

export interface ProfileStore {
  load(): Promise<UserProfile | undefined> | UserProfile | undefined;
  save(profile: UserProfile): Promise<void> | void;
  clear(): Promise<void> | void;
}

const DEFAULT_KEY = 'appbase.profile';

export class MemoryProfileStore implements ProfileStore {
  private profile: UserProfile | undefined;

  load(): UserProfile | undefined {
    return this.profile ? { ...this.profile } : undefined;
  }

  save(profile: UserProfile): void {
    this.profile = { ...profile };
  }

  clear(): void {
    this.profile = undefined;
  }
}

export const createBrowserProfileStore = (
  key: string = DEFAULT_KEY,
  storage: Storage = globalThis.localStorage,
): ProfileStore => {
  return {
    load(): UserProfile | undefined {
      const raw = storage?.getItem?.(key);
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as UserProfile;
      } catch (error) {
        console.warn('Falha ao ler perfil local, limpando…', error);
        storage.removeItem(key);
        return undefined;
      }
    },
    save(profile: UserProfile): void {
      storage?.setItem?.(key, JSON.stringify(profile));
    },
    clear(): void {
      storage?.removeItem?.(key);
    },
  };
};
