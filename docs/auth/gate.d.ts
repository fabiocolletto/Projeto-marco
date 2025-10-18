import type { MasterUser } from './types.js';
export declare const rememberPostAuthHash: () => void;
export declare const consumePostAuthHash: () => string | null;
export interface GateResult {
    allowed: boolean;
    master: MasterUser | null;
}
export declare const ensureMasterGate: () => Promise<GateResult>;
//# sourceMappingURL=gate.d.ts.map