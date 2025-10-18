export type UserRole = 'master' | 'user';
export interface MasterUser extends Record<string, unknown> {
    id: string;
    username: string;
    passHash: string;
    createdAt: string;
    updatedAt: string;
    deviceId: string;
    role: UserRole;
}
//# sourceMappingURL=types.d.ts.map