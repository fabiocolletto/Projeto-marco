import type { MasterUser } from './types.js';
export declare function getMaster(): Promise<MasterUser | null>;
export declare function saveMaster(user: MasterUser): Promise<void>;
export declare function hasMaster(): Promise<boolean>;
//# sourceMappingURL=store.d.ts.map