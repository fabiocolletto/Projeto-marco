import type { MasterUser } from '../auth/types.js';
export interface MasterLoginOptions {
    master?: MasterUser | null;
    onAuthenticated?: (user: MasterUser) => void;
}
export declare function renderMasterLogin(container: HTMLElement, options?: MasterLoginOptions): Promise<void>;
//# sourceMappingURL=MasterLogin.d.ts.map