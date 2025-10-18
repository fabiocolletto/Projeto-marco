import type { UserProfile } from '../core/types.js';
export interface ProfileStore {
    load(): Promise<UserProfile | undefined> | UserProfile | undefined;
    save(profile: UserProfile): Promise<void> | void;
    clear(): Promise<void> | void;
}
export declare class MemoryProfileStore implements ProfileStore {
    private profile;
    load(): UserProfile | undefined;
    save(profile: UserProfile): void;
    clear(): void;
}
export declare const createBrowserProfileStore: (key?: string, storage?: Storage) => ProfileStore;
export declare const createProfileStore: () => ProfileStore;
//# sourceMappingURL=profileStore.d.ts.map