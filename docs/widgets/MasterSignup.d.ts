import type { MasterUser } from '../auth/types.js';
export interface MasterSignupOptions {
    master?: MasterUser | null;
    mode?: 'create' | 'edit';
    requirePasswordChange?: boolean;
    onCompleted?: (user: MasterUser) => void;
    deviceIdBadge?: string;
}
export declare const masterAuthClasses: {
    container: string;
    field: string;
    actions: string;
    helper: string;
    error: string;
    badge: string;
};
export declare const ensureMasterAuthStyles: () => void;
export declare function renderMasterSignup(container: HTMLElement, options?: MasterSignupOptions): void;
//# sourceMappingURL=MasterSignup.d.ts.map